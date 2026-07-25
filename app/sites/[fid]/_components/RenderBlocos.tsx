// Renderer público do MOTOR DE BLOCOS (server component) — desenha a página a partir da lista de blocos.
// Reusa as classes .lp-* (responsivas) do tema Editorial.
import Link from "next/link";
import type { CSSProperties } from "react";
import { valorExibido, type SiteBloco } from "@/lib/site/blocos";
import { ASPECT, OBJECT_POSITION } from "@/lib/site/design";
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

// Estilo de imagem a partir das opções do bloco (mesmo vocabulário da Aparência).
// Sem `proporcao` escolhida, devolve {} — a imagem sai exatamente como saía antes.
function estiloImagem(d: SiteBloco["dados"]): CSSProperties {
  if (!d.proporcao) return {};
  return {
    aspectRatio: ASPECT[d.proporcao],
    objectFit: d.ajuste === "manter_proporcao" ? "contain" : "cover",
    objectPosition: OBJECT_POSITION[d.ancora ?? "centro"],
    // inline vence o CSS das classes/media queries (ex.: .lp-duas-img usa width:auto no mobile),
    // senão a proporção escolhida não aparecia
    width: "100%",
    height: "auto",
    maxHeight: "none",
  };
}

// Tamanho do título: multiplicador em cima do que o tema define (--lp-esc-tit no CSS).
// Como é multiplicador, as reduções de mobile das media queries continuam valendo.
function estiloTitulo(d: SiteBloco["dados"]): CSSProperties | undefined {
  const e = d.titulo_escala;
  if (!e || e === 100) return undefined;
  return { "--lp-esc-tit": e / 100 } as CSSProperties;
}

// Lista de itens de um pacote, com o marcador escolhido no editor (número usa <ol>).
// Fallback dos pacotes ANTIGOS (uma frase por linha) — os novos usam texto rico.
function ListaItens({ itens, estilo }: { itens?: string[]; estilo: NonNullable<SiteBloco["dados"]["lista_estilo"]> }) {
  const limpos = (itens ?? []).filter(Boolean);
  if (limpos.length === 0) return null;
  const Lista = estilo === "numero" ? "ol" : "ul";
  return (
    <Lista className={`lp-pacote-itens lp-lista-${estilo}`}>
      {limpos.map((it, j) => <li key={j}>{it}</li>)}
    </Lista>
  );
}

// Itens do pacote: prefere o TEXTO RICO (HTML) do editor; sem ele, cai na lista antiga.
function ItensPacote({ html, itens, estilo }: { html?: string | null; itens?: string[]; estilo: NonNullable<SiteBloco["dados"]["lista_estilo"]> }) {
  const rico = (html ?? "").trim();
  if (rico && rico !== "<p></p>") {
    return <div className="site-conteudo lp-itens-rico" dangerouslySetInnerHTML={{ __html: rico }} />;
  }
  return <ListaItens itens={itens} estilo={estilo} />;
}

// Classe de posição da imagem nos blocos de 2 colunas. Sem escolha explícita, cai no
// `invertido` legado — as landings antigas continuam exatamente como estão.
function classeDuas(d: SiteBloco["dados"]): string {
  const pos = d.imagem_posicao ?? (d.invertido ? "esquerda" : "direita");
  if (pos === "acima") return "lp-duas imagem-acima";
  return pos === "esquerda" ? "lp-duas invertido" : "lp-duas";
}

