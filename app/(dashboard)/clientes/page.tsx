"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Cliente } from "@/lib/supabase/types";
import { normalizar } from "@/lib/utils/normalizar";

const POR_PAGINA = 50;

function initials(nome: string) {
  return nome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function avatarColor(nome: string) {
  const colors = ["#2563EB","#7C3AED","#DB2777","#059669","#D97706","#DC2626","#0891B2"];
  return colors[nome.charCodeAt(0) % colors.length];
}

const TIPO_LABELS: Record<string, string> = {
  oportunidade: "Lead",
  cliente: "Cliente",
  parceiro: "Parceiro",
  fornecedor: "Fornecedor",
};

const TIPO_COLORS: Record<string, { color: string; bg: string }> = {
  oportunidade: { color: "#7C3AED", bg: "rgba(124,58,237,0.08)" },
  cliente:      { color: "#059669", bg: "rgba(16,185,129,0.08)" },
  parceiro:     { color: "#2563EB", bg: "rgba(37,99,235,0.08)" },
  fornecedor:   { color: "#D97706", bg: "rgba(217,119,6,0.08)" },
};

const IcoEdit = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const IcoTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);

function ModalExcluir({ nome, onConfirmar, onFechar, deletando }: { nome: string; onConfirmar: () => void; onFechar: () => void; deletando: boolean }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 30px", width: 380, boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
        <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: "#EF4444" }}>Excluir contato</h3>
        <p style={{ margin: "0 0 22px", fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          Tem certeza que deseja excluir <strong style={{ color: "var(--color-text-primary)" }}>{nome}</strong>?<br />Esta ação não pode ser desfeita.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onFechar} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}>Cancelar</button>
          <button onClick={onConfirmar} disabled={deletando} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: "#EF4444", color: "#fff", fontSize: 13, fontWeight: 600, cursor: deletando ? "default" : "pointer" }}>
            {deletando ? "Excluindo…" : "Excluir"}
          </button>
        </div>
      </div>
    </div>
  );
}

type TipoFiltro = "" | "oportunidade" | "cliente" | "parceiro" | "fornecedor";

