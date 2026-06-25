"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { IcoEdit, IcoTrash, IcoOpen } from "@/app/(dashboard)/crm/_components/Icons";
import type { Cliente } from "@/lib/supabase/types";

const btnIcon = (extra?: React.CSSProperties): React.CSSProperties => ({
  display: "flex", alignItems: "center", justifyContent: "center",
  width: 26, height: 26, borderRadius: 6,
  border: "0.5px solid var(--color-border-secondary)",
  background: "transparent", cursor: "pointer",
  color: "var(--color-text-secondary)",
  ...extra,
});

const TIPO_MAP: Record<string, { label: string; color: string; bg: string }> = {
  cliente:     { label: "Cliente",      color: "#2563EB", bg: "rgba(37,99,235,0.08)"  },
  oportunidade:{ label: "Oportunidade", color: "#D97706", bg: "rgba(217,119,6,0.08)"  },
  fornecedor:  { label: "Fornecedor",   color: "#7C3AED", bg: "rgba(124,58,237,0.08)" },
  parceiro:    { label: "Parceiro",     color: "#059669", bg: "rgba(16,185,129,0.08)" },
  fotografo:   { label: "Fotógrafo",   color: "#0891B2", bg: "rgba(8,145,178,0.08)"  },
  videografo:  { label: "Videógrafo",  color: "#7C3AED", bg: "rgba(124,58,237,0.08)" },
};

export default function CrmClientesPage() {
  const { fotografo } = useFotografo();
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [sortCol, setSortCol] = useState<string>("nome");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const excluir = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Excluir este contato?")) return;
    await createClient().from("clientes").update({ crm_ativo: false }).eq("id", id);
    load();
  };

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

  const filtrados = clientes.filter((c: Cliente) => {
    if (!busca) return true;
    const b = busca.toLowerCase();
    return (
      c.nome.toLowerCase().includes(b) ||
      (c.email ?? "").toLowerCase().includes(b) ||
      (c.telefone ?? "").includes(b) ||
      (c.empresa ?? "").toLowerCase().includes(b)
    );
  });

  const ordenados = [...filtrados].sort((a, b) => {
    let va: string | null | undefined;
    let vb: string | null | undefined;
    if      (sortCol === "nome")         { va = a.nome;          vb = b.nome; }
    else if (sortCol === "email")        { va = a.email;         vb = b.email; }
    else if (sortCol === "telefone")     { va = a.telefone;      vb = b.telefone; }
    else if (sortCol === "empresa")      { va = a.empresa;       vb = b.empresa; }
    else if (sortCol === "tipo_contato") { va = a.tipo_contato;  vb = b.tipo_contato; }
    else                                 { va = a.nome;          vb = b.nome; }
    if (va == null) return 1;
    if (vb == null) return -1;
    const cmp = String(va).localeCompare(String(vb), "pt-BR");
    return sortDir === "asc" ? cmp : -cmp;
  });

  const thSort = (col: string): React.CSSProperties => ({
    padding: "8px 14px", fontWeight: 700, fontSize: 11,
    color: "var(--color-text-secondary)", textAlign: "left",
    textTransform: "uppercase", letterSpacing: "0.04em",
    borderBottom: "0.5px solid var(--color-border-tertiary)",
    cursor: "pointer", userSelect: "none", whiteSpace: "nowrap",
  });

  const cell: React.CSSProperties = {
    padding: "10px 14px",
    fontSize: 12,
    color: "var(--color-text-primary)",
    borderBottom: "0.5px solid var(--color-border-tertiary)",
    verticalAlign: "middle",
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, fontFamily: "var(--font-sans)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-text-primary)", margin: "0 0 4px" }}>
            Clientes
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
            {filtrados.length} contato{filtrados.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => router.push("/crm/clientes/novo")}
          style={{ padding: "9px 18px", background: "#111", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          + Novo contato
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 9, padding: "8px 12px" }}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.4, flexShrink: 0 }}>
            <circle cx="6" cy="6" r="4" stroke="var(--color-text-primary)" strokeWidth="1.3"/>
            <path d="M9.5 9.5L12 12" stroke="var(--color-text-primary)" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, email, telefone…"
            style={{ flex: 1, border: "none", background: "transparent", fontSize: 13, color: "var(--color-text-primary)", outline: "none" }} />
          {busca && <button onClick={() => setBusca("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>}
        </div>
        <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 9, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", fontSize: 13, color: "var(--color-text-primary)", cursor: "pointer", outline: "none" }}>
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
                {([
                  { label: "Nome", col: "nome" }, { label: "Email", col: "email" },
                  { label: "Telefone", col: "telefone" }, { label: "Empresa", col: "empresa" },
                  { label: "Tipo", col: "tipo_contato" }, { label: "", col: "" },
                ] as const).map(({ label, col }) => (
                  <th key={label || "acoes"} onClick={() => col && toggleSort(col)} style={col ? thSort(col) : { ...thSort(""), cursor: "default" }}>
                    {label}
                    {col && sortCol === col && <span style={{ fontSize: 9, opacity: 0.7, marginLeft: 3 }}>{sortDir === "asc" ? "↑" : "↓"}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ordenados.map((c) => {
                const tipo = TIPO_MAP[c.tipo_contato] ?? TIPO_MAP.outro;
                return (
                  <tr
                    key={c.id}
                    style={{ cursor: "pointer", background: "var(--color-background-primary)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-background-secondary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-background-primary)")}
                  >
                    <td style={cell} onClick={() => router.push(`/crm/clientes/${c.id}`)}>
                      <span style={{ fontWeight: 500 }}>{c.nome}</span>
                    </td>
                    <td style={{ ...cell, color: "var(--color-text-secondary)" }} onClick={() => router.push(`/crm/clientes/${c.id}`)}>{c.email ?? "—"}</td>
                    <td style={{ ...cell, color: "var(--color-text-secondary)" }} onClick={() => router.push(`/crm/clientes/${c.id}`)}>{c.telefone ?? c.whatsapp ?? "—"}</td>
                    <td style={{ ...cell, color: "var(--color-text-secondary)" }} onClick={() => router.push(`/crm/clientes/${c.id}`)}>{c.empresa ?? "—"}</td>
                    <td style={cell} onClick={() => router.push(`/crm/clientes/${c.id}`)}>
                      <span style={{ fontSize: 11, fontWeight: 500, color: tipo.color, background: tipo.bg, padding: "2px 8px", borderRadius: 10 }}>
                        {tipo.label}
                      </span>
                    </td>
                    <td style={{ ...cell, textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5 }}>
                        <button onClick={() => router.push(`/crm/clientes/${c.id}`)} title="Abrir"
                          style={btnIcon({ color: "#2563EB", border: "0.5px solid var(--color-border-secondary)" })}>
                          <IcoOpen />
                        </button>
                        <button onClick={() => router.push(`/crm/clientes/${c.id}`)} title="Editar"
                          style={btnIcon()}>
                          <IcoEdit />
                        </button>
                        <button onClick={(ev) => excluir(c.id, ev)} title="Excluir"
                          style={btnIcon({ color: "#EF4444", border: "0.5px solid rgba(239,68,68,0.3)", opacity: 0.6 })}
                          onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                          onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}>
                          <IcoTrash />
                        </button>
                      </div>
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
