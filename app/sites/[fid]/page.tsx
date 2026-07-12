// Home do site público — renderizada pelo construtor de blocos (design.blocos):
// banner, trabalhos recentes, blog, depoimentos e selos, na ordem configurada na Aparência.
// A CTA final fica fora do sistema de blocos (rodapé de chamada fixo).
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { baseLinks } from "@/lib/site/publico";
import { normalizarDesign } from "@/lib/site/design";
import { HomeBlocos } from "./_components/home/HomeBlocos";
import type { DadosHome } from "./_components/home/tipos";
import type { SiteBanner, SiteDepoimento, SitePost, SiteSelo, SiteTrabalho } from "@/lib/supabase/types";

export default async function HomeSite({ params }: { params: Promise<{ fid: string }> }) {
  const { fid } = await params;
  const b = await baseLinks(fid);
  const admin = createAdminClient();

  const { data: cfg } = await admin.from("site_config").select("design").eq("fotografo_id", fid).maybeSingle();
  const design = normalizarDesign((cfg as { design?: unknown } | null)?.design);

  const [banners, trabalhos, posts, depoimentos, selos] = await Promise.all([
    fetchAllRows<SiteBanner>((sb, f, t) => sb.from("site_banners").select("*").eq("fotografo_id", fid).eq("publicado", true).order("ordem").range(f, t), admin),
    fetchAllRows<SiteTrabalho>((sb, f, t) => sb.from("site_trabalhos").select("*").eq("fotografo_id", fid).eq("publicado", true).order("data_evento", { ascending: false }).range(f, t), admin),
    fetchAllRows<SitePost>((sb, f, t) => sb.from("site_posts").select("*").eq("fotografo_id", fid).eq("publicado", true).order("ordem").range(f, t), admin),
    fetchAllRows<SiteDepoimento>((sb, f, t) => sb.from("site_depoimentos").select("*").eq("fotografo_id", fid).eq("publicado", true).order("ordem").range(f, t), admin),
    fetchAllRows<SiteSelo>((sb, f, t) => sb.from("site_selos").select("*").eq("fotografo_id", fid).eq("publicado", true).order("ordem").range(f, t), admin),
  ]);

  const dados: DadosHome = {
    banners,
    trabalhos: trabalhos.slice(0, 9),
    posts: posts.slice(0, 6),
    depoimentos,
    selos,
  };

  return (
    <div>
      <HomeBlocos blocos={design.blocos} dados={dados} base={b} />

      {/* CTA de fechamento (fora do sistema de blocos) */}
      <section style={{ background: "var(--site-contraste)", color: "var(--site-contraste-texto)", textAlign: "center", padding: "72px 24px" }}>
        <h2 style={{ fontSize: 32, margin: "0 0 12px", color: "var(--site-contraste-texto)" }}>Vamos registrar a sua história?</h2>
        <p style={{ fontSize: 16, color: "color-mix(in srgb, var(--site-contraste-texto) 75%, transparent)", margin: "0 0 30px", fontFamily: "var(--site-fonte-corpo), Georgia, serif" }}>Entre em contato e solicite seu orçamento.</p>
        <Link href={`${b}/contato`} style={{ display: "inline-block", padding: "14px 42px", border: "1px solid var(--site-contraste-texto)", color: "var(--site-contraste-texto)", fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase", textDecoration: "none" }}>
          Solicitar orçamento
        </Link>
      </section>
    </div>
  );
}
