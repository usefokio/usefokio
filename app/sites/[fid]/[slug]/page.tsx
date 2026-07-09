// Landing page pública (template "orcamento") — URL: /{slug} no host do fotógrafo.
// Rota dinâmica de 1 nível: as rotas estáticas (portfolio, blog, sobre, contato…) têm precedência.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SiteLandingPage, SiteLandingDados } from "@/lib/supabase/types";

async function buscarLanding(fid: string, slug: string): Promise<SiteLandingPage | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("site_landing_pages").select("*")
    .eq("fotografo_id", fid).eq("slug", slug).eq("publicado", true).maybeSingle();
  return (data as SiteLandingPage) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ fid: string; slug: string }> }): Promise<Metadata> {
  const { fid, slug } = await params;
  const lp = await buscarLanding(fid, slug);
  if (!lp) return {};
  return { title: lp.seo_title ?? lp.titulo, description: lp.seo_description ?? undefined };
}

export default async function LandingPage({ params }: { params: Promise<{ fid: string; slug: string }> }) {
  const { fid, slug } = await params;
  const lp = await buscarLanding(fid, slug);
  if (!lp) notFound();

  const admin = createAdminClient();
  const { data: fotografo } = await admin.from("fotografos").select("whatsapp, nome_empresa").eq("id", fid).maybeSingle();
  const d = (lp.dados ?? {}) as SiteLandingDados;
  const numeroWhats = d.cta_whatsapp?.numero || (fotografo?.whatsapp ?? "").replace(/\D/g, "") || null;
  const linkWhats = numeroWhats ? `https://wa.me/${numeroWhats.startsWith("55") ? numeroWhats : "55" + numeroWhats}` : null;

  return (
    <div>
      {/* Hero */}
      {d.hero?.imagem_url && (
        <section style={{ position: "relative", height: "62vh", maxHeight: 620, overflow: "hidden", background: "#111" }}>
          <img src={d.hero.imagem_url} alt={d.hero?.titulo ?? lp.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: 0.82 }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, textAlign: "center", padding: 24, background: "rgba(0,0,0,0.25)" }}>
            {d.hero?.logo_url && <img src={d.hero.logo_url} alt="" style={{ height: 90, width: "auto" }} />}
            <h1 style={{ color: "#fff", fontSize: 38, margin: 0, letterSpacing: "0.04em", textShadow: "0 2px 14px rgba(0,0,0,0.45)" }}>{d.hero?.titulo ?? lp.titulo}</h1>
          </div>
        </section>
      )}
      {!d.hero?.imagem_url && (
        <h1 className="site-secao-titulo" style={{ fontSize: 32, textAlign: "center", margin: "60px 24px 0" }}>{d.hero?.titulo ?? lp.titulo}</h1>
      )}

      {/* Pacotes */}
      {(d.pacotes?.length ?? 0) > 0 && (
        <section style={{ maxWidth: 1180, margin: "0 auto", padding: "64px 24px 20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 28 }}>
            {d.pacotes!.map((p, i) => (
              <div key={i} style={{ border: "1px solid var(--site-borda)", background: "#fff", padding: "34px 28px", textAlign: "center", display: "flex", flexDirection: "column" }}>
                <h2 style={{ fontSize: 26, margin: "0 0 18px" }}>{p.nome}</h2>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 22px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                  {p.itens.map((item, j) => (
                    <li key={j} style={{ fontSize: 15, lineHeight: 1.6, color: "var(--site-texto)", borderBottom: j < p.itens.length - 1 ? "1px solid var(--site-borda)" : "none", paddingBottom: 10 }}>{item}</li>
                  ))}
                </ul>
                <div style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--site-suave)", marginBottom: 6 }}>Valor</div>
                <div style={{ fontFamily: "var(--site-fonte-titulo), Georgia, serif", fontSize: 26, color: "var(--site-titulo)" }}>{p.valor}</div>
                {p.observacao && <div style={{ fontSize: 12, color: "var(--site-suave)", marginTop: 8 }}>{p.observacao}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Seções de texto (ex.: Álbuns) */}
      {(d.secoes?.length ?? 0) > 0 && d.secoes!.map((s, i) => (
        <section key={i} style={{ background: i % 2 === 0 ? "var(--site-superficie)" : "transparent", padding: "60px 24px", marginTop: 30 }}>
          <div style={{ maxWidth: 820, margin: "0 auto" }}>
            <h2 className="site-secao-titulo" style={{ fontSize: 28, textAlign: "center", margin: "0 0 30px" }}>{s.titulo}</h2>
            <div className="site-conteudo" style={{ fontSize: 16, lineHeight: 1.9 }} dangerouslySetInnerHTML={{ __html: s.corpo_html }} />
          </div>
        </section>
      ))}

      {/* Casais / trabalhos em destaque */}
      {(d.casais?.length ?? 0) > 0 && (
        <section style={{ maxWidth: 1180, margin: "0 auto", padding: "64px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 34 }}>
            {d.casais!.map((c, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                {c.fotos[0] && (
                  c.link
                    ? <a href={c.link}><img src={c.fotos[0]} alt={c.titulo} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} loading="lazy" /></a>
                    : <img src={c.fotos[0]} alt={c.titulo} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} loading="lazy" />
                )}
                <div style={{ fontFamily: "var(--site-fonte-titulo), Georgia, serif", fontSize: 21, color: "var(--site-titulo)", marginTop: 14, textTransform: "uppercase", letterSpacing: "0.03em" }}>{c.titulo}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA WhatsApp */}
      {linkWhats && (
        <section style={{ background: "var(--site-contraste)", textAlign: "center", padding: "64px 24px" }}>
          <h2 style={{ color: "var(--site-contraste-texto)", fontSize: 30, margin: "0 0 24px" }}>{d.avaliacoes_titulo ?? "Vamos conversar?"}</h2>
          <a
            href={linkWhats}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "15px 38px", background: "#25d366", color: "#fff", fontSize: 15, fontWeight: 700, textDecoration: "none", borderRadius: 999 }}
          >
            {d.cta_whatsapp?.texto ?? "Conversar no WhatsApp"}
          </a>
        </section>
      )}
    </div>
  );
}
