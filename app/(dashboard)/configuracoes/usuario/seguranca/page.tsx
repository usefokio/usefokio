import { AlterarSenha } from "../_components/AlterarSenha";

export default function SegurancaPage() {
  return (
    <div style={{ padding: "26px 30px", maxWidth: 680 }}>
      <h1 style={{ fontSize: 19, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 3px", letterSpacing: "-0.02em" }}>Segurança</h1>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 22px" }}>Senha de acesso ao sistema</p>
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "24px 28px" }}>
        <AlterarSenha />
      </div>
    </div>
  );
}
