"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { IcoTrash } from "@/app/(dashboard)/crm/_components/Icons";
import { mascaraValor, parsearValor, formatNum } from "@/lib/utils/format";
import type { CrmRevelacaoTamanho } from "@/lib/supabase/types";

export default function RevelacaoTamanhosPage() {
  const { fotografo } = useFotografo();
  const fid = fotografo?.id ?? null;
  const [tamanhos, setTamanhos] = useState<CrmRevelacaoTamanho[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoNome, setNovoNome] = useState("");
  const [novoValor, setNovoValor] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    if (!fid) return;
    setLoading(true);
    const { data } = await createClient().from("crm_revelacao_tamanhos").select("*").eq("fotografo_id", fid).order("ordem");
    setTamanhos((data ?? []) as CrmRevelacaoTamanho[]);
    setLoading(false);
  }, [fid]);

  useEffect(() => { carregar(); }, [carregar]);

  const adicionar = async () => {
    if (!fid || !novoNome.trim() || salvando) return;
    const valor = parsearValor(novoValor);
    if (!valor || valor <= 0) return;
    setSalvando(true);
    const ordem = tamanhos.length > 0 ? Math.max(...tamanhos.map(t => t.ordem)) + 1 : 0;
    const { error } = await createClient().from("crm_revelacao_tamanhos").insert({
      fotografo_id: fid, nome: novoNome.trim(), valor, ativo: true, ordem,
    });
    setSalvando(false);
    if (error) { alert("Erro ao adicionar: " + error.message); return; }
    setNovoNome("");
    setNovoValor("");
    carregar();
  };

  const atualizarValor = async (t: CrmRevelacaoTamanho, novoValorStr: string) => {
    const valor = parsearValor(novoValorStr);
    setTamanhos(prev => prev.map(x => x.id === t.id ? { ...x, valor } : x));
    await createClient().from("crm_revelacao_tamanhos").update({ valor }).eq("id", t.id);
  };

  const toggleAtivo = async (t: CrmRevelacaoTamanho) => {
    const novo = !t.ativo;
    setTamanhos(prev => prev.map(x => x.id === t.id ? { ...x, ativo: novo } : x));
    await createClient().from("crm_revelacao_tamanhos").update({ ativo: novo }).eq("id", t.id);
  };

  const excluir = async (t: CrmRevelacaoTamanho) => {
    if (!confirm(`Excluir o tamanho "${t.nome}"?`)) return;
    setTamanhos(prev => prev.filter(x => x.id !== t.id));
    await createClient().from("crm_revelacao_tamanhos").delete().eq("id", t.id);
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 640, fontFamily: "var(--font-sans)" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-text-primary)", margin: 0 }}>Tamanhos de revelação</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
          Tamanhos e preços que o cliente vê ao pedir revelação (impressão física) das fotos da entrega.
        </p>
      </div>

      {loading ? (
        <div style={{ color: "var(--color-text-secondary)", fontSize: 13, padding: 24, textAlign: "center" }}>Carregando…</div>
      ) : (
        <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
          {tamanhos.length === 0 ? (
            <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>Nenhum tamanho cadastrado ainda.</div>
          ) : tamanhos.map((t, i) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: i < tamanhos.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>{t.nome}</span>
              <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>R$</span>
              <input
                defaultValue={formatNum(t.valor)}
                onBlur={(e) => atualizarValor(t, e.target.value)}
                style={{ width: 90, padding: "6px 8px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 13, textAlign: "right" }}
              />
              <label title={t.ativo ? "Ativo — desmarque para desativar" : "Inativo"} style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none" }}>
                <input type="checkbox" checked={t.ativo} onChange={() => toggleAtivo(t)} style={{ accentColor: "#16a34a", cursor: "pointer", width: 15, height: 15 }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: t.ativo ? "#16a34a" : "var(--color-text-secondary)" }}>{t.ativo ? "Ativo" : "Inativo"}</span>
              </label>
              <button onClick={() => excluir(t)} title="Excluir"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 6, border: "0.5px solid rgba(239,68,68,0.3)", background: "transparent", color: "#EF4444", cursor: "pointer" }}>
                <IcoTrash />
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Nome (ex. 10x15)"
          style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", fontSize: 13, color: "var(--color-text-primary)", outline: "none" }} />
        <input value={novoValor} onChange={(e) => setNovoValor(mascaraValor(e.target.value))} placeholder="Valor (ex. 2,50)"
          style={{ width: 130, padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", fontSize: 13, color: "var(--color-text-primary)", outline: "none" }} />
        <button onClick={adicionar} disabled={salvando}
          style={{ padding: "9px 18px", borderRadius: 8, background: "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: salvando ? "default" : "pointer", opacity: salvando ? 0.6 : 1 }}>
          + Adicionar
        </button>
      </div>
    </div>
  );
}
