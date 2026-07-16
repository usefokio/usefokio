// Página SOBRE — 3 modelos fixos (padrão da Aparência da home): o mesmo componente
// renderiza o site público e a prévia ao vivo do editor. O H1 é fixo (SEO).
import Link from "next/link";
import { OBJECT_POSITION } from "@/lib/site/design";
import type { CfgSobre } from "@/lib/site/paginaCfg";

const h1Central: React.CSSProperties = { fontSize: 28, fontWeight: 700, textAlign: "center", margin: "0 0 32px" };

// Botão de contato no fim da página — mesmo estilo do CTA da home (home/BlocoCta.tsx).
function CtaContato({ cfg, base }: { cfg: CfgSobre; base: string }) {
  if (!cfg.cta_ativo) return null;
  return (
    <div style={{ textAlign: "center", padding: "44px 24px 8px" }}>
      <Link href={`${base}/contato`} style={{ display: "inline-block", padding: "14px 42px", border: "1px solid currentColor", color: "inherit", fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase", textDecoration: "none" }}>
        {cfg.cta_botao}
      </Link>
    </div>
  );
}

export function PaginaSobre({ cfg, titulo, base }: { cfg: CfgSobre; titulo: string; base: string }) {
  const html = cfg.html ?? "<p>Em breve.</p>";
  const objPos = OBJECT_POSITION[cfg.ancora]; // alinhamento do recorte da foto

  // ── Foto de fundo: título + texto sobrepostos à imagem ──
  if (cfg.layout === "foto_fundo") {
    return (
      <section className="lp-hero" style={{ minHeight: "82vh" }}>
        {cfg.fundo && <img className="lp-hero-bg" src={cfg.fundo} alt="" style={{ objectPosition: objPos }} />}
        <div className="lp-hero-inner">
          <h1>{titulo}</h1>
          <div className="lp-hero-texto site-conteudo" dangerouslySetInnerHTML={{ __html: html }} />
          <CtaContato cfg={cfg} base={base} />
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
        <CtaContato cfg={cfg} base={base} />
      </div>
    );
  }

  // ── Foto + biografia (2 colunas): a foto recorta em retrato (aspectRatio) para o
  // alinhamento (âncora) ter efeito — a parte visível segue a âncora (vertical ou horizontal). ──
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={h1Central}>{titulo}</h1>
      <div style={{ display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>
        {cfg.foto && <img src={cfg.foto} alt={titulo} style={{ width: cfg.foto_largura, maxWidth: "100%", aspectRatio: "3 / 4", objectFit: "cover", objectPosition: objPos, borderRadius: 12, display: "block" }} />}
        <div className="site-conteudo" style={{ flex: 1, minWidth: 280, fontSize: 15, lineHeight: 1.9, color: "#333" }}
          dangerouslySetInnerHTML={{ __html: html }} />
      </div>
      <CtaContato cfg={cfg} base={base} />
    </div>
  );
}
