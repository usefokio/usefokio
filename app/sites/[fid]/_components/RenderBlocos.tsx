// Renderer público do MOTOR DE BLOCOS (server component) — desenha a página a partir da lista de blocos.
// Reusa as classes .lp-* (responsivas) do tema Editorial.
import Link from "next/link";
import type { CSSProperties } from "react";
import type { SiteBloco } from "@/lib/site/blocos";
import type { SiteDepoimento } from "@/lib/supabase/types";
import { ContatoForm } from "./ContatoForm";

export type ContextoBlocos = {
  base: string;                      // prefixo dos links internos ("" no host do fotógrafo)
  fid: string;                       // id do fotógrafo (usado pelo bloco "formulario")
  depoimentos: SiteDepoimento[];     // usados pelo bloco "depoimentos"
  whatsappFallback: string | null;   // número do cadastro (fallback do bloco whatsapp)
  categorias?: { valor: string; label: string }[]; // "tipo do evento" do bloco "formulario"
};

function linkInterno(base: string, href: string) {
  return href.startsWith("/") ? `${base}${href}` : href;
}

function Bloco({ bloco, ctx }: { bloco: SiteBloco; ctx: ContextoBlocos }) {
  const d = bloco.dados;
  switch (bloco.tipo) {
    case "hero": {
      // Miolo do hero: logo + título + texto (subtítulo) + formulário sobreposto (opcional).
      const miolo = (
        <>
          {d.logo_url && <img className="lp-logo" src={d.logo_url} alt="" />}
          {d.titulo && <h1>{d.titulo}</h1>}
          {d.texto && <p className="lp-hero-texto">{d.texto}</p>}
          {d.com_formulario && (
            <div className="lp-hero-form">
              <ContatoForm fid={ctx.fid} config={d.formulario} categorias={ctx.categorias ?? []} />
            </div>
          )}
        </>
      );
      if (d.imagem_url) {
        return (
          <section className="lp-hero">
            <img className="lp-hero-bg" src={d.imagem_url} alt={d.titulo ?? ""} />
            <div className="lp-hero-inner">{miolo}</div>
          </section>
        );
      }
      if (d.com_formulario || d.texto) {
        return <section className="lp-secao lp-hero-solto" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, textAlign: "center" }}>{miolo}</section>;
      }
      return d.titulo ? <h1 className="lp-titulo" style={{ marginTop: 60 }}>{d.titulo}</h1> : null;
    }

    case "titulo":
      return d.texto ? <h2 className="lp-titulo" style={{ paddingTop: 40 }}>{d.texto}</h2> : null;

    case "texto":
      return d.html ? (
        <section className="lp-secao" style={{ paddingTop: 24, paddingBottom: 24 }}>
          <div className="site-conteudo" style={{ fontSize: 16, lineHeight: 1.9, maxWidth: 820, margin: "0 auto" }} dangerouslySetInnerHTML={{ __html: d.html }} />
        </section>
      ) : null;

    case "imagem":
      return d.url ? (
        d.largura_total
          ? <img className="lp-full-img" src={d.url} alt="" loading="lazy" />
          : <div className="lp-secao" style={{ paddingTop: 24, paddingBottom: 24 }}><img src={d.url} alt="" style={{ width: `${Math.min(100, Math.max(20, d.largura ?? 100))}%`, height: "auto", display: "block", borderRadius: 4, margin: "0 auto" }} loading="lazy" /></div>
      ) : null;

    case "duas_colunas":
      return (
        <div className={`lp-duas${d.invertido ? " invertido" : ""}`}>
          <div className="lp-duas-txt">
            {d.titulo && <h2 className="lp-pacote-nome">{d.titulo}</h2>}
            {d.html && <div className="site-conteudo" style={{ fontSize: 16, lineHeight: 1.8 }} dangerouslySetInnerHTML={{ __html: d.html }} />}
          </div>
          {d.imagem_url && <img className="lp-duas-img" src={d.imagem_url} alt={d.titulo ?? ""} loading="lazy" />}
        </div>
      );

    case "pacote":
      return (
        <div className={`lp-duas${d.invertido ? " invertido" : ""}`}>
          <div className="lp-duas-txt">
            {d.nome && <h2 className="lp-pacote-nome">{d.nome}</h2>}
            {(d.itens?.length ?? 0) > 0 && (
              <ul className="lp-pacote-itens">{d.itens!.filter(Boolean).map((it, j) => <li key={j}>{it}</li>)}</ul>
            )}
            {d.valor && (<><div className="lp-valor-label">Valor</div><div className="lp-valor">{d.valor}</div></>)}
          </div>
          {d.imagem_url && <img className="lp-duas-img" src={d.imagem_url} alt={d.nome ?? ""} loading="lazy" />}
        </div>
      );

    case "cards":
      return (d.cards?.length ?? 0) > 0 ? (
        <section className="lp-secao">
          {d.titulo && <h2 className="lp-titulo">{d.titulo}</h2>}
          <div className="lp-casais">
            {d.cards!.map((c, i) => {
              const conteudo = (
                <>
                  {c.foto_url && <img src={c.foto_url} alt={c.nome} loading="lazy" />}
                  <div className="lp-casal-nome">{c.nome}</div>
                </>
              );
              return c.href
                ? <Link key={i} className="lp-casal" href={linkInterno(ctx.base, c.href)}>{conteudo}</Link>
                : <div key={i} className="lp-casal">{conteudo}</div>;
            })}
          </div>
        </section>
      ) : null;

    case "galeria":
      return (d.fotos?.length ?? 0) > 0 ? (
        <section className="lp-secao">
          {d.titulo && <h2 className="lp-titulo">{d.titulo}</h2>}
          <div className="lp-galeria" style={{ "--lp-cols": Math.min(4, Math.max(2, d.colunas ?? 3)) } as CSSProperties}>
            {d.fotos!.map((f, i) => (
              <img key={i} src={f} alt="" loading="lazy" />
            ))}
          </div>
        </section>
      ) : null;

    case "video":
      return d.url ? (
        <section className="lp-secao">
          <div className="lp-video"><iframe src={d.url} title="Vídeo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div>
        </section>
      ) : null;

    case "depoimentos":
      return ctx.depoimentos.length > 0 || d.escrever_url ? (
        <section className="lp-secao" style={{ textAlign: "center" }}>
          {d.titulo && <h2 className="lp-titulo">{d.titulo}</h2>}
          {ctx.depoimentos.length > 0 && (
            <div className="lp-reviews">
              {ctx.depoimentos.map((dep) => (
                <div key={dep.id} className="lp-review" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  {dep.foto_url && <img src={dep.foto_url} alt={dep.nome} style={{ width: 54, height: 54, borderRadius: "50%", objectFit: "cover", marginBottom: 10 }} />}
                  <div style={{ fontWeight: 700, fontSize: 15, color: "var(--site-titulo)", marginBottom: 6 }}>{dep.nome}</div>
                  <div className="lp-review-nota">★★★★★</div>
                  <div className="lp-review-texto" style={{ marginTop: 6 }}>
                    “{dep.texto.length > 200 ? dep.texto.slice(0, 200) + "…" : dep.texto}”
                  </div>
                </div>
              ))}
            </div>
          )}
          {d.escrever_url && (
            <a className="lp-botao-verde" style={{ marginTop: 24 }} href={d.escrever_url} target="_blank" rel="noopener noreferrer">Escrever avaliação</a>
          )}
        </section>
      ) : null;

    case "divisor":
      return <hr className="lp-divisor" />;

    case "espaco":
      return <div style={{ height: Math.max(0, d.altura ?? 40) }} />;

    case "whatsapp": {
      const numero = (d.numero || ctx.whatsappFallback || "").replace(/\D/g, "");
      if (!numero) return null;
      const link = `https://wa.me/${numero.startsWith("55") ? numero : "55" + numero}`;
      return (
        <section style={{ background: "var(--site-contraste)", textAlign: "center", padding: "64px 24px" }}>
          <a href={link} target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "15px 40px", background: "#25d366", color: "#fff", fontSize: 16, fontWeight: 700, textDecoration: "none", borderRadius: 999 }}>
            {d.texto ?? "Conversar no WhatsApp"}
          </a>
        </section>
      );
    }

    case "formulario":
      return (
        <section className="lp-secao" style={{ maxWidth: 680 }}>
          {d.titulo && <h2 className="lp-titulo">{d.titulo}</h2>}
          <ContatoForm fid={ctx.fid} config={d.formulario} categorias={ctx.categorias ?? []} />
        </section>
      );

    default:
      return null;
  }
}

export function RenderBlocos({ blocos, ctx }: { blocos: SiteBloco[]; ctx: ContextoBlocos }) {
  return (
    <div>
      {blocos.map((b) => <Bloco key={b.id} bloco={b} ctx={ctx} />)}
    </div>
  );
}
