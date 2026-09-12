import { ConfigEmail } from "../_components/ServidorEmail";

// Configurações › Empresa › Servidor de e-mail (antes: aba das Configurações do UseFokio).
export default function ServidorEmailPage() {
  return (
    <div style={{ padding: "26px 30px", maxWidth: 760 }}>
      <h1 style={{ fontSize: 19, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 3px", letterSpacing: "-0.02em" }}>Servidor de e-mail</h1>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 22px" }}>E-mail próprio do estúdio para enviar mensagens aos clientes</p>
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "24px 28px" }}>
        <ConfigEmail />
      </div>
    </div>
  );
}
