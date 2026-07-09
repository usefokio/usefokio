// Home do site público (tema Editorial): hero, trabalhos em destaque + recentes, depoimentos, blog, CTA.
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { baseLinks, CATEGORIA_LABEL } from "@/lib/site/publico";
import { BannerCarousel } from "./_components/BannerCarousel";
import type { SiteBanner, SiteDepoimento, SitePost, SiteTrabalho } from "@/lib/supabase/types";

function CardTrabalho({ t, href }: { t: SiteTrabalho; href: string }) {
  return (
    <Link href={href} style={{ textDecoration: "none", color: "var(--site-texto)" }}>
      <div style={{ overflow: "hidden", background: "var(--site-superficie)", aspectRatio: "4/3" }}>
        {t.capa_url && <img src={t.capa_url} alt={t.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />}
      </div>
      <div style={{ padding: "16px 8px 0", textAlign: "center" }}>
        <div style={{ fontFamily: "var(--site-fonte-titulo), Georgia, serif", fontSize: 20, color: "var(--site-titulo)", lineHeight: 1.25, textTransform: "uppercase", letterSpacing: "0.03em" }}>{t.titulo}</div>
        <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--site-suave)", marginTop: 8 }}>{CATEGORIA_LABEL[t.categoria] ?? t.categoria}</div>
        {t.local && <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--site-suave)", marginTop: 3 }}>{t.local}</div>}
      </div>
    </Link>
  );
}

export default async function HomeSite({ params }: { params: Promise<{ fid: string }> }) {
  const { fid } = await params;
  const b = await baseLinks(fid);
  const admin = createAdminClient();

  const [{ data: banners }, { data: destaques }, { data: recentes }, { data: depoimentos }, { data: posts }] = await Promise.all([
    admin.from("site_banners").select("*").eq("fotografo_id", fid).eq("publicado", true).order("ordem"),
    admin.from("site_trabalhos").select("*").eq("fotografo_id", fid).eq("publicado", true).eq("destaque_home", true).order("data_evento", { ascending: false }).limit(3),
    admin.from("site_trabalhos").select("*").eq("fotografo_id", fid).eq("publicado", true).order("data_evento", { ascending: false }).limit(6),
    admin.from("site_depoimentos").select("*").eq("fotografo_id", fid).eq("publicado", true).order("ordem").limit(3),
    admin.from("site_posts").select("*").eq("fotografo_id", fid).eq("publicado", true).order("ordem", { ascending: true }).limit(3),
  ]);

  const urlTrabalho = (t: SiteTrabalho) => `${b}/portfolio/${t.categoria}/${t.legacy_id ? `${t.legacy_id}-` : ""}${t.slug}`;
  const listaDestaque = (destaques as SiteTrabalho[] | null) ?? [];
  const listaRecentes = (recentes as SiteTrabalho[] | null) ?? [];

  return (
    <div>
      {/* Hero — carrossel rotativo (clicável quando o banner tem link) */}
      <BannerCarousel
        basePath={b}
        banners={((banners ?? []) as SiteBanner[]).map((bn) => ({ id: bn.id, imagem_url: bn.imagem_url, titulo: bn.titulo, link: bn.link }))}
      />

      {/* Trabalhos em destaque */}
      {listaDestaque.length > 0 && (
        <section style={{ maxWidth: 1180, margin: "0 auto", padding: "68px 24px 20px" }}>
          <h2 className="site-secao-titulo" style={{ fontSize: 30, textAlign: "center", margin: "0 0 44px" }}>Trabalhos em destaque</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 34 }}>
            {listaDestaque.map((t) => <CardTrabalho key={t.id} t={t} href={urlTrabalho(t)} />)}
          </div>
        </section>
      )}

      {/* Trabalhos recentes */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "48px 24px" }}>
        <h2 className="site-secao-titulo" style={{ fontSize: 30, textAlign: "center", margin: "0 0 44px" }}>Trabalhos recentes</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 34 }}>
          {listaRecentes.map((t) => <CardTrabalho key={t.id} t={t} href={urlTrabalho(t)} />)}
        </div>
        <div style={{ textAlign: "center", marginTop: 48 }}>
          <Link href={`${b}/portfolio`} style={{ display: "inline-block", padding: "13px 40px", border: "1px solid var(--site-titulo)", color: "var(--site-titulo)", fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase", textDecoration: "none" }}>
            Ver todas as histórias
          </Link>
        </div>
      </section>

      {/* Depoimentos */}
      {depoimentos && depoimentos.length > 0 && (
        <section style={{ background: "var(--site-superficie)", padding: "64px 24px", marginTop: 40 }}>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <h2 className="site-secao-titulo" style={{ fontSize: 30, textAlign: "center", margin: "0 0 44px" }}>Depoimentos</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
              {(depoimentos as SiteDepoimento[]).map((d) => (
                <figure key={d.id} style={{ margin: 0, textAlign: "center", padding: "8px 16px" }}>
                  {d.foto_url && <img src={d.foto_url} alt={d.nome} style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", margin: "0 auto 16px", display: "block" }} />}
                  <blockquote style={{ margin: "0 0 16px", fontSize: 17, lineHeight: 1.7, color: "var(--site-texto)", fontStyle: "italic", fontFamily: "var(--site-fonte-corpo), Georgia, serif" }}>
                    “{d.texto.length > 240 ? d.texto.slice(0, 240) + "…" : d.texto}”
                  </blockquote>
                  <figcaption style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--site-suave)" }}>{d.nome}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Blog */}
      {posts && posts.length > 0 && (
        <section style={{ maxWidth: 1180, margin: "0 auto", padding: "64px 24px" }}>
          <h2 className="site-secao-titulo" style={{ fontSize: 30, textAlign: "center", margin: "0 0 44px" }}>Do blog</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 34 }}>
            {(posts as SitePost[]).map((p) => (
              <Link key={p.id} href={`${b}/post/${p.legacy_id ? `${p.legacy_id}-` : ""}${p.slug}`} style={{ textDecoration: "none", color: "var(--site-texto)" }}>
                <div style={{ overflow: "hidden", background: "var(--site-superficie)", aspectRatio: "16/10" }}>
                  {p.capa_url && <img src={p.capa_url} alt={p.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />}
                </div>
                <div style={{ padding: "14px 8px 0", textAlign: "center", fontFamily: "var(--site-fonte-titulo), Georgia, serif", fontSize: 19, color: "var(--site-titulo)", lineHeight: 1.3 }}>{p.titulo}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
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
