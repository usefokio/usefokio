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
      style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "13px 26px", borderRadius: 999, background: "#25D366", color: "#fff", fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
      <span style={{ fontSize: 18 }}>💬</span>{cfg.whatsapp_texto || "Chamar no WhatsApp"}
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
