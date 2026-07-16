// Home do site público — renderizada pelo construtor de blocos (design.blocos):
// banner, trabalhos recentes, blog, depoimentos e selos, na ordem configurada na Aparência.
// A CTA final fica fora do sistema de blocos (rodapé de chamada fixo).
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { baseLinks, infoCategorias } from "@/lib/site/publico";
import { normalizarDesign } from "@/lib/site/design";
import { HomeBlocos } from "./_components/home/HomeBlocos";
import type { DadosHome } from "./_components/home/tipos";
import type { SiteBanner, SiteDepoimento, SitePost, SiteSelo, SiteTrabalho, SiteVideo } from "@/lib/supabase/types";

export default async function HomeSite({ params }: { params: Promise<{ fid: string }> }) {
  const { fid } = await params;
  const b = await baseLinks(fid);
  const admin = createAdminClient();

  const { data: cfg } = await admin.from("site_config").select("design").eq("fotografo_id", fid).maybeSingle();
  const design = normalizarDesign((cfg as { design?: unknown } | null)?.design);

  const [banners, trabalhos, videos, posts, depoimentos, selos, info] = await Promise.all([
    fetchAllRows<SiteBanner>((sb, f, t) => sb.from("site_banners").select("*").eq("fotografo_id", fid).eq("publicado", true).order("ordem").range(f, t), admin),
    fetchAllRows<SiteTrabalho>((sb, f, t) => sb.from("site_trabalhos").select("*").eq("fotografo_id", fid).eq("publicado", true).order("data_evento", { ascending: false }).range(f, t), admin),
    fetchAllRows<SiteVideo>((sb, f, t) => sb.from("site_videos").select("*").eq("fotografo_id", fid).eq("publicado", true).order("ordem").range(f, t), admin),
    fetchAllRows<SitePost>((sb, f, t) => sb.from("site_posts").select("*").eq("fotografo_id", fid).eq("publicado", true).order("ordem").range(f, t), admin),
    fetchAllRows<SiteDepoimento>((sb, f, t) => sb.from("site_depoimentos").select("*").eq("fotografo_id", fid).eq("publicado", true).order("ordem").range(f, t), admin),
    fetchAllRows<SiteSelo>((sb, f, t) => sb.from("site_selos").select("*").eq("fotografo_id", fid).eq("publicado", true).order("ordem").range(f, t), admin),
    infoCategorias(fid),
  ]);

  const dados: DadosHome = {
    banners,
    trabalhos: trabalhos.slice(0, 9),
    videos: videos.slice(0, 6),
    posts: posts.slice(0, 6),
    depoimentos,
    selos,
    catMap: info.map,
  };

  return (
    <div>
      <HomeBlocos blocos={design.blocos} dados={dados} base={b} />
    </div>
  );
}
