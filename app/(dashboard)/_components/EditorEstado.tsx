"use client";

// Padrão de sistema "estado de salvamento claro" (ver CLAUDE.md / feedback_editor_salvar):
// hook + selo + botão Salvar + modal de saída, para reuso em todos os editores do módulo Site.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUnsavedGuard } from "@/lib/hooks/useUnsavedGuard";

export function useEditorEstado(snapshotAtual: string, destinoSaida: string) {
  const router = useRouter();
  const [baseline, setBaseline] = useState<string | null>(null);
  const [saiu, setSaiu] = useState(false);

  const temAlteracoes = !saiu && baseline !== null && snapshotAtual !== baseline;
  const { modalAberto, setModalAberto, pedirSaida, irParaDestino } = useUnsavedGuard(temAlteracoes);

  return {
    temAlteracoes,
    /** Chamar no load (e após salvar OK) com o snapshot do estado persistido. */
    inicializar: (snap: string) => setBaseline(snap),
    marcarSalvo: (snap: string) => setBaseline(snap),
    /** Botão Voltar: abre o modal se houver alterações, senão navega. */
    sair: () => { if (temAlteracoes) pedirSaida(destinoSaida); else router.push(destinoSaida); },
    /** "Sair sem salvar" / pós salvar-e-sair: desliga o guard e navega. */
    sairAgora: () => { setSaiu(true); irParaDestino(destinoSaida); },
    /** Antes de excluir/navegar programaticamente sem aviso. */
    marcarSaiu: () => setSaiu(true),
    modalAberto,
    fecharModal: () => setModalAberto(false),
  };
}

export function SeloEstado({ temAlteracoes }: { temAlteracoes: boolean }) {
  return (
    <span style={{
      fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999, whiteSpace: "nowrap",
      background: temAlteracoes ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.12)",
      color: temAlteracoes ? "#B45309" : "#059669",
    }}>
      {temAlteracoes ? "● Alterações não salvas" : "✓ Tudo salvo"}
    </span>
  );
}

export function BotaoSalvarEstado({ temAlteracoes, salvando, onClick, compacto }: { temAlteracoes: boolean; salvando: boolean; onClick: () => void; compacto?: boolean }) {
  return (
    <button onClick={onClick} disabled={salvando || !temAlteracoes}
      style={{
        padding: compacto ? "6px 16px" : "10px 22px", borderRadius: compacto ? 8 : 9, border: "none",
        fontSize: compacto ? 12 : 13, fontWeight: 700,
        cursor: salvando || !temAlteracoes ? "default" : "pointer",
        background: temAlteracoes ? "#2563EB" : "var(--color-background-tertiary)",
        color: temAlteracoes ? "#fff" : "var(--color-text-secondary)",
      }}>
      {salvando ? "Salvando…" : temAlteracoes ? (compacto ? "Salvar" : "Salvar alterações") : "Salvo ✓"}
    </button>
  );
}

export function ModalNaoSalvo({ aberto, salvando, onSalvarESair, onSairSemSalvar, onContinuar }: {
  aberto: boolean; salvando: boolean;
  onSalvarESair: () => void; onSairSemSalvar: () => void; onContinuar: () => void;
}) {
  if (!aberto) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
      onClick={onContinuar}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", borderRadius: 14, padding: 24, maxWidth: 420, width: "100%", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 8 }}>⚠️ Alterações não salvas</div>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 20px", lineHeight: 1.6 }}>
          Você fez alterações que ainda não foram salvas. O que deseja fazer?
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={onSalvarESair} disabled={salvando}
            style={{ padding: "11px", borderRadius: 9, border: "none", background: "#2563EB", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {salvando ? "Salvando…" : "Salvar e sair"}
          </button>
          <button onClick={onSairSemSalvar}
            style={{ padding: "11px", borderRadius: 9, border: "1px solid var(--color-border-secondary)", background: "transparent", color: "#DC2626", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Sair sem salvar
          </button>
          <button onClick={onContinuar}
            style={{ padding: "11px", borderRadius: 9, border: "none", background: "transparent", color: "var(--color-text-secondary)", fontSize: 13, cursor: "pointer" }}>
            Continuar editando
          </button>
        </div>
      </div>
    </div>
  );
}
