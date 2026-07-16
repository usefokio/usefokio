"use client";

// Modal "Preencher com ajuda de IA" — mostra o passo a passo e o prompt de entrevista pronto para
// copiar. O fotógrafo cola numa IA de preferência (ChatGPT/Gemini/Claude), é entrevistado, e volta
// para colar as respostas campo a campo. Nenhuma API é chamada daqui.
// Overlay/passos no padrão de TutorialDominioModal; textarea+copiar no padrão de ModalEnviarAcesso.
import { useState } from "react";

const h3: React.CSSProperties = { fontSize: 13, fontWeight: 800, color: "var(--color-text-primary)", margin: "18px 0 8px" };
const p: React.CSSProperties = { fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.7, margin: "0 0 8px" };
const passo: React.CSSProperties = { display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 };
const num: React.CSSProperties = { flex: "0 0 auto", width: 20, height: 20, borderRadius: "50%", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 };

function Passo({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div style={passo}>
      <span style={num}>{n}</span>
      <div style={{ ...p, margin: 0, flex: 1 }}>{children}</div>
    </div>
  );
}

const IAS = [
  { nome: "ChatGPT", url: "https://chatgpt.com" },
  { nome: "Gemini", url: "https://gemini.google.com" },
  { nome: "Claude", url: "https://claude.ai" },
];

export function ModalPromptIA({ prompt, onFechar }: { prompt: string; onFechar: () => void }) {
  const [copiado, setCopiado] = useState(false);

  function copiar() {
    navigator.clipboard?.writeText(prompt);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div onClick={onFechar} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", borderRadius: 14, width: "100%", maxWidth: 680, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--color-border-tertiary)" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--color-text-primary)" }}>Preencher com ajuda de uma IA</div>
          <button onClick={onFechar} aria-label="Fechar" style={{ border: "none", background: "transparent", fontSize: 20, color: "var(--color-text-secondary)", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: "16px 20px 22px", overflowY: "auto" }}>
          <p style={p}>
            Não precisa escrever nada do zero: uma IA pode <strong>te entrevistar</strong> e devolver os campos prontos.
            Funciona com a IA que você já usa — inclusive nas versões gratuitas. É só copiar e colar.
          </p>

          <h3 style={h3}>Como fazer</h3>
          <Passo n={1}>Clique em <strong>Copiar prompt</strong> aqui embaixo.</Passo>
          <Passo n={2}>
            Abra a IA da sua preferência —{" "}
            {IAS.map((ia, i) => (
              <span key={ia.nome}>
                <a href={ia.url} target="_blank" rel="noopener noreferrer" style={{ color: "#2563EB", fontWeight: 700 }}>{ia.nome}</a>
                {i < IAS.length - 1 ? " · " : ""}
              </span>
            ))}
            {" "}— cole o prompt e envie.
          </Passo>
          <Passo n={3}>Responda às perguntas. Ela pergunta uma coisa de cada vez e leva uns 10 minutos. Responda do seu jeito, sem se preocupar com a escrita.</Passo>
          <Passo n={4}>No fim, ela entrega os <strong>8 campos prontos</strong>, cada um com o nome do campo. Volte aqui e cole cada resposta no campo de mesmo nome.</Passo>
          <Passo n={5}>Leia, ajuste o que quiser e clique em <strong>Salvar</strong>. Nada é salvo automaticamente.</Passo>

          <h3 style={h3}>O prompt</h3>
          <textarea
            readOnly
            value={prompt}
            rows={12}
            onFocus={(e) => e.currentTarget.select()}
            style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", fontSize: 12, color: "var(--color-text-primary)", resize: "vertical", lineHeight: 1.6, fontFamily: "var(--font-mono)", outline: "none" }}
          />
          <button
            onClick={copiar}
            style={{ width: "100%", marginTop: 10, padding: "11px", borderRadius: 8, cursor: "pointer", transition: "all 0.15s", fontSize: 13, fontWeight: 700, background: copiado ? "rgba(5,150,105,0.1)" : "var(--color-text-primary)", border: `0.5px solid ${copiado ? "rgba(5,150,105,0.4)" : "var(--color-text-primary)"}`, color: copiado ? "#059669" : "var(--color-background-primary)" }}>
            {copiado ? "✓ Copiado!" : "Copiar prompt"}
          </button>
          <p style={{ ...p, fontSize: 11.5, marginTop: 10 }}>
            O prompt já leva o que o sistema sabe do seu site (nome, cidade e categorias), então a IA não perde tempo
            perguntando o óbvio. Suas respostas ficam só entre você e a IA que escolher — o UseFokio não envia nada.
          </p>
        </div>
      </div>
    </div>
  );
}
