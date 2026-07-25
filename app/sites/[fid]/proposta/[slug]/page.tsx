// PÁGINA PÚBLICA DA PROPOSTA — /proposta/{slug} no host do fotógrafo.
// Renderiza os blocos de apresentação cadastrados na proposta + as opções como
// blocos "pacote" (gerados do cadastro, nunca digitados de novo) + adicionais.
// Material comercial → SEMPRE noindex (regra-mãe de SEO, igual às landings).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { contextoBlocos } from "@/lib/site/publico";
import { ogPagina } from "@/lib/site/seo";
import { formatBRL } from "@/lib/utils/format";
import { RenderBlocos } from "../../_components/RenderBlocos";
import type { SiteBloco } from "@/lib/site/blocos";
import type { CrmProposta, CrmPropostaOpcao } from "@/lib/supabase/types";

async function buscarProposta(fid: string, slug: string): Promise<{ proposta: CrmProposta; opcoes: CrmPropostaOpcao[] } | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("crm_propostas").select("*")
    .eq("fotografo_id", fid).eq("slug", slug).eq("publicado", true).eq("ativo", true).maybeSingle();
  if (!data) return null;
  const { data: opcoes } = await admin.from("crm_proposta_opcoes").select("*")
    .eq("proposta_id", (data as CrmProposta).id).order("ordem");
  return { proposta: data as CrmProposta, opcoes: (opcoes ?? []) as CrmPropostaOpcao[] };
}

export async function generateMetadata({ params }: { params: Promise<{ fid: string; slug: string }> }): Promise<Metadata> {
  const { fid, slug } = await params;
  const r = await buscarProposta(fid, slug);
  if (!r) return {};
  const descricao = (r.proposta.descricao_html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200) || undefined;
  return {
    title: r.proposta.titulo,
    description: descricao,
    robots: { index: false, follow: true }, // proposta comercial nunca indexa
    openGraph: await ogPagina({ title: r.proposta.titulo, description: descricao, image: r.proposta.imagem_url }),
  };
}

export default async function PropostaPublicaPage({ params }: { params: Promise<{ fid: string; slug: string }> }) {
  const { fid, slug } = await params;
  const r = await buscarProposta(fid, slug);
  if (!r) notFound();
  const { proposta, opcoes } = r;

  const pacotes = opcoes.filter((o) => o.tipo === "pacote");
  const adicionais = opcoes.filter((o) => o.tipo === "adicional");

  // Blocos de apresentação + opções do cadastro (pacotes alternando o lado da imagem)
  const blocos: SiteBloco[] = [
    ...(Array.isArray(proposta.blocos) ? (proposta.blocos as SiteBloco[]) : []),
    ...(pacotes.length > 0
      ? pacotes.map((o, i): SiteBloco => ({
          id: `opcao-${o.id}`,
          tipo: "pacote",
          dados: {
            nome: o.nome,
            itens: o.itens,
            valor: o.valor != null ? formatBRL(o.valor) : null,
            imagem_url: o.imagem_url,
            invertido: i % 2 === 1,
          },
        }))
      : []),
    ...(adicionais.length > 0
      ? [{
          id: "adicionais",
          tipo: "texto" as const,
          dados: {
            html: `<h3 style="text-align:center">Adicionais</h3><ul>` + adicionais.map((o) =>
              `<li>${o.nome}${o.valor != null ? ` — <strong>${formatBRL(o.valor)}</strong>` : ""}</li>`).join("") + "</ul>",
          },
        }]
      : []),
    ...(proposta.validade_dias != null
      ? [{
          id: "validade",
          tipo: "texto" as const,
          dados: { html: `<p style="text-align:center;font-size:13px">Proposta válida por ${proposta.validade_dias} dias.</p>` },
        }]
      : []),
  ];

  const ctx = await contextoBlocos(fid);

  return (
    <>
      {/* Como nas landings: a proposta tem hero/apresentação próprios — sem o header do site */}
      <style>{`.site-header{display:none!important}`}</style>
      <RenderBlocos blocos={blocos} ctx={ctx} />
    </>
  );
}
