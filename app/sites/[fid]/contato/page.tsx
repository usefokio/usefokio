// Página de contato: canais do fotógrafo + texto editável + formulário de orçamento personalizável.
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { carregarSite, CATEGORIA_LABEL } from "@/lib/site/publico";
import { normalizarConfig } from "@/lib/site/formulario";
import { ContatoForm } from "../_components/ContatoForm";
import type { SitePagina } from "@/lib/supabase/types";

export async function generateMetadata({ params }: { params: Promise<{ fid: string }> }): Promise<Metadata> {
  const { fid } = await params;
  const admin = createAdminClient();
  const { data } = await admin.from("site_paginas").select("seo_title, seo_description").eq("fotografo_id", fid).eq("slug", "contato").maybeSingle();
  const p = data as { seo_title: string | null; seo_description: string | null } | null;
  return {
    title: p?.seo_title ?? "Solicite seu orçamento",
    description: p?.seo_description ?? "Conte sobre o seu evento — data, cidade e o que planeja — e solicite um orçamento.",
  };
}

export default async function ContatoPage({ params }: { params: Promise<{ fid: string }> }) {
  const { fid } = await params;
  const admin = createAdminClient();
  const [{ data: pagina }, { data: trabalhos }, site] = await Promise.all([
    admin.from("site_paginas").select("*").eq("fotografo_id", fid).eq("slug", "contato").maybeSingle(),
    admin.from("site_trabalhos").select("categoria").eq("fotografo_id", fid).eq("publicado", true),
    carregarSite(fid),
  ]);

  const p = pagina as SitePagina | null;
  const conteudo = (p?.conteudo ?? {}) as { html?: string | null; formulario?: unknown };
  const cfg = normalizarConfig(conteudo.formulario);
  const titulo = p?.titulo || "Solicite seu orçamento";

  // "Tipo do evento" = categorias distintas dos trabalhos publicados do fotógrafo.
  const cats = [...new Set(((trabalhos ?? []) as { categoria: string }[]).map((t) => t.categoria))];
  const categorias = cats.map((c) => ({ valor: c, label: CATEGORIA_LABEL[c] ?? c }));

  const fot = site.fotografo as { email: string | null; telefone: string | null; whatsapp: string | null } | null;
  const redes = ((site.config as { redes?: { instagram?: string; facebook?: string; youtube?: string } } | null)?.redes) ?? {};
  const whats = fot?.whatsapp ? fot.whatsapp.replace(/\D/g, "") : "";

  const canais = [
    whats && { icon: "💬", label: "WhatsApp", href: `https://wa.me/${whats}`, texto: fot?.whatsapp ?? "" },
    fot?.telefone && !whats && { icon: "📞", label: "Telefone", href: `tel:${fot.telefone}`, texto: fot.telefone },
    fot?.email && { icon: "✉️", label: "E-mail", href: `mailto:${fot.email}`, texto: fot.email },
    redes.instagram && { icon: "📷", label: "Instagram", href: redes.instagram.startsWith("http") ? redes.instagram : `https://instagram.com/${redes.instagram.replace(/^@/, "")}`, texto: redes.instagram },
  ].filter(Boolean) as { icon: string; label: string; href: string; texto: string }[];

  return (
    <div className="site-contato">
      <div>
        <h1 style={{ fontFamily: "var(--site-fonte-titulo), Georgia, serif", fontSize: 34, color: "var(--site-titulo)", margin: "0 0 16px", lineHeight: 1.15 }}>{titulo}</h1>
        {conteudo.html ? (
          <div className="site-conteudo" style={{ fontSize: 15, color: "var(--site-suave)", lineHeight: 1.8, margin: "0 0 24px" }} dangerouslySetInnerHTML={{ __html: conteudo.html }} />
        ) : (
          <p style={{ fontSize: 15, color: "var(--site-suave)", lineHeight: 1.8, margin: "0 0 24px" }}>
            Conte um pouco sobre o seu evento — data, cidade e o que você está planejando. Retorno o mais rápido possível!
          </p>
        )}
        {canais.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
            {canais.map((c) => (
              <a key={c.label} href={c.href} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "var(--site-texto)" }}>
                <span style={{ fontSize: 18 }}>{c.icon}</span>
                <span>
                  <span style={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--site-suave)" }}>{c.label}</span>
                  <span style={{ fontSize: 14 }}>{c.texto}</span>
                </span>
              </a>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: "var(--site-superficie)", borderRadius: 10, padding: "28px 24px", border: "1px solid var(--site-borda)" }}>
        <ContatoForm fid={fid} config={cfg} categorias={categorias} />
      </div>
    </div>
  );
}
