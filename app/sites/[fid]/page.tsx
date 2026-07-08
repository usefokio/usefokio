// Home do site público: banners, trabalhos recentes, depoimentos e blog.
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { base, CATEGORIA_LABEL } from "@/lib/site/publico";
import { BannerCarousel } from "./_components/BannerCarousel";
import type { SiteBanner, SiteDepoimento, SitePost, SiteTrabalho } from "@/lib/supabase/types";

export default async function HomeSite({ params }: { params: Promise<{ fid: string }> }) {
  const { fid } = await params;
  const b = base(fid);
  const admin = createAdminClient();

  const [{ data: banners }, { data: trabalhos }, { data: depoimentos }, { data: posts }] = await Promise.all([
    admin.from("site_banners").select("*").eq("fotografo_id", fid).eq("publicado", true).order("ordem"),
    admin.from("site_trabalhos").select("*").eq("fotografo_id", fid).eq("publicado", true).order("data_evento", { ascending: false }).limit(6),
    admin.from("site_depoimentos").select("*").eq("fotografo_id", fid).eq("publicado", true).order("ordem").limit(5),
    admin.from("site_posts").select("*").eq("fotografo_id", fid).eq("publicado", true).order("ordem", { ascending: true }).limit(3),
  ]);

  const urlTrabalho = (t: SiteTrabalho) => `${b}/portfolio/${t.categoria}/${t.legacy_id ? `${t.legacy_id}-` : ""}${t.slug}`;

  return (
    <div>
      {/* Hero — carrossel rotativo (clicável quando o banner tem link) */}
      <BannerCarousel
        basePath={b}
        banners={((banners ?? []) as SiteBanner[]).map((bn) => ({ id: bn.id, imagem_url: bn.imagem_url, titulo: bn.titulo, link: bn.link }))}
      />

      {/* Trabalhos recentes */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "56px 24px" }}>
        <h2 style={{ fontSize: 26, fontWeight: 700, textAlign: "center", margin: "0 0 8px", letterSpacing: "-0.01em" }}>Trabalhos recentes</h2>
        <p style={{ textAlign: "center", fontSize: 14, color: "#777", margin: "0 0 36px" }}>Histórias reais registradas com carinho.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 }}>
          {(trabalhos as SiteTrabalho[] | null)?.map((t) => (
            <Link key={t.id} href={urlTrabalho(t)} style={{ textDecoration: "none", color: "#222" }}>
              <div style={{ borderRadius: 10, overflow: "hidden", background: "#f5f5f5", aspectRatio: "3/2" }}>
                {t.capa_url && <img src={t.capa_url} alt={t.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />}
              </div>
              <div style={{ padding: "12px 4px 0" }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#999", marginBottom: 3 }}>{CATEGORIA_LABEL[t.categoria] ?? t.categoria}</div>
                <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>{t.titulo}</div>
              </div>
            </Link>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <Link href={`${b}/portfolio`} style={{ display: "inline-block", padding: "12px 32px", border: "1px solid #222", color: "#222", fontSize: 13, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", textDecoration: "none", borderRadius: 4 }}>
            Ver portfólio completo
          </Link>
        </div>
      </section>

      {/* Depoimentos */}
      {depoimentos && depoimentos.length > 0 && (
        <section style={{ background: "#faf9f7", padding: "56px 24px" }}>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <h2 style={{ fontSize: 26, fontWeight: 700, textAlign: "center", margin: "0 0 36px" }}>Depoimentos</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }}>
              {(depoimentos as SiteDepoimento[]).slice(0, 3).map((d) => (
                <figure key={d.id} style={{ margin: 0, background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "22px 20px" }}>
                  <blockquote style={{ margin: "0 0 16px", fontSize: 13, lineHeight: 1.8, color: "#444", fontStyle: "italic" }}>
                    "{d.texto.length > 220 ? d.texto.slice(0, 220) + "…" : d.texto}"
                  </blockquote>
                  <figcaption style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {d.foto_url && <img src={d.foto_url} alt={d.nome} style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover" }} />}
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{d.nome}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Blog */}
      {posts && posts.length > 0 && (
        <section style={{ maxWidth: 1200, margin: "0 auto", padding: "56px 24px" }}>
          <h2 style={{ fontSize: 26, fontWeight: 700, textAlign: "center", margin: "0 0 36px" }}>Blog</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }}>
            {(posts as SitePost[]).map((p) => (
              <Link key={p.id} href={`${b}/post/${p.legacy_id ? `${p.legacy_id}-` : ""}${p.slug}`} style={{ textDecoration: "none", color: "#222" }}>
                <div style={{ borderRadius: 10, overflow: "hidden", background: "#f5f5f5", aspectRatio: "16/10" }}>
                  {p.capa_url && <img src={p.capa_url} alt={p.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />}
                </div>
                <div style={{ padding: "12px 4px 0", fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>{p.titulo}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section style={{ background: "#111", color: "#fff", textAlign: "center", padding: "56px 24px" }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 10px" }}>Vamos registrar a sua história?</h2>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", margin: "0 0 26px" }}>Entre em contato e solicite seu orçamento.</p>
        <Link href={`${b}/contato`} style={{ display: "inline-block", padding: "13px 36px", background: "#fff", color: "#111", fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", textDecoration: "none", borderRadius: 4 }}>
          Solicitar orçamento
        </Link>
      </section>
    </div>
  );
}
