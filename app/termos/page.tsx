import Link from "next/link";

export const metadata = { title: "Termos de Uso — UseFokio" };

const S = {
  page:    { minHeight: "100vh", background: "var(--color-background-tertiary)", fontFamily: "var(--font-sans)" } as React.CSSProperties,
  nav:     { background: "var(--color-background-primary)", borderBottom: "0.5px solid var(--color-border-tertiary)", padding: "0 32px", height: 54, display: "flex", alignItems: "center" } as React.CSSProperties,
  wrap:    { maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" } as React.CSSProperties,
  card:    { background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "36px 40px" } as React.CSSProperties,
  h1:      { fontSize: 26, fontWeight: 800, color: "var(--color-text-primary)", margin: "0 0 6px", letterSpacing: "-0.03em" } as React.CSSProperties,
  meta:    { fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 36px" } as React.CSSProperties,
  h2:      { fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", margin: "32px 0 10px" } as React.CSSProperties,
  p:       { fontSize: 14, color: "var(--color-text-primary)", lineHeight: 1.7, margin: "0 0 12px" } as React.CSSProperties,
  ul:      { fontSize: 14, color: "var(--color-text-primary)", lineHeight: 1.7, margin: "0 0 12px", paddingLeft: 20 } as React.CSSProperties,
  divider: { height: "0.5px", background: "var(--color-border-tertiary)", margin: "32px 0" } as React.CSSProperties,
};

export default function TermosPage() {
  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <Link href="/landing" style={{ textDecoration: "none" }}>
          <img src="/usefokio-logo.svg" alt="UseFokio" style={{ height: 24, width: "auto", display: "block" }} />
        </Link>
      </nav>

      <div style={S.wrap}>
        <div style={S.card}>
          <h1 style={S.h1}>Termos de Uso</h1>
          <p style={S.meta}>Versão Beta (beta-v1) — vigente a partir de 15 de junho de 2026</p>

          <h2 style={S.h2}>1. Aceitação</h2>
          <p style={S.p}>Ao criar uma conta, você declara que leu, entendeu e concorda com estes Termos de Uso. Se não concordar, não utilize o sistema.</p>

          <h2 style={S.h2}>2. O que é este serviço</h2>
          <p style={S.p}>O UseFokio é uma plataforma em fase Beta que permite a fotógrafos criar galerias digitais para seleção e entrega de fotos a seus clientes.</p>

          <h2 style={S.h2}>3. Fase Beta — limitações e alterações</h2>
          <p style={S.p}>O sistema está em fase Beta. Isso significa que:</p>
          <ul style={S.ul}>
            <li>Funcionalidades podem ser alteradas, adicionadas ou removidas sem aviso prévio</li>
            <li>O modelo de cobrança e os planos disponíveis podem mudar durante esta fase</li>
            <li>Podem ocorrer instabilidades ou interrupções no serviço</li>
            <li>Ao continuar usando o sistema após qualquer alteração, você automaticamente aceita os novos termos</li>
          </ul>

          <h2 style={S.h2}>4. Responsabilidades do fotógrafo</h2>
          <p style={S.p}>Você é o único responsável por:</p>
          <ul style={S.ul}>
            <li>Todo o conteúdo enviado ao sistema, incluindo fotos e informações de clientes</li>
            <li>Obter autorização de uso de imagem das pessoas fotografadas, quando necessário</li>
            <li>Manter a confidencialidade do seu acesso (login e senha)</li>
            <li>Garantir que os dados dos seus clientes sejam coletados e utilizados de forma legal</li>
          </ul>

          <h2 style={S.h2}>5. Responsabilidades do UseFokio</h2>
          <p style={S.p}>O UseFokio se compromete a:</p>
          <ul style={S.ul}>
            <li>Manter os dados armazenados com segurança</li>
            <li>Não compartilhar suas informações com terceiros sem seu consentimento, exceto quando exigido por lei</li>
            <li>Comunicar alterações relevantes nos termos por email cadastrado</li>
          </ul>

          <h2 style={S.h2}>6. O que o UseFokio não se responsabiliza</h2>
          <ul style={S.ul}>
            <li>Perda de dados causada por falhas de terceiros (servidores, provedores de internet)</li>
            <li>Uso indevido do sistema por parte do fotógrafo ou de seus clientes</li>
            <li>Conteúdo das fotos enviadas pelos fotógrafos</li>
            <li>Links externos fornecidos pelos fotógrafos (ex: links do Google Drive na galeria de entrega)</li>
          </ul>

          <h2 style={S.h2}>7. Pagamentos</h2>
          <ul style={S.ul}>
            <li>Os pagamentos de renovação de acesso à galeria de entrega são processados diretamente na conta do fotógrafo</li>
            <li>O UseFokio não intermedia nem armazena dados de pagamento</li>
            <li>As condições de cobrança podem ser alteradas durante a fase Beta mediante comunicação prévia</li>
          </ul>

          <h2 style={S.h2}>8. Encerramento de conta</h2>
          <p style={S.p}>Você pode solicitar o encerramento da sua conta a qualquer momento pelo email <a href="mailto:contato@usefokio.com.br" style={{ color: "#2563EB" }}>contato@usefokio.com.br</a>. Seus dados serão removidos em até 30 dias.</p>
          <p style={S.p}>O UseFokio pode suspender ou encerrar contas que violem estes termos.</p>

          <h2 style={S.h2}>9. Lei aplicável</h2>
          <p style={S.p}>Estes termos são regidos pelas leis brasileiras. Fica eleito o foro da comarca de São Paulo para resolução de conflitos.</p>

          <div style={S.divider} />
          <p style={{ ...S.p, fontSize: 12, color: "var(--color-text-secondary)" }}>
            Dúvidas? Entre em contato: <a href="mailto:contato@usefokio.com.br" style={{ color: "#2563EB" }}>contato@usefokio.com.br</a>
          </p>
          <div style={{ marginTop: 20, display: "flex", gap: 16 }}>
            <Link href="/privacidade" style={{ fontSize: 13, color: "#2563EB", textDecoration: "none" }}>Política de Privacidade →</Link>
            <Link href="/landing" style={{ fontSize: 13, color: "var(--color-text-secondary)", textDecoration: "none" }}>← Voltar ao início</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
