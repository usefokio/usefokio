// Página de contato — 3 MODELOS fixos configurados na Aparência (padrão da home):
// duas colunas / banner de fundo / minimalista (lib/site/paginaCfg.ts). O H1 e os canais
// (WhatsApp/telefone/e-mail/Instagram, derivados do cadastro) são a moldura fixa da página.
// O mesmo componente PaginaContato renderiza aqui e na prévia ao vivo do editor.
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { carregarSite, infoCategorias, categoriasParaNav, nomeCategoria } from "@/lib/site/publico";
import { cfgContatoDe } from "@/lib/site/paginaCfg";
import { resolverMetaPagina, type CfgSeoOg } from "@/lib/site/seo";
import { PaginaContato, type CanalContato } from "../_components/PaginaContato";
import type { SitePagina } from "@/lib/supabase/types";

export async function generateMetadata({ params }: { params: Promise<{ fid: string }> }): Promise<Metadata> {
  const { fid } = await params;
  const admin = createAdminClient();
  const { data } = await admin.from("site_paginas")
    .select("titulo, conteudo, seo_title, seo_description, seo_keywords, seo_noindex, og_title, og_description, og_image_url")
    .eq("fotografo_id", fid).eq("slug", "contato").maybeSingle();
  const p = data as (CfgSeoOg & { titulo?: string | null; conteudo?: unknown }) | null;
  const img = (() => { const c = (p?.conteudo ?? {}) as { imagens?: string[] }; return Array.isArray(c.imagens) ? c.imagens[0] : null; })();
  const m = resolverMetaPagina(p, {
    titulo: p?.titulo || "Solicite seu orçamento",
    descricao: "Conte sobre o seu evento — data, cidade e o que planeja — e solicite um orçamento.",
    imagem: img,
  });
  return {
    title: m.title,
    description: m.description,
    keywords: m.keywords,
    ...(m.noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title: m.ogTitle, description: m.ogDescription, images: m.ogImage ? [m.ogImage] : undefined },
  };
}

export default async function ContatoPage({ params }: { params: Promise<{ fid: string }> }) {
  const { fid } = await params;
  const admin = createAdminClient();
  const [{ data: pagina }, { data: trabalhos }, site, info] = await Promise.all([
    admin.from("site_paginas").select("*").eq("fotografo_id", fid).eq("slug", "contato").maybeSingle(),
    admin.from("site_trabalhos").select("categoria").eq("fotografo_id", fid).eq("publicado", true),
    carregarSite(fid),
    infoCategorias(fid),
  ]);

  const p = pagina as SitePagina | null;
  const cfg = cfgContatoDe(p?.conteudo);
  const titulo = p?.titulo || "Solicite seu orçamento";

  // "Tipo do evento" = categorias distintas dos trabalhos publicados do fotógrafo
  // (nome/ordem/visibilidade da conta; oculta sai da lista do formulário também).
  const cats = categoriasParaNav([...new Set(((trabalhos ?? []) as { categoria: string }[]).map((t) => t.categoria))], info, null);
  const categorias = cats.map((c) => ({ valor: c, label: nomeCategoria(c, info.map) }));

  const fot = site.fotografo as { email: string | null; telefone: string | null; whatsapp: string | null } | null;
  const redes = ((site.config as { redes?: { instagram?: string; facebook?: string; youtube?: string } } | null)?.redes) ?? {};
  const whats = fot?.whatsapp ? fot.whatsapp.replace(/\D/g, "") : "";

  const canais = [
    whats && { icon: "💬", label: "WhatsApp", href: `https://wa.me/${whats}`, texto: fot?.whatsapp ?? "" },
    fot?.telefone && !whats && { icon: "📞", label: "Telefone", href: `tel:${fot.telefone}`, texto: fot.telefone },
    fot?.email && { icon: "✉️", label: "E-mail", href: `mailto:${fot.email}`, texto: fot.email },
    redes.instagram && { icon: "📷", label: "Instagram", href: redes.instagram.startsWith("http") ? redes.instagram : `https://instagram.com/${redes.instagram.replace(/^@/, "")}`, texto: redes.instagram },
  ].filter(Boolean) as CanalContato[];

  return <PaginaContato cfg={cfg} titulo={titulo} canais={canais} fid={fid} categorias={categorias} />;
}
