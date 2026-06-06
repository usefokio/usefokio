import Link from "next/link";

export default function ConfirmarEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background-tertiary)", fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>

        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(37,99,235,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 20px" }}>
          📧
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: "0 0 10px", letterSpacing: "-0.03em" }}>
          Confirme seu email
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.6, margin: "0 0 28px" }}>
          Enviamos um link de confirmação para o seu email.<br />
          Clique no link para ativar sua conta e começar a usar o UseFokio.
        </p>

        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "16px 20px", marginBottom: 24, fontSize: 13, color: "var(--color-text-secondary)" }}>
          Não recebeu o email? Verifique a pasta de <strong>spam</strong> ou{" "}
          <a href="#" style={{ color: "#2563EB", textDecoration: "none", fontWeight: 500 }}>clique aqui para reenviar</a>.
        </div>

        <Link
          href="/login"
          style={{ display: "inline-block", padding: "10px 28px", borderRadius: 8, background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
        >
          Ir para o login
        </Link>
      </div>
    </div>
  );
}
