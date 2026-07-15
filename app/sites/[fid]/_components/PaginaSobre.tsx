// Página SOBRE — 3 modelos fixos (padrão da Aparência da home): o mesmo componente
// renderiza o site público e a prévia ao vivo do editor. O H1 é fixo (SEO).
import type { CfgSobre } from "@/lib/site/paginaCfg";

const h1Central: React.CSSProperties = { fontSize: 28, fontWeight: 700, textAlign: "center", margin: "0 0 32px" };

export function PaginaSobre({ cfg, titulo }: { cfg: CfgSobre; titulo: string }) {
  const html = cfg.html ?? "<p>Em breve.</p>";

  // ── Foto de fundo: título + texto sobrepostos à imagem ──
  if (cfg.layout === "foto_fundo") {
    return (
      <section className="lp-hero" style={{ minHeight: "82vh" }}>
        {cfg.fundo && <img className="lp-hero-bg" src={cfg.fundo} alt="" />}
        <div className="lp-hero-inner">
          <h1>{titulo}</h1>
          <div className="lp-hero-texto site-conteudo" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </section>
    );
  }

  // ── Minimalista: texto centrado, foto opcional abaixo ──
  if (cfg.layout === "minimalista") {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px" }}>
        <h1 style={h1Central}>{titulo}</h1>
        <div className="site-conteudo" style={{ fontSize: 15, lineHeight: 1.9, color: "#333" }} dangerouslySetInnerHTML={{ __html: html }} />
        {cfg.foto && <img src={cfg.foto} alt={titulo} style={{ width: "100%", maxWidth: cfg.foto_largura, borderRadius: 12, display: "block", margin: "28px auto 0" }} />}
      </div>
    );
  }

  // ── Foto + biografia (2 colunas — layout clássico) ──
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={h1Central}>{titulo}</h1>
      <div style={{ display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>
        {cfg.foto && <img src={cfg.foto} alt={titulo} style={{ width: cfg.foto_largura, maxWidth: "100%", borderRadius: 12, display: "block" }} />}
        <div className="site-conteudo" style={{ flex: 1, minWidth: 280, fontSize: 15, lineHeight: 1.9, color: "#333" }}
          dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
