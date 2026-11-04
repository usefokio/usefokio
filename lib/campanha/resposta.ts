// Cliente confirma que já tem os arquivos salvos (pelo link da campanha ou pela tela da galeria vencida):
// grava a resposta, encerra o funil (para a régua: sem novos e-mails/tarefas) e avisa o fotógrafo por e-mail.
import type { createAdminClient } from "@/lib/supabase/admin";
import { getResend, FROM_DEFAULT, APP_URL } from "@/lib/email/resend";
import { templateRespostaCampanha } from "@/lib/email/templates";

type Admin = ReturnType<typeof createAdminClient>;

export async function confirmarTemArquivos(admin: Admin, galeriaId: string, nome?: string | null, email?: string | null) {
  const agora = new Date().toISOString();
  const { error } = await admin
    .from("respostas_campanha")
    .update({
      resposta:         "tem_arquivos",
      respondido_em:    agora,
      respondido_nome:  nome?.trim() || null,
      respondido_email: email?.trim() || null,
      estagio:          "encerrado",
    })
    .eq("galeria_id", galeriaId);
  if (error) throw new Error(error.message);

  const { data: galeria } = await admin
    .from("galerias_entrega")
    .select("titulo, clientes(nome, email), fotografos:fotografo_id(nome_completo, nome_empresa, email, site)")
    .eq("id", galeriaId)
    .maybeSingle() as { data: {
      titulo: string;
      clientes: { nome: string; email: string | null } | null;
      fotografos: { nome_completo: string; nome_empresa: string; email: string; site: string | null } | null;
    } | null };

  // Notificar fotógrafo (falha silenciosa — resposta já foi gravada)
  try {
    if (galeria?.fotografos?.email) {
      const respondidoEm = new Date(agora).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
      const { subject, html } = templateRespostaCampanha({
        fotografoNome:   galeria.fotografos.nome_empresa ?? galeria.fotografos.nome_completo,
        clienteNome:     galeria.clientes?.nome ?? (nome?.trim() || "Cliente"),
        galeriaTitulo:   galeria.titulo,
        resposta:        "tem_arquivos",
        respondidoEm,
        respondidoNome:  nome?.trim() || null,
        galeriaAdminUrl: `${APP_URL}/entrega/${galeriaId}`,
      });
      await getResend().emails.send({ from: FROM_DEFAULT, to: galeria.fotografos.email, subject, html });
      await admin.from("respostas_campanha").update({ notificado: true }).eq("galeria_id", galeriaId);
    }
  } catch (err) {
    console.error("[campanha/tem-arquivos] notificacao error:", err);
  }

  return agora;
}
