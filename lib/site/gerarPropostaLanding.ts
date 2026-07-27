// Gera a proposta em PDF de uma landing, sobe pro storage e vincula à página.
// Fica em lib (não na rota) porque é usada por duas rotas: a do botão "Gerar PDF" (painel) e a
// pública, que gera na hora quando a landing ainda não tem PDF.
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadFile } from "@/lib/storage/upload";
import { deleteFile } from "@/lib/storage/delete";
import { gerarPropostaPdf, hashConteudo } from "@/lib/site/propostaPdf";
import { dadosParaBlocos, type SiteBloco } from "@/lib/site/blocos";
import type { SiteLandingDados } from "@/lib/supabase/types";

export async function gerarEVincularPdf(landingId: string): Promise<{ url: string; nome: string } | null> {
  const admin = createAdminClient();
  const { data: lp } = await admin.from("site_landing_pages")
    .select("id, fotografo_id, titulo, dados, pdf_path, pdf_url")
    .eq("id", landingId).maybeSingle();
  if (!lp) return null;

  const { data: fot } = await admin.from("fotografos")
    .select("nome_empresa, logo_url, whatsapp, telefone, email, site")
    .eq("id", lp.fotografo_id).maybeSingle();

  const d = (lp.dados ?? {}) as SiteLandingDados;
  const blocos: SiteBloco[] = d.blocos && d.blocos.length > 0 ? d.blocos : dadosParaBlocos(d);

  const buffer = await gerarPropostaPdf({ titulo: lp.titulo, blocos, fotografo: fot ?? {} });
  const base = (lp.titulo || "proposta").toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 40);
  const nomeArquivo = `proposta-${base || "proposta"}.pdf`;
  const path = `propostas-landing/${lp.fotografo_id}/${lp.id}/${crypto.randomUUID()}.pdf`;

  const { storage_path, url_publica } = await uploadFile(
    path,
    new Blob([new Uint8Array(buffer)], { type: "application/pdf" }),
    "application/pdf",
  );

  await admin.from("site_landing_pages").update({
    pdf_url: url_publica,
    pdf_path: storage_path,
    pdf_gerado_em: new Date().toISOString(),
    pdf_hash: hashConteudo(lp.titulo, blocos),
  }).eq("id", lp.id);

  // Remove o arquivo antigo (não bloqueia se falhar).
  if (lp.pdf_path && lp.pdf_path !== storage_path) {
    try { await deleteFile(lp.pdf_path, lp.pdf_url); } catch { /* já sumiu */ }
  }

  return { url: url_publica, nome: nomeArquivo };
}
