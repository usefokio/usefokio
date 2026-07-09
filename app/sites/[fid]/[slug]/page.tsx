// Landing page pública — réplica fiel do template "orcamento" (URL: /{slug} no host do fotógrafo).
// Rota dinâmica de 1 nível: as rotas estáticas (portfolio, blog, sobre, contato…) têm precedência.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { baseLinks } from "@/lib/site/publico";
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
  const { data: fotografo } = await admin.from("fotografos").select("whatsapp").eq("id", fid).maybeSingle();
  const b = await baseLinks(fid);
  const d = (lp.dados ?? {}) as SiteLandingDados;

  const numeroWhats = (d.cta_whatsapp?.numero || (fotografo?.whatsapp ?? "")).replace(/\D/g, "") || null;
  const linkWhats = numeroWhats ? `https://wa.me/${numeroWhats.startsWith("55") ? numeroWhats : "55" + numeroWhats}` : null;
  const av = d.avaliacoes;
  const linkInterno = (href: string) => (href.startsWith("/") ? `${b}${href}` : href);

  const BlocoAvaliacoes = av && (av.reviews?.length || av.escrever_url) ? (
    <section className="lp-secao" style={{ textAlign: "center" }}>
      <h2 className="lp-titulo">{av.titulo ?? "Avaliações no Google"}</h2>
      {av.escrever_url && <a className="lp-botao-verde" href={av.escrever_url} target="_blank" rel="noopener noreferrer">Escrever avaliação</a>}
      {av.reviews && av.reviews.length > 0 && (
        <div className="lp-reviews">
          {av.reviews.map((r, i) => (
            <div key={i} className="lp-review">
              {typeof r.nota === "number" && <div className="lp-review-nota">{"★".repeat(Math.round(r.nota))}</div>}
              <div className="lp-review-texto">“{r.texto}”</div>
              <div className="lp-review-nome">{r.nome}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  ) : null;

  return (
    <div>
      {/* Hero */}
      {d.hero?.imagem_url ? (
        <section className="lp-hero">
          <img className="lp-hero-bg" src={d.hero.imagem_url} alt={d.hero?.titulo ?? lp.titulo} />
          <div className="lp-hero-inner">
            {d.hero?.logo_url && <img className="lp-logo" src={d.hero.logo_url} alt="" />}
            {d.hero?.titulo && <h1>{d.hero.titulo}</h1>}
          </div>
        </section>
      ) : (
        <h1 className="lp-titulo" style={{ marginTop: 60 }}>{d.hero?.titulo ?? lp.titulo}</h1>
      )}

      {/* Avaliações (topo) */}
      {BlocoAvaliacoes}

      {/* Vídeo */}
      {d.video_url && (
        <section className="lp-secao">
          <div className="lp-video"><iframe src={d.video_url} title="Vídeo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div>
        </section>
      )}

      {/* Pacotes — 2 colunas alternadas */}
      {(d.pacotes ?? []).map((p, i) => (
        <div key={i} className={`lp-duas${i % 2 === 1 ? " invertido" : ""}`}>
          <div className="lp-duas-txt">
            <h2 className="lp-pacote-nome">{p.nome}</h2>
            {p.itens.length > 0 && (
              <ul className="lp-pacote-itens">{p.itens.map((it, j) => <li key={j}>{it}</li>)}</ul>
            )}
            {p.valor && (<><div className="lp-valor-label">Valor</div><div className="lp-valor">{p.valor}</div></>)}
          </div>
          {p.imagem_url && <img className="lp-duas-img" src={p.imagem_url} alt={p.nome} loading="lazy" />}
        </div>
      ))}

      {/* Ensaio pré-wedding: título + imagem full-width */}
      {d.ensaio && (d.ensaio.titulo || d.ensaio.imagem_url) && (
        <section style={{ paddingTop: 40 }}>
          {d.ensaio.titulo && <h2 className="lp-titulo">{d.ensaio.titulo}</h2>}
          {d.ensaio.imagem_url && <img className="lp-full-img" src={d.ensaio.imagem_url} alt={d.ensaio.titulo ?? ""} loading="lazy" />}
        </section>
      )}

      {/* Álbuns — 2 colunas */}
      {d.albuns && (d.albuns.titulo || d.albuns.corpo_html || d.albuns.imagem_url) && (
        <div className="lp-duas">
          <div className="lp-duas-txt">
            {d.albuns.titulo && <h2 className="lp-pacote-nome">{d.albuns.titulo}</h2>}
            {d.albuns.corpo_html && <div className="site-conteudo" style={{ fontSize: 16, lineHeight: 1.8 }} dangerouslySetInnerHTML={{ __html: d.albuns.corpo_html }} />}
          </div>
          {d.albuns.imagem_url && <img className="lp-duas-img" src={d.albuns.imagem_url} alt={d.albuns.titulo ?? "Álbuns"} loading="lazy" />}
        </div>
      )}

      {/* Casais / trabalhos realizados */}
      {(d.casais?.length ?? 0) > 0 && (
        <section className="lp-secao">
          {d.casais_titulo && <h2 className="lp-titulo">{d.casais_titulo}</h2>}
          <div className="lp-casais">
            {d.casais!.map((c, i) => {
              const conteudo = (
                <>
                  {c.foto_url && <img src={c.foto_url} alt={c.nome} loading="lazy" />}
                  <div className="lp-casal-nome">{c.nome}</div>
                </>
              );
              return c.href
                ? <Link key={i} className="lp-casal" href={linkInterno(c.href)}>{conteudo}</Link>
                : <div key={i} className="lp-casal">{conteudo}</div>;
            })}
          </div>
        </section>
      )}

      <hr className="lp-divisor" />

      {/* Avaliações (rodapé, "O que meus clientes dizem") */}
      {BlocoAvaliacoes}

      {/* CTA WhatsApp */}
      {linkWhats && (
        <section style={{ background: "var(--site-contraste)", textAlign: "center", padding: "64px 24px" }}>
          <a href={linkWhats} target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "15px 40px", background: "#25d366", color: "#fff", fontSize: 16, fontWeight: 700, textDecoration: "none", borderRadius: 999 }}>
            {d.cta_whatsapp?.texto ?? "Conversar no WhatsApp"}
          </a>
        </section>
      )}
    </div>
  );
}
