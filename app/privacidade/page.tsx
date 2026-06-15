import Link from "next/link";

export const metadata = { title: "Política de Privacidade — UseFokio" };

const S = {
  page:    { minHeight: "100vh", background: "var(--color-background-tertiary)", fontFamily: "var(--font-sans)" } as React.CSSProperties,
  nav:     { background: "var(--color-background-primary)", borderBottom: "0.5px solid var(--color-border-tertiary)", padding: "0 32px", height: 54, display: "flex", alignItems: "center" } as React.CSSProperties,
  wrap:    { maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" } as React.CSSProperties,
  card:    { background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "36px 40px" } as React.CSSProperties,
  h1:      { fontSize: 26, fontWeight: 800, color: "var(--color-text-primary)", margin: "0 0 6px", letterSpacing: "-0.03em" } as React.CSSProperties,
  meta:    { fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 36px" } as React.CSSProperties,
  h2:      { fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", margin: "32px 0 10px" } as React.CSSProperties,
  h3:      { fontSize: 13, fontWeight: 700, color: "var(--color-text-secondary)", margin: "16px 0 6px", textTransform: "uppercase" as const, letterSpacing: "0.05em" },
  p:       { fontSize: 14, color: "var(--color-text-primary)", lineHeight: 1.7, margin: "0 0 12px" } as React.CSSProperties,
  ul:      { fontSize: 14, color: "var(--color-text-primary)", lineHeight: 1.7, margin: "0 0 12px", paddingLeft: 20 } as React.CSSProperties,
  divider: { height: "0.5px", background: "var(--color-border-tertiary)", margin: "32px 0" } as React.CSSProperties,
};

export default function PrivacidadePage() {
  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <Link href="/landing" style={{ textDecoration: "none" }}>
          <img src="/usefokio-logo.svg" alt="UseFokio" style={{ height: 24, width: "auto", display: "block" }} />
        </Link>
      </nav>

      <div style={S.wrap}>
        <div style={S.card}>
          <h1 style={S.h1}>Política de Privacidade</h1>
          <p style={S.meta}>Versão Beta (beta-v1) — vigente a partir de 15 de junho de 2026</p>

          <h2 style={S.h2}>1. Quais dados coletamos</h2>
          <h3 style={S.h3}>Do fotógrafo (usuário cadastrado)</h3>
          <ul style={S.ul}>
            <li>Nome e endereço de email</li>
            <li>Dados de acesso (login)</li>
            <li>Fotos enviadas ao sistema</li>
            <li>Configurações de galerias e planos</li>
          </ul>
          <h3 style={S.h3}>Do cliente do fotógrafo (acesso à galeria)</h3>
          <ul style={S.ul}>
            <li>Nome e email informados na página de acesso</li>
            <li>Data e hora do acesso</li>
            <li>Fotos selecionadas na galeria</li>
          </ul>

          <h2 style={S.h2}>2. Para que usamos esses dados</h2>
          <ul style={S.ul}>
            <li>Identificar e autenticar o usuário</li>
            <li>Operar as funcionalidades do sistema</li>
            <li>Enviar emails transacionais (confirmação de cadastro, recuperação de senha, notificações de seleção)</li>
            <li>Melhorar o sistema durante a fase Beta</li>
          </ul>

          <h2 style={S.h2}>3. Com quem compartilhamos</h2>
          <p style={S.p}>Seus dados podem ser processados pelos seguintes serviços terceiros, exclusivamente para operação do sistema:</p>
          <ul style={S.ul}>
            <li><strong>Supabase</strong> — banco de dados e autenticação</li>
            <li><strong>Vercel</strong> — hospedagem</li>
            <li><strong>Cloudflare</strong> — armazenamento de arquivos</li>
            <li><strong>Resend</strong> — envio de emails</li>
          </ul>
          <p style={S.p}>Não vendemos nem compartilhamos seus dados com terceiros para fins comerciais.</p>

          <h2 style={S.h2}>4. Por quanto tempo guardamos</h2>
          <ul style={S.ul}>
            <li>Dados de conta: enquanto a conta estiver ativa</li>
            <li>Fotos de galerias excluídas: removidas imediatamente e de forma irreversível no momento da exclusão</li>
            <li>Dados de clientes (nome/email de acesso): mantidos enquanto a galeria existir</li>
          </ul>

          <h2 style={S.h2}>5. Seus direitos (LGPD)</h2>
          <p style={S.p}>Você tem direito a:</p>
          <ul style={S.ul}>
            <li>Acessar seus dados</li>
            <li>Corrigir dados incorretos</li>
            <li>Solicitar a exclusão dos seus dados</li>
            <li>Revogar o consentimento</li>
          </ul>
          <p style={S.p}>Para exercer qualquer direito, entre em contato pelo email: <a href="mailto:contato@usefokio.com.br" style={{ color: "#2563EB" }}>contato@usefokio.com.br</a></p>

          <h2 style={S.h2}>6. Cookies</h2>
          <p style={S.p}>O sistema utiliza cookies essenciais para manter sua sessão ativa. Não utilizamos cookies de rastreamento ou publicidade.</p>

          <h2 style={S.h2}>7. Segurança</h2>
          <p style={S.p}>Os dados são armazenados com criptografia e boas práticas de segurança. Em caso de incidente de segurança, você será notificado por email.</p>

          <div style={S.divider} />
          <p style={{ ...S.p, fontSize: 12, color: "var(--color-text-secondary)" }}>
            Dúvidas? Entre em contato: <a href="mailto:contato@usefokio.com.br" style={{ color: "#2563EB" }}>contato@usefokio.com.br</a>
          </p>
          <div style={{ marginTop: 20, display: "flex", gap: 16 }}>
            <Link href="/termos" style={{ fontSize: 13, color: "#2563EB", textDecoration: "none" }}>Termos de Uso →</Link>
            <Link href="/landing" style={{ fontSize: 13, color: "var(--color-text-secondary)", textDecoration: "none" }}>← Voltar ao início</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
