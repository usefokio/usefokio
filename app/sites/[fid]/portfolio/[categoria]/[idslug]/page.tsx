// Página do TRABALHO (post do evento) — URL preservada: /portfolio/{categoria}/{legacyId}-{slug}.
// Resolve pelo legacy_id do começo do slug (o slug em si é cosmético — variações antigas continuam funcionando).
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { baseLinks, baseAbsoluta, infoCategorias, nomeCategoria, legacyDoSlug } from "@/lib/site/publico";
import { resolverMetaPagina, ogPagina } from "@/lib/site/seo";
import { youtubeEmbedUrl } from "@/lib/utils/youtube";
import { FotosTrabalho } from "../../../_components/FotosTrabalho";
import { JsonLd } from "../../../_components/JsonLd";
import type { SiteTrabalho, SiteTrabalhoFoto } from "@/lib/supabase/types";

async function buscarTrabalho(fid: string, idslug: string): Promise<SiteTrabalho | null> {
  const admin = createAdminClient();
  const legacy = legacyDoSlug(idslug);
  if (legacy) {
    const { data } = await admin.from("site_trabalhos").select("*").eq("fotografo_id", fid).eq("legacy_id", legacy).eq("publicado", true).maybeSingle();
    if (data) return data as SiteTrabalho;
  }
  const { data } = await admin.from("site_trabalhos").select("*").eq("fotografo_id", fid).eq("slug", idslug).eq("publicado", true).maybeSingle();
  return (data as SiteTrabalho) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ fid: string; categoria: string; idslug: string }> }): Promise<Metadata> {
  const { fid, idslug } = await params;
  const t = await buscarTrabalho(fid, idslug);
  if (!t) return {};
  const excerpt = (t.descricao ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200) || null;
  const m = resolverMetaPagina(t, { titulo: t.titulo, descricao: excerpt, imagem: t.capa_url });
  return {
    title: m.title,
    description: m.description,
    keywords: m.keywords,
    ...(m.noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: await ogPagina({ title: m.ogTitle, description: m.ogDescription, image: m.ogImage }),
  };
}

export default async function TrabalhoPage({ params }: { params: Promise<{ fid: string; categoria: string; idslug: string }> }) {
  const { fid, idslug } = await params;
  const t = await buscarTrabalho(fid, idslug);
  if (!t) notFound();

  const admin = createAdminClient();
  const [{ data: fotosRaw }, info] = await Promise.all([
    admin.from("site_trabalho_fotos").select("*").eq("trabalho_id", t.id).order("ordem"),
    infoCategorias(fid),
  ]);
  const catLabel = nomeCategoria(t.categoria, info.map);
  const b = await baseLinks(fid);
  // JSON-LD exige URL absoluta em `item` (o Search Console recusa caminho relativo)
  const abs = await baseAbsoluta(fid);
  const dataFmt = t.data_evento && t.mostrar_data
    ? new Date(t.data_evento + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  // A capa aparece como banner no topo; então é removida da galeria para não duplicar.
  const todasFotos = (fotosRaw ?? []) as SiteTrabalhoFoto[];
  const fotos = t.capa_url ? todasFotos.filter((f) => f.url_publica !== t.capa_url) : todasFotos;

  return (
    <article>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "ImageGallery",
        name: t.titulo,
        description: t.seo_description ?? undefined,
        image: [t.capa_url, ...todasFotos.map((f) => f.url_publica)].filter(Boolean).slice(0, 30),
      }} />
      {/* Trilha (BreadcrumbList) — situa a página na hierarquia do site pro Google */}
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Trabalhos", item: `${abs}/portfolio` },
          { "@type": "ListItem", position: 2, name: catLabel, item: `${abs}/portfolio/${t.categoria}` },
          { "@type": "ListItem", position: 3, name: t.titulo, item: `${abs}/portfolio/${t.categoria}/${idslug}` },
        ],
      }} />
      {t.capa_url && (
        <div style={{ height: "56vh", maxHeight: 560, overflow: "hidden", background: "#111" }}>
          <img src={t.capa_url} alt={t.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
      )}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 40px" }}>
      <header style={{ textAlign: "center", marginBottom: 28 }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, margin: "0 0 12px", lineHeight: 1.3 }}>{t.titulo}</h1>
        <div style={{ display: "flex", gap: 18, justifyContent: "center", flexWrap: "wrap", fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          <Link href={`${b}/portfolio/${t.categoria}`} style={{ color: "#888" }}>{catLabel}</Link>
          {t.local && <span>{t.local}</span>}
          {dataFmt && <span>{dataFmt}</span>}
        </div>
        {/* Contadores como no site antigo: visualizações e curtidas do trabalho */}
        <div style={{ display: "flex", gap: 18, justifyContent: "center", marginTop: 10, fontSize: 13, color: "var(--site-suave)" }}>
          <span>👁 {t.views ?? 0} visualizações</span>
          <span>♥ {t.likes ?? 0} curtidas</span>
        </div>
      </header>

      {t.descricao && (
        <div
          className="site-conteudo"
          style={{ maxWidth: 760, margin: "0 auto 36px", fontSize: 15, lineHeight: 1.9, color: "#333" }}
          dangerouslySetInnerHTML={{ __html: t.descricao }}
        />
      )}

      {/* Vídeo do trabalho (YouTube) — entre a descrição e a galeria; .lp-video é responsivo */}
      {t.video_url && youtubeEmbedUrl(t.video_url) && (
        <section style={{ margin: "0 auto 36px" }}>
          <div className="lp-video">
            <iframe src={youtubeEmbedUrl(t.video_url)!} title={`Vídeo — ${t.titulo}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        </section>
      )}

      <FotosTrabalho
        trabalhoId={t.id}
        titulo={t.titulo}
        modo={t.modo_exibicao}
        fotos={fotos.map((f) => ({ id: f.id, url_publica: f.url_publica, descricao: f.descricao }))}
      />

      {todasFotos.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "#999", fontSize: 14 }}>As fotos deste trabalho ainda não foram importadas.</div>
      )}

      <footer style={{ textAlign: "center", marginTop: 40 }}>
        <Link href={`${b}/portfolio/${t.categoria}`} style={{ display: "inline-block", padding: "11px 28px", border: "1px solid #222", color: "#222", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", textDecoration: "none", borderRadius: 4 }}>
          Ver mais {catLabel}
        </Link>
      </footer>
      </div>
    </article>
  );
}
