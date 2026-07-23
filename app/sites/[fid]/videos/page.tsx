// Portfólio de vídeos — grade de miniaturas do YouTube; o player abre em lightbox.
// Exibição (colunas/proporção/título) vem de design.grades.videos (Aparência).
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { carregarSite } from "@/lib/site/publico";
import { metaPaginaGenerica, ogPagina } from "@/lib/site/seo";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { normalizarDesign } from "@/lib/site/design";
import { VideosGrade } from "../_components/VideosGrade";
import { JsonLd } from "../_components/JsonLd";
import { youtubeEmbedUrl, youtubeThumbUrl } from "@/lib/utils/youtube";
import type { SiteVideo } from "@/lib/supabase/types";

export async function generateMetadata({ params }: { params: Promise<{ fid: string }> }): Promise<Metadata> {
  const { fid } = await params;
  const { fotografo, config } = await carregarSite(fid);
  const nome = config?.titulo_site ?? fotografo?.nome_empresa ?? "Vídeos";
  const m = metaPaginaGenerica(config, fotografo, { tipo: "videos" }, {
    title: `Vídeos — ${nome}`, description: `Assista aos vídeos de ${nome}.`,
  });
  return {
    title: m.title, description: m.description, keywords: m.keywords,
    openGraph: await ogPagina({ title: m.title, description: m.description, image: m.ogImage }),
    twitter: { card: "summary_large_image", title: m.title, description: m.description, images: m.ogImage ? [m.ogImage] : undefined },
  };
}

export default async function VideosPage({ params }: { params: Promise<{ fid: string }> }) {
  const { fid } = await params;
  const admin = createAdminClient();
  const [videos, { data: cfg }] = await Promise.all([
    fetchAllRows<SiteVideo>(
      (sb, from, to) => sb.from("site_videos").select("*").eq("fotografo_id", fid).eq("publicado", true).order("ordem").range(from, to),
      admin,
    ),
    admin.from("site_config").select("design").eq("fotografo_id", fid).maybeSingle(),
  ]);

  const grade = normalizarDesign(cfg?.design).grades.videos;

  return (
    <div style={{ maxWidth: "var(--site-largura)", margin: "0 auto", padding: "48px 24px" }}>
      {/* VideoObject por vídeo — habilita rich results de vídeo no Google */}
      {videos.slice(0, 20).map((v) => (
        <JsonLd key={v.id} data={{
          "@context": "https://schema.org",
          "@type": "VideoObject",
          name: v.titulo ?? "Vídeo",
          description: v.descricao ?? v.titulo ?? "Vídeo",
          thumbnailUrl: youtubeThumbUrl(v.video_url) ?? undefined,
          embedUrl: youtubeEmbedUrl(v.video_url) ?? v.video_url,
          uploadDate: v.created_at?.slice(0, 10),
        }} />
      ))}
      <h1 className="site-secao-titulo" style={{ fontSize: 30, textAlign: "center", margin: "0 0 24px" }}>Vídeos</h1>
      {videos.length > 0 ? (
        <VideosGrade config={grade} videos={videos.map((v) => ({ id: v.id, video_url: v.video_url, titulo: v.titulo, descricao: v.descricao }))} />
      ) : (
        <p style={{ textAlign: "center", color: "var(--site-suave)", fontSize: 15 }}>Nenhum vídeo por aqui ainda.</p>
      )}
    </div>
  );
}