function Bloco({ bloco, ctx }: { bloco: SiteBloco; ctx: ContextoBlocos }) {
  const d = bloco.dados;
  const estTit = estiloTitulo(d);
  switch (bloco.tipo) {
    case "hero": {
      // Miolo do hero: logo + título + texto (subtítulo) + formulário sobreposto (opcional).
      const miolo = (
        <>
          {d.logo_url && <img className="lp-logo" src={d.logo_url} alt="" />}
          {d.titulo && <h1 style={estTit}>{d.titulo}</h1>}
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
          <section className="lp-hero" style={d.altura ? { minHeight: d.altura } : undefined}>
            <img className="lp-hero-bg" src={d.imagem_url} alt={d.titulo ?? ""}
              style={{ objectPosition: OBJECT_POSITION[d.ancora ?? "centro"] }} />
            <div className="lp-hero-inner">{miolo}</div>
          </section>
        );
      }
      if (d.com_formulario || d.texto) {
        return <section className="lp-secao lp-hero-solto" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, textAlign: "center" }}>{miolo}</section>;
      }
      return d.titulo ? <h1 className="lp-titulo" style={{ ...estTit, marginTop: 60 }}>{d.titulo}</h1> : null;
    }

    case "titulo":
      return d.texto ? <h2 className="lp-titulo" style={{ ...estTit, paddingTop: 40 }}>{d.texto}</h2> : null;

    case "texto":
      return d.html ? (
        <section className="lp-secao" style={{ paddingTop: 24, paddingBottom: 24 }}>
          <div className="site-conteudo" style={{ fontSize: 16, lineHeight: 1.9, maxWidth: 820, margin: "0 auto" }} dangerouslySetInnerHTML={{ __html: d.html }} />
        </section>
      ) : null;

    case "imagem": {
      if (!d.url) return null;
      const est = estiloImagem(d);
      return d.largura_total
        ? <img className="lp-full-img" src={d.url} alt="" loading="lazy" style={est} />
        : (
          <div className="lp-secao" style={{ paddingTop: 24, paddingBottom: 24 }}>
            {/* est vem primeiro: a largura escolhida no editor tem que vencer o width:100% da proporção */}
            <img src={d.url} alt="" loading="lazy"
              style={{ ...est, width: `${Math.min(100, Math.max(20, d.largura ?? 100))}%`, height: "auto", display: "block", borderRadius: 4, margin: "0 auto" }} />
          </div>
        );
    }

    case "duas_colunas":
      return (
        <div className={classeDuas(d)}>
          <div className="lp-duas-txt">
            {d.titulo && <h2 className="lp-pacote-nome" style={estTit}>{d.titulo}</h2>}
            {d.html && <div className="site-conteudo" style={{ fontSize: 16, lineHeight: 1.8 }} dangerouslySetInnerHTML={{ __html: d.html }} />}
          </div>
          {d.imagem_url && <img className="lp-duas-img" src={d.imagem_url} alt={d.titulo ?? ""} loading="lazy" style={estiloImagem(d)} />}
        </div>
      );

    case "pacote": {
      const estilo = d.lista_estilo ?? "bolinha";
      const valor = valorExibido(d);
      // Título em FAIXA de destaque (mesma cara do topo/hero, com imagem de fundo própria).
      // Quando ligado, o nome sai de dentro das colunas e vira o cabeçalho do bloco.
      const faixa = d.titulo_hero && d.nome ? (
        <section className="lp-hero lp-hero-faixa"
          style={{ "--lp-faixa-altura": `${d.titulo_bg_altura ?? 260}px` } as CSSProperties}>
          {d.titulo_bg_url && (
            <img className="lp-hero-bg" src={d.titulo_bg_url} alt="" loading="lazy"
              style={{ objectPosition: OBJECT_POSITION[d.titulo_bg_ancora ?? "centro"] }} />
          )}
          <div className="lp-hero-inner"><h2 style={estTit}>{d.nome}</h2></div>
        </section>
      ) : null;
      return (
        <>
          {faixa}
          <div className={classeDuas(d)}>
            <div className="lp-duas-txt">
              {!faixa && d.nome && <h2 className="lp-pacote-nome" style={estTit}>{d.nome}</h2>}
              <ItensPacote html={d.itens_html} itens={d.itens} estilo={estilo} />
              {valor && (<><div className="lp-valor-label">Valor</div><div className="lp-valor">{valor}</div></>)}
            </div>
            {d.imagem_url && <img className="lp-duas-img" src={d.imagem_url} alt={d.nome ?? ""} loading="lazy" style={estiloImagem(d)} />}
          </div>
        </>
      );
    }

    case "pacotes": {
      const lista = (d.pacotes ?? []).filter((p) => p.nome || (p.itens_html ?? "").trim() || (p.itens?.length ?? 0) > 0);
      if (lista.length === 0) return null;
      const estilo = d.lista_estilo ?? "bolinha";
      return (
        <section className="lp-secao">
          {d.titulo && <h2 className="lp-titulo" style={estTit}>{d.titulo}</h2>}
          <div className="lp-planos" style={{ "--lp-cols": Math.min(4, Math.max(1, d.colunas ?? lista.length)) } as CSSProperties}>
            {lista.map((p, i) => {
              const valor = valorExibido({ valor: p.valor, valor_prefixo: p.valor_prefixo });
              return (
                <div key={i} className={`lp-plano${p.destaque ? " destaque" : ""}`}>
                  {/* a etiqueta é o selo da coluna em destaque — sem destaque, não aparece */}
                  {p.destaque && p.etiqueta && <span className="lp-plano-etiqueta">{p.etiqueta}</span>}
                  {p.imagem_url && <img className="lp-plano-img" src={p.imagem_url} alt={p.nome} loading="lazy" style={estiloImagem(d)} />}
                  {p.nome && <h3 className="lp-plano-nome" style={estTit}>{p.nome}</h3>}
                  <ItensPacote html={p.itens_html} itens={p.itens} estilo={estilo} />
                  {valor && (<><div className="lp-valor-label">Valor</div><div className="lp-valor">{valor}</div></>)}
                </div>
              );
            })}
          </div>
        </section>
      );
    }

    case "pagamento": {
      const cond = (d.condicoes ?? []).filter((c) => c.rotulo || c.descricao);
      const intro = (d.intro_html ?? "").trim();
      if (!d.titulo && !intro && cond.length === 0) return null;
      return (
        <section className="lp-secao">
          {d.titulo && <h2 className="lp-titulo" style={estTit}>{d.titulo}</h2>}
          {intro && intro !== "<p></p>" && (
            <div className="site-conteudo lp-pgto-intro" dangerouslySetInnerHTML={{ __html: intro }} />
          )}
          {cond.length > 0 && (
            <div className="lp-pagamento">
              {cond.map((c, i) => (
                <div key={i} className="lp-pgto-linha">
                  <div className="lp-pgto-rotulo">{c.rotulo}</div>
                  <div className="lp-pgto-desc">{c.descricao}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      );
    }

    case "cards":
      return (d.cards?.length ?? 0) > 0 ? (
        <section className="lp-secao">
          {d.titulo && <h2 className="lp-titulo" style={estTit}>{d.titulo}</h2>}
          <div className="lp-casais" style={d.colunas ? ({ "--lp-cols": Math.min(6, Math.max(1, d.colunas)) } as CSSProperties) : undefined}>
            {d.cards!.map((c, i) => {
              const conteudo = (
                <>
                  {c.foto_url && <img src={c.foto_url} alt={c.nome} loading="lazy" style={estiloImagem(d)} />}
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
          {d.titulo && <h2 className="lp-titulo" style={estTit}>{d.titulo}</h2>}
          <div className="lp-galeria" style={{ "--lp-cols": Math.min(6, Math.max(1, d.colunas ?? 3)) } as CSSProperties}>
            {d.fotos!.map((f, i) => (
              <img key={i} src={f} alt="" loading="lazy" style={estiloImagem(d)} />
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
          {d.titulo && <h2 className="lp-titulo" style={estTit}>{d.titulo}</h2>}
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
          {d.titulo && <h2 className="lp-titulo" style={estTit}>{d.titulo}</h2>}
          <ContatoForm fid={ctx.fid} config={d.formulario} categorias={ctx.categorias ?? []} />
        </section>
      );

    default:
      return null;
  }
}

// Envelope de cada bloco: espaçamento e largura configurados no editor.
// Sem configuração, não gera wrapper nenhum — o bloco sai igual ao que já saía.
function Envelope({ bloco, children }: { bloco: SiteBloco; children: React.ReactNode }) {
  const { espaco_antes, espaco_depois, largura_bloco } = bloco.dados;
  const temEspaco = !!espaco_antes || !!espaco_depois;
  const pontaAPonta = largura_bloco === "total";
  if (!temEspaco && !pontaAPonta) return <>{children}</>;
  return (
    <div style={{
      paddingTop: espaco_antes || undefined,
      paddingBottom: espaco_depois || undefined,
      // "ponta a ponta": rompe a largura do conteúdo sem quebrar o fluxo da página
      ...(pontaAPonta ? { width: "100vw", marginLeft: "calc(50% - 50vw)", marginRight: "calc(50% - 50vw)" } : {}),
    }}>
      {children}
    </div>
  );
}

export function RenderBlocos({ blocos, ctx }: { blocos: SiteBloco[]; ctx: ContextoBlocos }) {
  return (
    <div>
      {blocos.map((b) => (
        <Envelope key={b.id} bloco={b}>
          <Bloco bloco={b} ctx={ctx} />
        </Envelope>
      ))}
    </div>
  );
}
