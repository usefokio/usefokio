"use client";

import { useState } from "react";

export default function StoragePage() {
  const [status,  setStatus]  = useState<{ deleted?: number; total?: number; errors?: string[]; error?: string } | null>(null);
  const [rodando, setRodando] = useState(false);

  async function limpar() {
    if (!confirm("Deletar TODOS os arquivos de fotos de entrega que estão no storage mas não têm registro no banco?\n\nIsso inclui fotos órfãs de TODOS os fotógrafos.")) return;
    setRodando(true);
    setStatus(null);
    try {
      const res = await fetch("/api/webmaster/cleanup-storage", { method: "POST" });
      setStatus(await res.json());
    } catch (e) {
      setStatus({ error: String(e) });
    } finally {
      setRodando(false);
    }
  }

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.02em", marginBottom: 24 }}>
        Storage
      </div>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "24px 28px", maxWidth: 560 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 10 }}>🗑️ Limpeza de Arquivos Órfãos</div>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 20px", lineHeight: 1.6 }}>
          Remove arquivos de fotos de entrega que existem no bucket Supabase mas não têm registro em <code>galerias_entrega_fotos</code>.
          Não apaga capas nem arquivos de seleção/álbum.
        </p>
        <button
          onClick={limpar}
          disabled={rodando}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: rodando ? "rgba(239,68,68,0.3)" : "#EF4444", color: "#fff", fontSize: 13, fontWeight: 700, cursor: rodando ? "default" : "pointer" }}
        >
          {rodando ? "Limpando…" : "Limpar arquivos órfãos"}
        </button>
        {status && (
          <div style={{ marginTop: 14, fontSize: 13, color: status.error || status.errors?.length ? "#EF4444" : "#059669" }}>
            {status.error
              ? `❌ Erro: ${status.error}`
              : status.errors?.length
              ? `⚠️ ${status.deleted}/${status.total} deletados com ${status.errors.length} erro(s)`
              : `✅ ${status.deleted} arquivo(s) deletado(s)${status.total && status.total > 0 ? ` de ${status.total} órfão(s)` : " — storage limpo"}`
            }
          </div>
        )}
      </div>
    </div>
  );
}
