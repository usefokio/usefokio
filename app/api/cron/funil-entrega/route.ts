// Cron diário (09:00 BRT, GitHub Actions) do funil da galeria expirada:
//  1. galeria vencida/suspensa entra no funil (se "entrar no funil automaticamente" estiver ligado);
//  2. com "enviar e-mails automaticamente" ligado, manda o 1º e o 2º e-mail no dia configurado — só para
//     galerias que entraram no funil depois de ligar a opção.
// Não envia se o cliente já respondeu, se há pagamento pendente, se a régua está pausada ou se não há e-mail.
// WhatsApps e exclusão são manuais (bloco Tarefas). O sistema nunca apaga fotos nem mexe em links.
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { getResend, APP_URL } from "@/lib/email/resend";
import { htmlEmailCliente, remetenteCliente } from "@/lib/email/clienteHtml";
import { REGRAS_FUNIL_PADRAO, baseDaRegua, proximaEtapa, type RegrasFunil } from "@/lib/campanha/regua";
import { substituirVars, assinaturaTexto, CAMPANHA_EMAIL1_DEFAULT, CAMPANHA_EMAIL2_DEFAULT, ASSUNTO_EMAIL1, ASSUNTO_EMAIL2 } from "@/lib/campanha/textos";
import { registrarContato } from "@/lib/campanha/servidor";
import { enderecoRespostas } from "@/lib/campanha/respostasEmail";
import type { EstagioFunil } from "@/lib/supabase/types";

export const maxDuration = 300;

type Registro = {
  id: string; token: string; estagio: EstagioFunil; resposta: string | null; ignorar_funil: boolean; pausado_em: string | null;
  email_1_em: string | null; email_2_em: string | null; whatsapp_em: string | null; whatsapp_2_em: string | null; created_at: string;
};
type GaleriaCron = {
  id: string; fotografo_id: string; titulo: string; expires_at: string | null; suspensa: boolean | null;
  clientes: { nome: string | null; email: string | null } | null;
  respostas_campanha: Registro | Registro[] | null;
};
type FotografoCron = { id: string; nome_empresa: string | null; nome_completo: string | null; email: string | null; site: string | null; templates_mensagem: Record<string, string> | null };

