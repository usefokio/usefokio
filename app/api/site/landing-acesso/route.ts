import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimitOk, clientIp } from "@/lib/rate-limit";
import { getResend, FROM_DEFAULT } from "@/lib/email/resend";
import { escapeHtml } from "@/lib/email/comunicacao";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// Registra quem pediu acesso a uma landing com identificação e:
//  • modo 'pagina'  → seta o cookie que revela a página (comportamento original);
//  • modo 'valores' → NÃO revela nada na tela: envia a PROPOSTA EM PDF (com os valores) para o
//    e-mail informado — é isso que garante um e-mail válido — e avisa o fotógrafo na hora.
export async function POST(request: NextRequest) {
  if (!(await rateLimitOk(`landing-acesso:${clientIp(request)}`, 10, 60))) {
    return NextResponse.json({ erro: "Muitas tentativas. Aguarde um instante." }, { status: 429 });
  }

  const { landing_id, nome, email, telefone } = await request.json().catch(() => ({}));
  if (!landing_id || !String(nome ?? "").trim()) {
    return NextResponse.json({ erro: "Informe ao menos o seu nome." }, { status: 400 });
  }

  const supabase = createAdminClient();
  // Só registra acesso de uma landing que realmente existe e tem algum gate ligado.
  const { data: lp } = await supabase.from("site_landing_pages")
    .select("id, titulo, slug, fotografo_id, identificacao_modo, identificacao_obrigatoria, pdf_url")
    .eq("id", landing_id).maybeSingle();
  const modo = lp?.identificacao_modo ?? (lp?.identificacao_obrigatoria ? "pagina" : "nenhum");
  if (!lp || modo === "nenhum") {
    return NextResponse.json({ erro: "Proposta não encontrada." }, { status: 404 });
  }

  const nomeLimpo = String(nome).trim().slice(0, 120);
  const emailLimpo = email ? String(email).trim().slice(0, 160) : "";
  const telLimpo = telefone ? String(telefone).trim().slice(0, 40) : "";

  // No modo "valores" o e-mail é o canal de entrega da proposta — obrigatório e válido.
  if (modo === "valores" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
    return NextResponse.json({ erro: "Informe um e-mail válido para receber a proposta." }, { status: 400 });
  }

  const { error } = await supabase.from("site_landing_acessos").insert({
    landing_id,
    nome: nomeLimpo,
    email: emailLimpo || null,
    telefone: telLimpo || null,
  });
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  // ── Modo "valores": manda a proposta em PDF por e-mail (nada é revelado na tela) ──────────
  if (modo === "valores") {
    let enviado = false;
    let motivo = "";
    const { data: fotAviso } = await supabase.from("fotografos")
      .select("email").eq("id", lp.fotografo_id).maybeSingle();

    // Sem PDF anexado à landing não há o que enviar: registra o lead, avisa o fotógrafo com
    // destaque e devolve uma resposta honesta ao visitante (o fotógrafo envia manualmente).
    if (!lp.pdf_url) {
      console.error("[landing-acesso] landing sem PDF anexado:", lp.id);
      if (fotAviso?.email) {
        await getResend().emails.send({
          from: FROM_DEFAULT, to: fotAviso.email,
          subject: `⚠ Pediram os valores e a página está SEM PDF — ${lp.titulo}`,
          html: `<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;line-height:1.6">
            <p><strong>${escapeHtml(nomeLimpo)}</strong> pediu os valores de <strong>${escapeHtml(lp.titulo)}</strong>,
            mas essa landing ainda <strong>não tem a proposta em PDF anexada</strong> — nada foi enviado automaticamente.</p>
            <p>E-mail: ${escapeHtml(emailLimpo)}${telLimpo ? ` · WhatsApp: ${escapeHtml(telLimpo)}` : ""}</p>
            <p>Gere e anexe o PDF no editor da página e envie a proposta a essa pessoa.</p>
          </div>`,
          replyTo: emailLimpo,
        }).catch((e) => console.error("[landing-acesso] aviso sem-PDF falhou:", e));
      }
      return NextResponse.json({ ok: true, enviado: false, pendente: true, email: emailLimpo });
    }

    // DEV sem chave de e-mail: não dá para enviar de verdade. Simula o envio para dar
    // para testar o fluxo inteiro localmente (mesma convenção dos outros bypasses de dev).
    if (process.env.NODE_ENV === "development" && !process.env.RESEND_API_KEY) {
      console.log(`[landing-acesso] DEV sem RESEND_API_KEY — e-mail NÃO enviado (simulado). Para: ${emailLimpo} · PDF: ${lp.pdf_url}`);
      return NextResponse.json({ ok: true, enviado: true, simulado: true, email: emailLimpo });
    }

    try {
      const pdfUrl = lp.pdf_url;
      const nomeArquivo = `proposta-${(lp.slug || "proposta").slice(0, 40)}.pdf`;

      const arq = await fetch(pdfUrl, { cache: "no-store" });
      if (!arq.ok) throw new Error(`falha ao baixar o PDF (HTTP ${arq.status})`);
      const conteudo = Buffer.from(await arq.arrayBuffer());

      const { data: fot } = await supabase.from("fotografos")
        .select("nome_empresa, email, whatsapp").eq("id", lp.fotografo_id).maybeSingle();
      const empresa = fot?.nome_empresa ?? "";
      const primeiro = nomeLimpo.split(/\s+/)[0] ?? "";

      const html = `
        <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;font-size:15px;color:#222;line-height:1.6">
          <p>Olá ${escapeHtml(primeiro)}, tudo bem?</p>
          <p>Segue em anexo a proposta <strong>${escapeHtml(lp.titulo)}</strong> com todos os valores.</p>
          <p>Qualquer dúvida é só responder este e-mail${fot?.whatsapp ? " ou chamar no WhatsApp" : ""} — será um prazer atender você.</p>
          <p style="margin-top:22px">${escapeHtml(empresa)}</p>
        </div>`;

      await getResend().emails.send({
        from: FROM_DEFAULT,
        to: emailLimpo,
        subject: `Sua proposta — ${lp.titulo}`,
        html,
        ...(fot?.email ? { replyTo: fot.email } : {}),
        attachments: [{ filename: nomeArquivo, content: conteudo }],
      });
      enviado = true;

      // Aviso ao fotógrafo (não bloqueia o visitante se falhar).
      if (fot?.email) {
        const aviso = `
          <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;font-size:15px;color:#222;line-height:1.6">
            <h2 style="font-size:17px;margin:0 0 12px">Pediram os valores da sua proposta</h2>
            <p><strong>Página:</strong> ${escapeHtml(lp.titulo)}</p>
            <p><strong>Nome:</strong> ${escapeHtml(nomeLimpo)}</p>
            <p><strong>E-mail:</strong> ${escapeHtml(emailLimpo)}</p>
            ${telLimpo ? `<p><strong>WhatsApp:</strong> ${escapeHtml(telLimpo)}</p>` : ""}
            <hr/><p style="color:#888;font-size:12px">A proposta em PDF já foi enviada automaticamente para essa pessoa.</p>
          </div>`;
        await getResend().emails.send({
          from: FROM_DEFAULT, to: fot.email,
          subject: `Pedido de valores — ${lp.titulo}`,
          html: aviso, replyTo: emailLimpo,
        }).catch((e) => console.error("[landing-acesso] aviso ao fotógrafo falhou:", e));
      }
    } catch (e) {
      // O lead já está gravado; devolve o erro para a tela pedir para tentar de novo.
      motivo = e instanceof Error ? e.message : String(e);
      console.error("[landing-acesso] envio da proposta falhou:", motivo);
    }

    // Sem cookie: os valores continuam mascarados na página.
    // `motivo` só vai para o painel/log — a tela do visitante mostra mensagem genérica.
    return NextResponse.json({ ok: true, enviado, email: emailLimpo, ...(motivo ? { motivo } : {}) });
  }

  // ── Modo "pagina": libera o conteúdo como antes ───────────────────────────────────────────
  const res = NextResponse.json({ ok: true });
  res.cookies.set(`lpid_${landing_id}`, "1", {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
