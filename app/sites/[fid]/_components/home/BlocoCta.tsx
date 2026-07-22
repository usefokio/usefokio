// Bloco "Chamada (orçamento)" — a CTA de fechamento da home, agora como bloco
// (liga/desliga + reordenável). Título, subtítulo e texto do botão são editáveis.
import Link from "next/link";
import type { HomeBloco } from "@/lib/site/design";

export function BlocoCta({ config, base }: { config: HomeBloco; base: string }) {
  const titulo = config.cta_titulo || "Vamos registrar a sua história?";
  const subtitulo = config.cta_subtitulo;
  const botao = config.cta_botao || "Solicitar orçamento";
  const padV = config.cta_padding ?? 72;                 // espaçamento vertical do bloco
  const esc = (config.cta_escala ?? 100) / 100;          // escala do texto/botão
  const px = (n: number) => Math.round(n * esc);
  return (
    <section style={{ background: "var(--site-contraste)", color: "var(--site-contraste-texto)", textAlign: "center", padding: `${padV}px 24px` }}>
      <h2 style={{ fontSize: px(32), margin: `0 0 ${px(12)}px`, color: "var(--site-contraste-texto)", fontFamily: "var(--site-fonte-titulo), Georgia, serif" }}>{titulo}</h2>
      {subtitulo && <p style={{ fontSize: px(16), color: "color-mix(in srgb, var(--site-contraste-texto) 75%, transparent)", margin: `0 0 ${px(30)}px`, fontFamily: "var(--site-fonte-corpo), Georgia, serif" }}>{subtitulo}</p>}
      <Link href={`${base}/contato`} style={{ display: "inline-block", padding: `${px(14)}px ${px(42)}px`, border: "1px solid var(--site-contraste-texto)", color: "var(--site-contraste-texto)", fontSize: px(13), letterSpacing: "0.14em", textTransform: "uppercase", textDecoration: "none" }}>
        {botao}
      </Link>
    </section>
  );
}
