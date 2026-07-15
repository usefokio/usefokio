// Rota dinâmica de 1 nível no host do fotógrafo (/{slug}) — as rotas estáticas
// (portfolio, blog, sobre, contato…) têm precedência. Resolve, nesta ordem:
// 1) LANDING PAGE (site_landing_pages) — motor de blocos, noindex (campanha/orçamento);
// 2) PÁGINA CUSTOM (site_paginas) — motor de blocos, INDEXÁVEL (página institucional).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { baseLinks, infoCategorias, categoriasParaNav, nomeCategoria, contextoBlocos } from "@/lib/site/publico";
import { dadosParaBlocos, conteudoParaBlocos, type SiteBloco } from "@/lib/site/blocos";
import { resolverMetaPagina } from "@/lib/site/seo";
import { RenderBlocos } from "../_components/RenderBlocos";
import type { SiteLandingPage, SiteLandingDados, SiteDepoimento, SitePagina } from "@/lib/supabase/types";

async function buscarLanding(fid: string, slug: string): Promise<SiteLandingPage | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("site_landing_pages").select("*")
    .eq("fotografo_id", fid).eq("slug", slug).eq("publicado", true).maybeSingle();
  return (data as SiteLandingPage) ?? null;
}

async function buscarPaginaCustom(fid: string, slug: string): Promise<SitePagina | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("site_paginas").select("*")
    .eq("fotografo_id", fid).eq("slug", slug).eq("publicado", true).maybeSingle();
  return (data as SitePagina) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ fid: string; slug: string }> }): Promise<Metadata> {
  const { fid, slug } = await params;
  const lp = await buscarLanding(fid, slug);
  if (lp) {
    // Landing tem finalidade específica (campanha/orçamento) → noindex por padrão (sobrepõe o robots do layout).
    return {
      title: lp.seo_title ?? lp.titulo,
      description: lp.seo_description ?? undefined,
      robots: { index: false, follow: true },
    };
  }
  const pg = await buscarPaginaCustom(fid, slug);
  if (!pg) return {};
  // Página custom é institucional → INDEXÁVEL (não herda o noindex das landings).
  const c = (pg.conteudo ?? {}) as { html?: string | null; imagens?: string[] };
  const excerpt = (c.html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200) || null;
  const m = resolverMetaPagina(pg, { titulo: pg.titulo, descricao: excerpt, imagem: c.imagens?.[0] ?? null });
  return {
    title: m.title,
    description: m.description,
    keywords: m.keywords,
    ...(m.noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title: m.ogTitle, description: m.ogDescription, images: m.ogImage ? [m.ogImage] : undefined },
  };
}

export default async function LandingPage({ params }: { params: Promise<{ fid: string; slug: string }> }) {
  const { fid, slug } = await params;
  const lp = await buscarLanding(fid, slug);
  if (!lp) {
    // Página custom (site_paginas): renderiza por blocos COM o header do site
    // (é página institucional, não landing). Sem blocos salvos, converte o conteúdo legado.
    const pg = await buscarPaginaCustom(fid, slug);
    if (!pg) notFound();
    const blocos = Array.isArray(pg.blocos) && pg.blocos.length > 0
      ? (pg.blocos as SiteBloco[])
      : conteudoParaBlocos(pg.conteudo);
    const ctx = await contextoBlocos(fid);
    return (
      <div style={{ padding: "40px 0" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, textAlign: "center", margin: "0 0 32px", padding: "0 24px" }}>{pg.titulo}</h1>
        <RenderBlocos blocos={blocos} ctx={ctx} />
      </div>
    );
  }

  const admin = createAdminClient();
  const [{ data: fotografo }, { data: depoimentos }, { data: trabalhos }, info] = await Promise.all([
    admin.from("fotografos").select("whatsapp").eq("id", fid).maybeSingle(),
    admin.from("site_depoimentos").select("*").eq("fotografo_id", fid).eq("publicado", true).order("ordem").limit(4),
    admin.from("site_trabalhos").select("categoria").eq("fotografo_id", fid).eq("publicado", true),
    infoCategorias(fid),
  ]);
  const b = await baseLinks(fid);
  const d = (lp.dados ?? {}) as SiteLandingDados;

  // "Tipo do evento" do bloco formulário = categorias distintas dos trabalhos publicados
  // (nome/ordem/visibilidade da conta).
  const categorias = categoriasParaNav([...new Set(((trabalhos ?? []) as { categoria: string }[]).map((t) => t.categoria))], info, null)
    .map((c) => ({ valor: c, label: nomeCategoria(c, info.map) }));

  // Motor de blocos: usa a lista salva; landings do formato antigo são convertidas na hora.
  const blocos = d.blocos && d.blocos.length > 0 ? d.blocos : dadosParaBlocos(d);

  return (
    <>
      {/* Landing não leva o header/menu do site (tem hero/logo próprios). <style> inline (fora do
          pipeline do Tailwind/Lightning CSS) garante o efeito em dev e prod, sem refatorar rotas. */}
      <style>{`.site-header{display:none!important}`}</style>
      <RenderBlocos
        blocos={blocos}
        ctx={{
          base: b,
          fid,
          depoimentos: (depoimentos ?? []) as SiteDepoimento[],
          whatsappFallback: fotografo?.whatsapp ?? null,
          categorias,
        }}
      />
    </>
  );
}
