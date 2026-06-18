"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { Cliente } from "@/lib/supabase/types";

const TIPO_MAP: Record<string, { label: string; color: string; bg: string }> = {
  cliente:     { label: "Cliente",     color: "#2563EB", bg: "rgba(37,99,235,0.08)"  },
  lead:        { label: "Lead",        color: "#D97706", bg: "rgba(217,119,6,0.08)"  },
  fornecedor:  { label: "Fornecedor",  color: "#7C3AED", bg: "rgba(124,58,237,0.08)" },
  parceiro:    { label: "Parceiro",    color: "#059669", bg: "rgba(16,185,129,0.08)" },
  outro:       { label: "Outro",       color: "#6B7280", bg: "rgba(107,114,128,0.08)"},
};

export default function CrmClientesPage() {
  const { fotografo } = useFotografo();
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");

  const load = useCallback(async () => {
    if (!fotografo) return;
    setLoading(true);
    const supabase = createClient();
    const q = supabase
      .from("clientes")
      .select("*")
      .eq("fotografo_id", fotografo.id)
      .eq("crm_ativo", true)
      .order("nome");
    if (tipoFiltro) q.eq("tipo_contato", tipoFiltro);
    const { data } = await q;
    setClientes(data ?? []);
    setLoading(false);
  }, [fotografo, tipoFiltro]);

  useEffect(() => { load(); }, [load]);

  const filtrados = clientes.filter((c) => {
    if (!busca) return true;
    const b = busca.toLowerCase();
    return (
      c.nome.toLowerCase().includes(b) ||
      (c.email ?? "").toLowerCase().includes(b) ||
      (c.telefone ?? "").includes(b) ||
      (c.empresa ?? "").toLowerCase().includes(b)
    );
  });

  const cell: React.CSSProperties = {
    padding: "10px 14px",
    fontSize: 12,
    color: "var(--color-text-primary)",
    borderBottom: "0.5px solid var(--color-border-tertiary)",
    verticalAlign: "middle",
  };

  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
            Clientes
          </h1>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "3px 0 0" }}>
            {filtrados.length} contato{filtrados.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => router.push("/crm/clientes/novo")}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Novo contato
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, email, telefone..."
          style={{ flex: 1, padding: "7px 11px", border: "0.5px solid var(--color-border-secondary)", borderRadius: 7, fontSize: 12, background: "var(--color-background-primary)", color: "var(--color-text-primary)", outline: "none" }}
        />
        <select
          value={tipoFiltro}
          onChange={(e) => setTipoFiltro(e.target.value)}
          style={{ padding: "7px 11px", border: "0.5px solid var(--color-border-secondary)", borderRadius: 7, fontSize: 12, background: "var(--color-background-primary)", color: "var(--color-text-primary)", cursor: "pointer" }}
        >
          <option value="">Todos os tipos</option>
          {Object.entries(TIPO_MAP).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Tabela */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>👥</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 4 }}>Nenhum contato encontrado</div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
              {busca || tipoFiltro ? "Tente ajustar os filtros" : "Adicione seu primeiro contato"}
            </div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--color-background-secondary)" }}>
                {["Nome", "Email", "Telefone", "Empresa", "Tipo", ""].map((h) => (
                  <th key={h} style={{ ...cell, fontWeight: 600, fontSize: 11, color: "var(--color-text-secondary)", textAlign: "left", padding: "8px 14px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => {
                const tipo = TIPO_MAP[c.tipo_contato] ?? TIPO_MAP.outro;
                return (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/crm/clientes/${c.id}`)}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-background-secondary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={cell}>
                      <span style={{ fontWeight: 500 }}>{c.nome}</span>
                    </td>
                    <td style={{ ...cell, color: "var(--color-text-secondary)" }}>{c.email ?? "—"}</td>
                    <td style={{ ...cell, color: "var(--color-text-secondary)" }}>{c.telefone ?? c.whatsapp ?? "—"}</td>
                    <td style={{ ...cell, color: "var(--color-text-secondary)" }}>{c.empresa ?? "—"}</td>
                    <td style={cell}>
                      <span style={{ fontSize: 11, fontWeight: 500, color: tipo.color, background: tipo.bg, padding: "2px 8px", borderRadius: 10 }}>
                        {tipo.label}
                      </span>
                    </td>
                    <td style={{ ...cell, width: 32 }}>
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.3 }}>
                        <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
