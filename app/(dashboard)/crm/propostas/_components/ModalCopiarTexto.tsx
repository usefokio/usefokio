"use client";

// Modal "Copiar texto / WhatsApp" da proposta: renderiza a mensagem a partir do
// modelo ({{VARIAVEIS}}), permite AJUSTAR os valores só neste envio (sem alterar o
// cadastro) e editar o texto final antes de copiar. Padrão de cópia/wa.me igual ao
// ModalEnviarAcesso do álbum.
import { useMemo, useState } from "react";
import { mascaraValor } from "@/lib/utils/format";
import { renderizarTextoProposta, type ValoresOverride } from "@/lib/crm/proposta";
import type { CrmProposta, CrmPropostaOpcao } from "@/lib/supabase/types";

const btn: React.CSSProperties = {
  padding: "9px 16px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)",
  background: "transparent", fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer",
};

export function ModalCopiarTexto({ proposta, opcoes, nomeEmpresa, link, onFechar }: {
  proposta: CrmProposta;
  opcoes: CrmPropostaOpcao[];
  nomeEmpresa: string;
  link: string | null;
  onFechar: () => void;
}) {
  const [overrides, setOverrides] = useState<ValoresOverride>({});
  const [textoEditado, setTextoEditado] = useState<string | null>(null); // null = segue o gerado
  const [copiado, setCopiado] = useState(false);

  const linkAbsoluto = useMemo(() => {
    if (!link) return null;
    return link.startsWith("http") ? link : `${window.location.origin}${link}`;
  }, [link]);

  const textoGerado = useMemo(() => renderizarTextoProposta({
    proposta, opcoes, nomeEmpresa, link: linkAbsoluto, overrides,
  }), [proposta, opcoes, nomeEmpresa, linkAbsoluto, overrides]);

  const texto = textoEditado ?? textoGerado;
  const comValor = opcoes.filter((o) => o.valor != null);

  function copiar() {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  function abrirWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
      onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--color-background-primary)", borderRadius: 14, padding: 24, maxWidth: 640, width: "100%", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--color-text-primary)" }}>📋 {proposta.titulo}</div>
          <button onClick={onFechar} style={{ ...btn, padding: "4px 10px" }}>✕</button>
        </div>
        <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 14px" }}>
          Ajuste os valores só para este envio (o cadastro não muda), revise o texto e copie.
        </p>

        {comValor.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
            {comValor.map((o) => (
              <label key={o.id} style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                {o.nome}
                <input
                  value={overrides[o.id] ?? ""}
                  onChange={(e) => {
                    const v = mascaraValor(e.target.value);
                    setOverrides((prev) => ({ ...prev, [o.id]: v }));
                    setTextoEditado(null); // valores mudaram → volta a seguir o gerado
                  }}
                  placeholder={o.valor != null ? o.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "0,00"}
                  inputMode="numeric"
                  style={{ display: "block", width: 120, marginTop: 3, padding: "7px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 13, color: "var(--color-text-primary)" }}
                />
              </label>
            ))}
          </div>
        )}

        <textarea
          value={texto}
          onChange={(e) => setTextoEditado(e.target.value)}
          rows={14}
          style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 10, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", fontSize: 13, lineHeight: 1.55, color: "var(--color-text-primary)", fontFamily: "inherit", resize: "vertical" }}
        />
        {textoEditado !== null && (
          <button onClick={() => setTextoEditado(null)}
            style={{ background: "none", border: "none", color: "#2563EB", fontSize: 12, cursor: "pointer", padding: "6px 0" }}>
            ↺ Voltar ao texto padrão
          </button>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button onClick={copiar}
            style={{ flex: 1, padding: "11px", borderRadius: 9, border: "none", background: copiado ? "#059669" : "#2563EB", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {copiado ? "✓ Copiado!" : "Copiar texto"}
          </button>
          <button onClick={abrirWhatsApp} style={{ ...btn, flex: 1, background: "rgba(37,211,102,0.1)", borderColor: "rgba(37,211,102,0.4)" }}>
            💬 Abrir no WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
