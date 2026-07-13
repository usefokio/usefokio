// Página de contato: canais do fotógrafo + texto editável + formulário de orçamento personalizável.
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { carregarSite, infoCategorias, categoriasParaNav, nomeCategoria } from "@/lib/site/publico";
import { normalizarConfig } from "@/lib/site/formulario";
import { resolverMetaPagina, type CfgSeoOg } from "@/lib/site/seo";
import { ContatoForm } from "../_components/ContatoForm";
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
  const conteudo = (p?.conteudo ?? {}) as { html?: string | null; imagens?: string[]; formulario?: unknown };
  const cfg = normalizarConfig(conteudo.formulario);
  const titulo = p?.titulo || "Solicite seu orçamento";
  const imagem = Array.isArray(conteudo.imagens) ? conteudo.imagens[0] : undefined;

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
  ].filter(Boolean) as { icon: string; label: string; href: string; texto: string }[];

  const cabecalho = (
    <>
      <h1 style={{ fontFamily: "var(--site-fonte-titulo), Georgia, serif", fontSize: 32, color: "var(--site-titulo)", margin: "0 0 14px", lineHeight: 1.15 }}>{titulo}</h1>
      {conteudo.html ? (
        <div className="site-conteudo" style={{ fontSize: 15, color: "var(--site-suave)", lineHeight: 1.8, margin: "0 0 20px" }} dangerouslySetInnerHTML={{ __html: conteudo.html }} />
      ) : (
        <p style={{ fontSize: 15, color: "var(--site-suave)", lineHeight: 1.8, margin: "0 0 20px" }}>
          Conte um pouco sobre o seu evento — data, cidade e o que você está planejando. Retorno o mais rápido possível!
        </p>
      )}
      {canais.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 22px", marginBottom: 22 }}>
          {canais.map((c) => (
            <a key={c.label} href={c.href} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 7, textDecoration: "none", color: "var(--site-texto)", fontSize: 14 }}>
              <span style={{ fontSize: 16 }}>{c.icon}</span>{c.texto}
            </a>
          ))}
        </div>
      )}
    </>
  );

  const form = <ContatoForm fid={fid} config={cfg} categorias={categorias} />;

  // Com foto: 2 colunas (imagem + conteúdo/formulário). Sem foto: coluna única centralizada.
  if (imagem) {
    return (
      <div className="site-contato">
        <div className="site-contato-foto"><img src={imagem} alt="" /></div>
        <div>{cabecalho}{form}</div>
      </div>
    );
  }
  return (
    <div className="site-contato-solo">
      {cabecalho}
      {form}
    </div>
  );
}