export default function ClientesPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading]   = useState(true);
  const [busca, setBusca]       = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>("");
  const [pagina, setPagina]     = useState(1);
  const [deletarId, setDeletarId] = useState<string | null>(null);
  const [deletando, setDeletando] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const LOTE = 1000;
      let todos: Cliente[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("clientes")
          .select("*")
          .order("nome")
          .range(from, from + LOTE - 1);
        if (error || !data || data.length === 0) break;
        todos = todos.concat(data);
        if (data.length < LOTE) break;
        from += LOTE;
      }
      setClientes(todos);
      setLoading(false);
    }
    load();
  }, []);

  // Reset página ao filtrar
  useEffect(() => { setPagina(1); }, [busca, tipoFiltro]);

  const filtrados = clientes.filter((c) => {
    const okBusca = busca === "" ||
      normalizar(c.nome).includes(normalizar(busca)) ||
      normalizar(c.email ?? "").includes(normalizar(busca)) ||
      normalizar(c.empresa ?? "").includes(normalizar(busca));
    const okTipo = tipoFiltro === "" || c.tipo_contato === tipoFiltro;
    return okBusca && okTipo;
  });

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaAtual  = Math.min(pagina, totalPaginas);
  const exibidos     = filtrados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  const contagens: Record<string, number> = {};
  for (const c of clientes) {
    contagens[c.tipo_contato ?? "cliente"] = (contagens[c.tipo_contato ?? "cliente"] ?? 0) + 1;
  }

  const TIPOS: { id: TipoFiltro; label: string }[] = [
    { id: "",           label: `Todos (${clientes.length})` },
    { id: "cliente",    label: `Clientes (${contagens.cliente ?? 0})` },
    { id: "oportunidade", label: `Leads (${contagens.oportunidade ?? 0})` },
    { id: "parceiro",   label: `Parceiros (${contagens.parceiro ?? 0})` },
    { id: "fornecedor", label: `Fornecedores (${contagens.fornecedor ?? 0})` },
  ];

  async function excluir(id: string) {
    setDeletando(true);
    const supabase = createClient();
    await supabase.from("clientes").delete().eq("id", id);
    setClientes((prev) => prev.filter((c) => c.id !== id));
    setDeletarId(null);
    setDeletando(false);
  }

  const clienteParaDeletar = clientes.find((c) => c.id === deletarId);

  return (
    <div style={{ padding: "26px 30px", maxWidth: 960 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 3px", letterSpacing: "-0.02em" }}>
            Clientes
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
            {loading ? "Carregando…" : `${clientes.length} contato${clientes.length !== 1 ? "s" : ""} cadastrado${clientes.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link
          href="/clientes/novo"
          style={{
            padding: "9px 18px", borderRadius: 8,
            background: "var(--color-text-primary)",
            color: "var(--color-background-primary)",
            fontSize: 13, fontWeight: 600,
            textDecoration: "none",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          + Novo contato
        </Link>
      </div>

      {/* Filtros de tipo */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {TIPOS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTipoFiltro(t.id)}
            style={{
              padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: tipoFiltro === t.id ? 700 : 500,
              cursor: "pointer", border: "0.5px solid",
              borderColor: tipoFiltro === t.id ? "var(--color-text-primary)" : "var(--color-border-secondary)",
              background: tipoFiltro === t.id ? "var(--color-text-primary)" : "transparent",
              color: tipoFiltro === t.id ? "var(--color-background-primary)" : "var(--color-text-secondary)",
              transition: "all 0.1s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Busca */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: 9, padding: "8px 12px", marginBottom: 16,
      }}>
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.4, flexShrink: 0 }}>
          <circle cx="6" cy="6" r="4" stroke="var(--color-text-primary)" strokeWidth="1.3"/>
          <path d="M9.5 9.5L12 12" stroke="var(--color-text-primary)" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, email ou empresa…"
          style={{ flex: 1, border: "none", background: "transparent", fontSize: 13, color: "var(--color-text-primary)", outline: "none" }}
        />
        {busca && (
          <button onClick={() => setBusca("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : filtrados.length === 0 ? (
        <div style={{
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: 12, padding: "52px 24px", textAlign: "center",
        }}>
          {clientes.length === 0 ? (
            <>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>Nenhum contato ainda</div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 22 }}>Cadastre seu primeiro cliente para começar a criar galerias.</div>
              <Link href="/clientes/novo" style={{ padding: "10px 22px", borderRadius: 8, background: "#2563EB", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                + Cadastrar contato
              </Link>
            </>
          ) : (
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
              Nenhum resultado para "<strong>{busca}</strong>"
            </div>
          )}
        </div>
      ) : (
        <>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
            {/* Cabeçalho */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 180px 160px 120px 80px",
              padding: "8px 18px",
              borderBottom: "0.5px solid var(--color-border-tertiary)",
              background: "var(--color-background-secondary)",
            }}>
              {["Contato", "Email", "Telefone", "Tipo", ""].map((h) => (
                <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</span>
              ))}
            </div>

            {exibidos.map((c, i) => {
              const tipo = TIPO_COLORS[c.tipo_contato ?? "cliente"] ?? TIPO_COLORS.cliente;
              return (
                <div
                  key={c.id}
                  style={{
                    display: "grid", gridTemplateColumns: "1fr 180px 160px 120px 80px",
                    padding: "11px 18px",
                    borderBottom: i < exibidos.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-background-secondary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                    onClick={() => router.push(`/clientes/${c.id}`)}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: avatarColor(c.nome),
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0,
                    }}>
                      {initials(c.nome)}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{c.nome}</div>
                      {c.empresa && (
                        <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 1 }}>{c.empresa}</div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.email ?? "—"}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{c.telefone ?? c.whatsapp ?? "—"}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: tipo.bg, color: tipo.color, whiteSpace: "nowrap" }}>
                      {TIPO_LABELS[c.tipo_contato ?? "cliente"]}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                    <button
                      onClick={() => router.push(`/clientes/${c.id}/editar`)}
                      title="Editar"
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-secondary)", background: "transparent", cursor: "pointer" }}
                    ><IcoEdit /></button>
                    <button
                      onClick={() => setDeletarId(c.id)}
                      title="Excluir"
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 6, border: "0.5px solid rgba(239,68,68,0.3)", color: "#EF4444", background: "transparent", cursor: "pointer", opacity: 0.6 }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
                    ><IcoTrash /></button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, padding: "0 2px" }}>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                {((paginaAtual - 1) * POR_PAGINA) + 1}–{Math.min(paginaAtual * POR_PAGINA, filtrados.length)} de {filtrados.length}
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={paginaAtual === 1}
                  style={{ padding: "5px 12px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, color: "var(--color-text-secondary)", cursor: paginaAtual === 1 ? "default" : "pointer", opacity: paginaAtual === 1 ? 0.4 : 1 }}
                >← Anterior</button>
                {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPaginas || Math.abs(p - paginaAtual) <= 2)
                  .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) =>
                    p === "…" ? (
                      <span key={`ellipsis-${idx}`} style={{ padding: "5px 8px", fontSize: 12, color: "var(--color-text-secondary)" }}>…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPagina(p as number)}
                        style={{
                          padding: "5px 10px", borderRadius: 7, border: "0.5px solid",
                          borderColor: paginaAtual === p ? "var(--color-text-primary)" : "var(--color-border-secondary)",
                          background: paginaAtual === p ? "var(--color-text-primary)" : "transparent",
                          color: paginaAtual === p ? "var(--color-background-primary)" : "var(--color-text-secondary)",
                          fontSize: 12, fontWeight: paginaAtual === p ? 700 : 400, cursor: "pointer",
                        }}
                      >{p}</button>
                    )
                  )}
                <button
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaAtual === totalPaginas}
                  style={{ padding: "5px 12px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, color: "var(--color-text-secondary)", cursor: paginaAtual === totalPaginas ? "default" : "pointer", opacity: paginaAtual === totalPaginas ? 0.4 : 1 }}
                >Próxima →</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal excluir */}
      {deletarId && clienteParaDeletar && (
        <ModalExcluir
          nome={clienteParaDeletar.nome}
          onConfirmar={() => excluir(deletarId)}
          onFechar={() => setDeletarId(null)}
          deletando={deletando}
        />
      )}
    </div>
  );
}
