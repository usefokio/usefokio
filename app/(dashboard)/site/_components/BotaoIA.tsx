"use client";

// Botão "✨ Melhorar com IA" + painel do Assistente de SEO — POR ORA É UM STUB:
// explica o que a IA fará, mas a geração está desabilitada ("em breve"). O contrato
// da chamada já está definido em /api/ia/seo (retorna 501) para plugarmos o provedor depois.
import { useState } from "react";

export type ContextoIA = {
  tipo: "titulo" | "descricao" | "keywords" | "alt" | "texto" | "sobre";
  entidade: "trabalho" | "post" | "pagina" | "colecao" | "site";
  // campos atuais do conteúdo (título, texto, local, categoria…) que a IA usará de base
  campos?: Record<string, string | null | undefined>;
};

const ITENS = [
  { icone: "🏷️", txt: "Gerar título e descrição de busca a partir do conteúdo da página" },
  { icone: "🔑", txt: "Sugerir palavras-chave com base no seu nicho e na sua cidade" },
  { icone: "🖼️", txt: "Escrever legendas (alt) para as fotos automaticamente" },
  { icone: "📝", txt: "Melhorar/expandir o texto da página mantendo o seu tom" },
];

export function BotaoIA({ contexto, compacto }: { contexto?: ContextoIA; compacto?: boolean }) {
  const [aberto, setAberto] = useState(false);
  void contexto; // usado quando a geração for ativada

  return (
    <>
      <button onClick={() => setAberto(true)} title="Assistente de SEO com IA"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: compacto ? "6px 12px" : "8px 16px", borderRadius: 8, border: "1px solid rgba(124,58,237,0.35)", background: "rgba(124,58,237,0.08)", color: "#7C3AED", fontSize: compacto ? 11 : 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
        ✨ Melhorar com IA
      </button>

      {aberto && (
        <div onClick={() => setAberto(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", borderRadius: 14, width: "100%", maxWidth: 460, padding: "26px 28px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>✨</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 4 }}>Assistente de SEO</div>
            <p style={{ fontSize: 12.5, color: "var(--color-text-secondary)", lineHeight: 1.6, margin: "0 0 16px" }}>
              O assistente vai usar o seu <strong>briefing</strong> (nicho, cidade, estilo) e o conteúdo desta página para:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
              {ITENS.map((i) => (
                <div key={i.txt} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12.5, color: "var(--color-text-primary)", lineHeight: 1.5 }}>
                  <span style={{ flexShrink: 0 }}>{i.icone}</span>{i.txt}
                </div>
              ))}
            </div>
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(245,158,11,0.12)", fontSize: 12, color: "#B45309", fontWeight: 600, marginBottom: 16 }}>
              🚧 Em breve — esta função está em desenvolvimento.
            </div>
            <button onClick={() => setAberto(false)} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
