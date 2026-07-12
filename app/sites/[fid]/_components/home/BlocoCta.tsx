// Bloco "Chamada (orçamento)" — a CTA de fechamento da home, agora como bloco
// (liga/desliga + reordenável). Título, subtítulo e texto do botão são editáveis.
import Link from "next/link";
import type { HomeBloco } from "@/lib/site/design";

export function BlocoCta({ config, base }: { config: HomeBloco; base: string }) {
  const titulo = config.cta_titulo || "Vamos registrar a sua história?";
  const subtitulo = config.cta_subtitulo;
  const botao = config.cta_botao || "Solicitar orçamento";
  return (
    <section style={{ background: "var(--site-contraste)", color: "var(--site-contraste-texto)", textAlign: "center", padding: "72px 24px" }}>
      <h2 style={{ fontSize: 32, margin: "0 0 12px", color: "var(--site-contraste-texto)", fontFamily: "var(--site-fonte-titulo), Georgia, serif" }}>{titulo}</h2>
      {subtitulo && <p style={{ fontSize: 16, color: "color-mix(in srgb, var(--site-contraste-texto) 75%, transparent)", margin: "0 0 30px", fontFamily: "var(--site-fonte-corpo), Georgia, serif" }}>{subtitulo}</p>}
      <Link href={`${base}/contato`} style={{ display: "inline-block", padding: "14px 42px", border: "1px solid var(--site-contraste-texto)", color: "var(--site-contraste-texto)", fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase", textDecoration: "none" }}>
        {botao}
      </Link>
    </section>
  );
}
