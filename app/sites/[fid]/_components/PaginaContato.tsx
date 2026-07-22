// Página de CONTATO — 3 modelos fixos (padrão da Aparência da home): o mesmo componente
// renderiza o site público e a prévia ao vivo do editor. O H1 e os canais são a moldura
// fixa da página (SEO); o modelo define a disposição de foto/texto/formulário.
import { OBJECT_POSITION, ASPECT } from "@/lib/site/design";
import type { CfgContato } from "@/lib/site/paginaCfg";
import { ContatoForm } from "./ContatoForm";

export type CanalContato = { icon: string; label: string; href: string; texto: string };

const h1Style: React.CSSProperties = {
  fontFamily: "var(--site-fonte-titulo), Georgia, serif", fontSize: 32,
  color: "var(--site-titulo)", margin: "0 0 14px", lineHeight: 1.15,
};

function Canais({ canais, claro }: { canais: CanalContato[]; claro?: boolean }) {
  if (canais.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 22px", marginBottom: 22, justifyContent: "inherit" }}>
      {canais.map((c) => (
        <a key={c.label} href={c.href} target="_blank" rel="noopener noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 7, textDecoration: "none", color: claro ? "rgba(255,255,255,0.92)" : "var(--site-texto)", fontSize: 14 }}>
          <span style={{ fontSize: 16 }}>{c.icon}</span>{c.texto}
        </a>
      ))}
    </div>
  );
}

export function PaginaContato({ cfg, titulo, canais, fid, categorias }: {
  cfg: CfgContato; titulo: string; canais: CanalContato[]; fid: string;
  categorias: { valor: string; label: string }[];
}) {
  const objPos = OBJECT_POSITION[cfg.ancora]; // alinhamento do recorte das imagens
  const form = <ContatoForm fid={fid} config={cfg.formulario} categorias={categorias} />;
  const textoEl = cfg.html
    ? <div className="site-conteudo" style={{ fontSize: 15, color: "var(--site-suave)", lineHeight: 1.8, margin: "0 0 20px" }} dangerouslySetInnerHTML={{ __html: cfg.html }} />
    : null;

  // Botão dedicado de WhatsApp (usa o WhatsApp do cadastro, o mesmo do canal "WhatsApp").
  const whatsHref = canais.find((c) => c.label === "WhatsApp")?.href ?? null;
  const botaoWhats = cfg.whatsapp_ativo && whatsHref ? (
    <a href={whatsHref} target="_blank" rel="noopener noreferrer"
      style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "12px 28px", border: "1px solid var(--site-titulo)", color: "var(--site-titulo)", fontFamily: "var(--site-fonte-corpo), Georgia, serif", fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", textDecoration: "none" }}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden style={{ flexShrink: 0 }}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
      {cfg.whatsapp_texto || "Chamar no WhatsApp"}
    </a>
  ) : null;

  // ── Banner de fundo: título + texto + formulário sobrepostos à imagem ──
  if (cfg.layout === "banner_fundo") {
    return (
      <>
        <section className="lp-hero" style={{ minHeight: "88vh" }}>
          {cfg.banner && <img className="lp-hero-bg" src={cfg.banner} alt="" style={{ objectPosition: objPos }} />}
          <div className="lp-hero-inner">
            <h1>{titulo}</h1>
            {cfg.html && <div className="lp-hero-texto site-conteudo" dangerouslySetInnerHTML={{ __html: cfg.html }} />}
            <div className="lp-hero-form">{form}</div>
          </div>
        </section>
        {(canais.length > 0 || botaoWhats) && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "26px 24px 0" }}>
            {botaoWhats}
            <Canais canais={canais} />
          </div>
        )}
      </>
    );
  }

  // ── Minimalista: só o formulário + pequeno texto opcional (coluna única centrada) ──
  if (cfg.layout === "minimalista") {
    return (
      <div className="site-contato-solo">
        <h1 style={h1Style}>{titulo}</h1>
        {textoEl ?? (
          <p style={{ fontSize: 15, color: "var(--site-suave)", lineHeight: 1.8, margin: "0 0 20px" }}>
            Conte um pouco sobre o seu evento — data, cidade e o que você está planejando. Retorno o mais rápido possível!
          </p>
        )}
        <Canais canais={canais} />
        {botaoWhats && <div style={{ margin: "0 0 18px" }}>{botaoWhats}</div>}
        {form}
      </div>
    );
  }

  // ── Duas colunas: banner opcional no topo; esquerda foto + biografia; direita o formulário ──
  return (
    <>
      {cfg.banner && (
        <div style={{ height: "38vh", maxHeight: 420, overflow: "hidden", background: "var(--site-superficie)" }}>
          <img src={cfg.banner} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: objPos, display: "block" }} />
        </div>
      )}
      <div className="site-contato">
        <div>
          <h1 style={h1Style}>{titulo}</h1>
          <Canais canais={canais} />
          {botaoWhats && <div style={{ margin: "0 0 20px" }}>{botaoWhats}</div>}
          {cfg.foto && <img src={cfg.foto} alt="" style={{ width: "100%", aspectRatio: ASPECT[cfg.proporcao], objectFit: "cover", objectPosition: objPos, borderRadius: 12, display: "block", margin: "0 0 18px" }} />}
          {textoEl}
        </div>
        <div>{form}</div>
      </div>
    </>
  );
}
