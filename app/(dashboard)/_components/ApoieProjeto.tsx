"use client";

// Bloco do dashboard: convite para outros fotógrafos e Instagram do UseFokio.
import { useState } from "react";

const INSTAGRAM_URL = "https://www.instagram.com/usefokio/";
const SITE_URL      = "https://www.usefokio.com.br";
const CONVITE_TEXTO =
  "Conheci uma plataforma pra fotógrafos que junta galeria de entrega, seleção de fotos e CRM num lugar só — o UseFokio. Dá uma olhada:";

const card: React.CSSProperties = {
  background: "var(--color-background-primary)",
  border: "0.5px solid var(--color-border-tertiary)",
  borderRadius: 10,
  padding: "18px 20px",
};

const secaoTitulo: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--color-text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

export function ApoieProjeto() {
  const [copiado, setCopiado] = useState(false);

  const conviteCompleto = `${CONVITE_TEXTO} ${SITE_URL}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(conviteCompleto)}`;

  async function copiarConvite() {
    try {
      await navigator.clipboard.writeText(conviteCompleto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch { /* clipboard indisponível */ }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
      {/* Convite + Instagram */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {/* Convide um amigo */}
        <div style={{ ...card, flex: "1 1 260px", display: "flex", flexDirection: "column" }}>
          <div style={{ ...secaoTitulo, marginBottom: 6 }}>🤝 Convide um amigo</div>
          <p style={{ fontSize: 12.5, color: "var(--color-text-secondary)", lineHeight: 1.6, margin: "0 0 14px", flex: 1 }}>
            Conhece outro fotógrafo? Compartilhe o UseFokio e ajude o projeto a crescer.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={copiarConvite}
              style={{ padding: "8px 16px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: copiado ? "rgba(16,185,129,0.10)" : "var(--color-background-secondary)", color: copiado ? "#059669" : "var(--color-text-primary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              {copiado ? "✓ Link copiado" : "🔗 Copiar convite"}
            </button>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#25D366", color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              Enviar no WhatsApp
            </a>
          </div>
        </div>

        {/* Instagram */}
        <div style={{ ...card, flex: "1 1 260px", display: "flex", flexDirection: "column" }}>
          <div style={{ ...secaoTitulo, marginBottom: 6 }}>📸 Acompanhe o UseFokio</div>
          <p style={{ fontSize: 12.5, color: "var(--color-text-secondary)", lineHeight: 1.6, margin: "0 0 14px", flex: 1 }}>
            Siga no Instagram para novidades, dicas e bastidores do desenvolvimento.
          </p>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "9px 18px", borderRadius: 9, border: "none",
              background: "linear-gradient(45deg, #F58529, #DD2A7B, #8134AF)",
              color: "#fff", fontSize: 12.5, fontWeight: 700, textDecoration: "none",
              display: "inline-flex", alignItems: "center", gap: 7, width: "fit-content",
            }}
          >
            Seguir no Instagram
          </a>
        </div>
      </div>
    </div>
  );
}
