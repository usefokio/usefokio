import { IdentidadeVisual } from "../_components/IdentidadeVisual";

// Configurações › Empresa › Identidade visual (antes: aba das Configurações do UseFokio).
export default function IdentidadeVisualPage() {
  return (
    <div style={{ padding: "26px 30px", maxWidth: 760 }}>
      <h1 style={{ fontSize: 19, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 3px", letterSpacing: "-0.02em" }}>Identidade visual</h1>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 22px" }}>Logo e marca d&apos;água do estúdio</p>
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "24px 28px" }}>
        <IdentidadeVisual />
      </div>
    </div>
  );
}
