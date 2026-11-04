// E-mail do fotógrafo para o cliente (manual pelo modal e automático pelo funil): HTML com a assinatura
// e remetente com o nome do estúdio. Sai pelo domínio do sistema (noreply), com "responder para" = fotógrafo.
import { FROM_DEFAULT } from "@/lib/email/resend";

type FotografoEmail = { nome_empresa?: string | null; nome_completo?: string | null; email?: string | null; site?: string | null };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function htmlEmailCliente(f: FotografoEmail | null, body: string): string {
  const nome = f?.nome_empresa ?? f?.nome_completo ?? null;
  const assiLinhas = [
    nome ? `<strong style="color:#333">${esc(nome)}</strong>` : null,
    f?.email ? `<a href="mailto:${esc(f.email)}" style="color:#555;text-decoration:none">${esc(f.email)}</a>` : null,
    f?.site ? `<a href="${esc(f.site)}" style="color:#2563EB;text-decoration:none">${esc(f.site.replace(/^https?:\/\//, ""))}</a>` : null,
  ].filter(Boolean);
  const assiHtml = assiLinhas.length
    ? `<hr style="margin:24px 0;border:none;border-top:1px solid #eee"><div style="font-family:sans-serif;font-size:13px;line-height:2;color:#666">${assiLinhas.join("<br>")}</div>`
    : "";
  const corpo = esc(String(body)).replace(/\n/g, "<br>");
  return `<div style="font-family:sans-serif;font-size:15px;line-height:1.7;color:#222;max-width:600px">${corpo}</div>${assiHtml}`;
}

/** "Nome do Estúdio <noreply@usefokio.com.br>" — mantém o endereço do sistema e troca só o nome exibido. */
export function remetenteCliente(f: FotografoEmail | null): string {
  const endereco = FROM_DEFAULT.match(/<([^>]+)>/)?.[1] ?? FROM_DEFAULT;
  const nome = (f?.nome_empresa ?? f?.nome_completo ?? "").replace(/["<>\r\n,;]/g, "").trim();
  return nome ? `${nome} <${endereco}>` : FROM_DEFAULT;
}
