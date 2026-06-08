"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const WEBMASTER_ID = process.env.NEXT_PUBLIC_WEBMASTER_ID ?? "";

type FotografoStats = {
  id: string;
  nome_completo: string;
  nome_empresa: string;
  email: string;
  plano: string;
  aprovado: boolean;
  created_at: string;
  total_clientes: number;
  total_galerias: number;
  total_fotos: number;
  total_bytes: number;
};

function formatGB(bytes: number): string {
  if (bytes === 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(0)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 600,
      background: color + "18", color,
    }}>
      {children}
    </span>
  );
}

export default function WebmasterPage() {
  const router = useRouter();
  const [verificado, setVerificado] = useState(false);
  const [stats, setStats]           = useState<FotografoStats[]>([]);
  const [loading, setLoading]       = useState(true);
  const [pendingIds, setPendingIds]  = useState<Set<string>>(new Set());
  const [filtro, setFiltro]         = useState<"todos" | "pendentes">("todos");

  // Verifica se é webmaster
  useEffect(() => {
    async function verificar() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.id !== WEBMASTER_ID) {
        router.push("/login");
        return;
      }
      setVerificado(true);
    }
    verificar();
  }, [router]);

  // Carrega stats
  useEffect(() => {
    if (!verificado) return;
    carregarStats();
  }, [verificado]);

  async function carregarStats() {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("webmaster_get_stats");
    if (!error && data) {
      setStats(data as FotografoStats[]);
    }
    setLoading(false);
  }

  async function aprovar(id: string, valor: boolean) {
    setPendingIds((prev) => new Set([...prev, id]));
    const supabase = createClient();
    await supabase.rpc("webmaster_aprovar", { p_fotografo_id: id, p_valor: valor });
    setStats((prev) => prev.map((f) => f.id === id ? { ...f, aprovado: valor } : f));
    setPendingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
  }

  async function sair() {
    await createClient().auth.signOut();
    router.push("/login");
  }

  if (!verificado) return null;

  const pendentes = stats.filter((f) => !f.aprovado);
  const lista     = filtro === "pendentes" ? pendentes : stats;

  const PLANO_COLOR: Record<string, string> = {
    gratuito:    "#059669",
    profissional: "#2563EB",
    estudio:      "#7C3AED",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background-tertiary)", fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <header style={{
        background: "var(--color-background-primary)",
        borderBottom: "0.5px solid var(--color-border-tertiary)",
        padding: "0 32px", height: 54,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/usefokio-logo.svg" alt="UseFokio" style={{ height: 22 }} />
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
            background: "rgba(124,58,237,0.1)", color: "#7C3AED", letterSpacing: "0.05em",
          }}>
            WEBMASTER
          </span>
        </div>
        <button
          onClick={sair}
          style={{ background: "none", border: "0.5px solid var(--color-border-secondary)", borderRadius: 7, padding: "6px 14px", fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer" }}
        >
          Sair
        </button>
      </header>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>

        {/* Stats resumo */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 32 }}>
          {[
            { label: "Total fotógrafos", value: stats.length, color: "#2563EB" },
            { label: "Pendentes aprovação", value: pendentes.length, color: "#F59E0B" },
            { label: "Aprovados", value: stats.filter((f) => f.aprovado).length, color: "#059669" },
            { label: "Total de fotos", value: stats.reduce((a, f) => a + f.total_fotos, 0).toLocaleString("pt-BR"), color: "#6B7280" },
            { label: "Armazenamento total", value: formatGB(stats.reduce((a, f) => a + f.total_bytes, 0)), color: "#7C3AED" },
          ].map((item) => (
            <div key={item.label} style={{
              background: "var(--color-background-primary)",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: 10, padding: "16px 20px",
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: item.color, letterSpacing: "-0.03em" }}>
                {item.value}
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2, fontWeight: 500 }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>

        {/* Pendentes — destaque */}
        {pendentes.length > 0 && (
          <div style={{
            background: "rgba(245,158,11,0.06)",
            border: "0.5px solid rgba(245,158,11,0.35)",
            borderRadius: 12, padding: "20px 24px", marginBottom: 28,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 16 }}>⏳</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#92400E" }}>
                {pendentes.length} cadastro{pendentes.length !== 1 ? "s" : ""} aguardando aprovação
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pendentes.map((f) => (
                <div key={f.id} style={{
                  background: "var(--color-background-primary)",
                  border: "0.5px solid var(--color-border-tertiary)",
                  borderRadius: 8, padding: "12px 16px",
                  display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
                }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
                      {f.nome_completo}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                      {f.nome_empresa} · {f.email}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", flexShrink: 0 }}>
                    {new Date(f.created_at).toLocaleDateString("pt-BR")}
                  </div>
                  <button
                    onClick={() => aprovar(f.id, true)}
                    disabled={pendingIds.has(f.id)}
                    style={{
                      padding: "7px 18px", borderRadius: 8, border: "none",
                      background: pendingIds.has(f.id) ? "#D1FAE5" : "#059669",
                      color: "#fff", fontSize: 12, fontWeight: 700,
                      cursor: pendingIds.has(f.id) ? "default" : "pointer",
                      flexShrink: 0,
                    }}
                  >
                    {pendingIds.has(f.id) ? "Aprovando…" : "✓ Aprovar"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabela completa */}
        <div style={{
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: 12, overflow: "hidden",
        }}>
          {/* Cabeçalho da tabela */}
          <div style={{
            padding: "16px 20px",
            borderBottom: "0.5px solid var(--color-border-tertiary)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>
              Fotógrafos
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {(["pendentes", "todos"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltro(f)}
                  style={{
                    padding: "5px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600,
                    border: "0.5px solid",
                    borderColor: filtro === f ? "var(--color-text-primary)" : "var(--color-border-secondary)",
                    background: filtro === f ? "var(--color-text-primary)" : "transparent",
                    color: filtro === f ? "var(--color-background-primary)" : "var(--color-text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  {f === "pendentes" ? `Pendentes (${pendentes.length})` : `Todos (${stats.length})`}
                </button>
              ))}
              <button
                onClick={carregarStats}
                style={{ padding: "5px 10px", borderRadius: 7, fontSize: 11, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer" }}
              >
                ↻ Atualizar
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>
              Carregando…
            </div>
          ) : lista.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>
              {filtro === "pendentes" ? "Nenhum cadastro pendente. 🎉" : "Nenhum fotógrafo cadastrado."}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "var(--color-background-secondary)" }}>
                    {["Nome / Empresa", "Email", "Plano", "Status", "Clientes", "Galerias", "Fotos", "Uso", "Cadastro", "Ação"].map((h) => (
                      <th key={h} style={{
                        padding: "10px 14px", textAlign: "left",
                        fontSize: 10, fontWeight: 700,
                        color: "var(--color-text-secondary)",
                        textTransform: "uppercase", letterSpacing: "0.05em",
                        borderBottom: "0.5px solid var(--color-border-tertiary)",
                        whiteSpace: "nowrap",
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lista.map((f, i) => (
                    <tr
                      key={f.id}
                      style={{ borderBottom: i < lista.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}
                    >
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{f.nome_completo}</div>
                        <div style={{ color: "var(--color-text-secondary)", fontSize: 11 }}>{f.nome_empresa}</div>
                      </td>
                      <td style={{ padding: "12px 14px", color: "var(--color-text-secondary)" }}>
                        {f.email}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <Badge color={PLANO_COLOR[f.plano] ?? "#6B7280"}>
                          {f.plano}
                        </Badge>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        {f.aprovado
                          ? <Badge color="#059669">Aprovado</Badge>
                          : <Badge color="#F59E0B">Pendente</Badge>
                        }
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center", color: "var(--color-text-primary)", fontWeight: 500 }}>
                        {f.total_clientes}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center", color: "var(--color-text-primary)", fontWeight: 500 }}>
                        {f.total_galerias}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center", color: "var(--color-text-primary)", fontWeight: 500 }}>
                        {f.total_fotos.toLocaleString("pt-BR")}
                      </td>
                      <td style={{ padding: "12px 14px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                        {formatGB(f.total_bytes)}
                      </td>
                      <td style={{ padding: "12px 14px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                        {new Date(f.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <button
                          onClick={() => aprovar(f.id, !f.aprovado)}
                          disabled={pendingIds.has(f.id)}
                          style={{
                            padding: "5px 12px", borderRadius: 7, border: "none",
                            background: f.aprovado ? "rgba(239,68,68,0.1)" : "rgba(5,150,105,0.1)",
                            color: f.aprovado ? "#EF4444" : "#059669",
                            fontSize: 11, fontWeight: 600,
                            cursor: pendingIds.has(f.id) ? "default" : "pointer",
                            opacity: pendingIds.has(f.id) ? 0.6 : 1,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {pendingIds.has(f.id) ? "…" : f.aprovado ? "Suspender" : "Aprovar"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
