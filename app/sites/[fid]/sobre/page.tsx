// Página Sobre — 3 MODELOS fixos configurados na Aparência (padrão da home):
// foto+biografia / foto de fundo / minimalista (lib/site/paginaCfg.ts).
// O mesmo componente PaginaSobre renderiza aqui e na prévia ao vivo do editor.
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { baseLinks } from "@/lib/site/publico";
import { resolverMetaPagina, ogPagina } from "@/lib/site/seo";
import { cfgSobreDe } from "@/lib/site/paginaCfg";
import { PaginaSobre } from "../_components/PaginaSobre";
import type { SitePagina } from "@/lib/supabase/types";

async function buscarSobre(fid: string): Promise<SitePagina | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("site_paginas").select("*").eq("fotografo_id", fid).eq("slug", "sobre").maybeSingle();
  return (data as SitePagina) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ fid: string }> }): Promise<Metadata> {
  const { fid } = await params;
  const p = await buscarSobre(fid);
  if (!p) return { title: "Sobre" };
  const c = (p.conteudo ?? {}) as { html?: string | null; imagens?: string[] };
  const excerpt = (c.html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200) || null;
  const m = resolverMetaPagina(p, { titulo: p.titulo || "Sobre", descricao: excerpt, imagem: c.imagens?.[0] ?? null });
  return {
    title: m.title,
    description: m.description,
    keywords: m.keywords,
    ...(m.noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: await ogPagina({ title: m.ogTitle, description: m.ogDescription, image: m.ogImage }),
  };
}

export default async function SobrePage({ params }: { params: Promise<{ fid: string }> }) {
  const { fid } = await params;
  const [p, base] = await Promise.all([buscarSobre(fid), baseLinks(fid)]);
  return <PaginaSobre cfg={cfgSobreDe(p?.conteudo)} titulo={p?.titulo ?? "Sobre"} base={base} />;
}
