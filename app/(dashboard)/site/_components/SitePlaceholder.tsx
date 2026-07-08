// Placeholder das seções do módulo Site (esqueleto da Fase 1).
export function SitePlaceholder({ titulo, descricao }: { titulo: string; descricao?: string }) {
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: "0 0 6px", letterSpacing: "-0.02em" }}>{titulo}</h1>
      {descricao && (
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: "0 0 24px", lineHeight: 1.6 }}>{descricao}</p>
      )}
      <div style={{ padding: "32px 24px", borderRadius: 14, border: "1px dashed var(--color-border-secondary)", background: "var(--color-background-secondary)", textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>🚧</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>Em construção</div>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>Esta seção do Site será implementada na Fase 1.</div>
      </div>
    </div>
  );
}