const CAMPOS_REG = "id, token, estagio, resposta, ignorar_funil, pausado_em, email_1_em, email_2_em, whatsapp_em, whatsapp_2_em, created_at";
const LIMITE_ENVIOS = 60;
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const agora = new Date();
  const agoraIso = agora.toISOString();

  const galerias = await fetchAllRows<GaleriaCron>(
    (sb, from, to) => sb.from("galerias_entrega")
      .select(`id, fotografo_id, titulo, expires_at, suspensa, clientes(nome, email), respostas_campanha(${CAMPOS_REG})`)
      .eq("rascunho", false)
      .or(`suspensa.eq.true,expires_at.lt.${agoraIso}`)
      .range(from, to),
    admin,
  );
  if (!galerias.length) return Response.json({ ok: true, inscritas: 0, enviados: 0 });

  const fids = [...new Set(galerias.map((g) => g.fotografo_id))];
  const [{ data: regrasRows }, { data: fotosRows }] = await Promise.all([
    admin.from("entrega_regras").select("fotografo_id, funil_entrar_auto, funil_email_auto, funil_email_auto_desde, dias_email_1, dias_email_2, dias_whatsapp_1, dias_whatsapp_2, dias_exclusao").in("fotografo_id", fids),
    admin.from("fotografos").select("id, nome_empresa, nome_completo, email, site, templates_mensagem").in("id", fids),
  ]);
  const regrasPor = new Map<string, RegrasFunil>();
  for (const r of (regrasRows ?? []) as (RegrasFunil & { fotografo_id: string })[]) regrasPor.set(r.fotografo_id, r);
  const regrasDe = (fid: string) => regrasPor.get(fid) ?? REGRAS_FUNIL_PADRAO;
  const fotoPor = new Map(((fotosRows ?? []) as FotografoCron[]).map((f) => [f.id, f]));

  const registroDe = (g: GaleriaCron): Registro | null =>
    Array.isArray(g.respostas_campanha) ? (g.respostas_campanha[0] ?? null) : g.respostas_campanha;

  // 1. Entrada automática no funil
  const paraInscrever = galerias.filter((g) => !registroDe(g) && regrasDe(g.fotografo_id).funil_entrar_auto);
  let inscritas = 0;
  if (paraInscrever.length) {
    const { data: novos, error } = await admin.from("respostas_campanha")
      .upsert(paraInscrever.map((g) => ({ galeria_id: g.id, fotografo_id: g.fotografo_id })), { onConflict: "galeria_id", ignoreDuplicates: true })
      .select(`galeria_id, ${CAMPOS_REG}`);
    if (error) console.error("[cron/funil-entrega] inscrição:", error.message);
    for (const n of (novos ?? []) as (Registro & { galeria_id: string })[]) {
      const g = galerias.find((x) => x.id === n.galeria_id);
      if (g) { g.respostas_campanha = n; inscritas++; }
    }
  }

  // 2. E-mails automáticos
  const candidatos = galerias.filter((g) => {
    const reg = registroDe(g);
    const regras = regrasDe(g.fotografo_id);
    if (!reg || !regras.funil_email_auto || !regras.funil_email_auto_desde) return false;
    if (reg.ignorar_funil || reg.resposta || reg.pausado_em) return false;
    if (reg.estagio !== "nao_contatado" && reg.estagio !== "email_1") return false;
    if (new Date(reg.created_at).getTime() < new Date(regras.funil_email_auto_desde).getTime()) return false;
    return !!g.clientes?.email;
  });

  let pendentes = new Set<string>();
  if (candidatos.length) {
    const { data: pgts } = await admin.from("pagamentos").select("galeria_id")
      .in("galeria_id", candidatos.map((g) => g.id)).eq("tipo", "renovacao").eq("status", "pendente");
    pendentes = new Set(((pgts ?? []) as { galeria_id: string }[]).map((p) => p.galeria_id));
  }

  let enviados = 0;
  const erros: string[] = [];
  for (const g of candidatos) {
    if (enviados >= LIMITE_ENVIOS) break;
    if (pendentes.has(g.id)) continue;
    const reg = registroDe(g)!;
    const regras = regrasDe(g.fotografo_id);
    const prox = proximaEtapa(reg, baseDaRegua(g.expires_at, reg.created_at), true, regras);
    if (!prox || (prox.etapa !== "email_1" && prox.etapa !== "email_2") || prox.venceEm.getTime() > agora.getTime()) continue;

    // Reserva a etapa antes de enviar (evita envio duplicado se o cron rodar duas vezes)
    const campo = prox.etapa === "email_1" ? "email_1_em" : "email_2_em";
    const { data: reservado } = await admin.from("respostas_campanha")
      .update({ estagio: prox.etapa, [campo]: agoraIso })
      .eq("id", reg.id).eq("estagio", reg.estagio).is("resposta", null).is("pausado_em", null)
      .select("id");
    if (!reservado?.length) continue;

    const f = fotoPor.get(g.fotografo_id) ?? null;
    const tpls = f?.templates_mensagem ?? null;
    const texto = prox.etapa === "email_1"
      ? (tpls?.campanha_email1?.trim() || CAMPANHA_EMAIL1_DEFAULT)
      : (tpls?.campanha_email2?.trim() || CAMPANHA_EMAIL2_DEFAULT);
    const corpo = substituirVars(texto, {
      nomeCliente: g.clientes?.nome || "Cliente",
      titulo: g.titulo,
      link: `${APP_URL}/acesso/entrega/${g.id}`,
      respostaUrl: `${APP_URL}/campanha/resposta/${reg.token}`,
      diasRestantes: null,
      nomeEmpresa: f?.nome_empresa ?? f?.nome_completo ?? "",
      assinatura: assinaturaTexto(f),
      prazo: "",
    });
    const assunto = (prox.etapa === "email_1" ? ASSUNTO_EMAIL1 : ASSUNTO_EMAIL2).replace("{titulo}", g.titulo);

    // Resposta do cliente vai para o endereço da galeria (pausa a régua); sem ele, para o fotógrafo
    const replyTo = enderecoRespostas(reg.token, f?.nome_empresa ?? f?.nome_completo) ?? f?.email ?? null;

    try {
      const { data, error } = await getResend().emails.send({
        from: remetenteCliente(f),
        to: g.clientes!.email!,
        subject: assunto,
        html: htmlEmailCliente(f, corpo),
        ...(replyTo ? { replyTo } : {}),
      });
      if (error) throw new Error(error.message);
      enviados++;
      await registrarContato(admin, {
        fotografo_id: g.fotografo_id, galeria_id: g.id, etapa: prox.etapa, canal: "email", modo: "auto", resend_id: data?.id ?? null,
      });
    } catch (e) {
      // Devolve a etapa para tentar de novo no próximo dia
      await admin.from("respostas_campanha").update({ estagio: reg.estagio, [campo]: null }).eq("id", reg.id);
      erros.push(`${g.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
    await esperar(600);
  }

  if (erros.length) console.error("[cron/funil-entrega] falhas de envio:", erros);
  return Response.json({ ok: true, inscritas, enviados, erros: erros.length });
}
