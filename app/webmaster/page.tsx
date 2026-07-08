"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type PlanoConfig = { id: string; codigo: string; nome: string; limite_fotos: number | null; preco: number; preco_anual: number | null; eh_campanha: boolean };

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
  limite_fotos_custom: number | null;
  plano_expira_em: string | null;
  plano_ativado_em: string | null;
};

function formatGB(bytes: number): string {
  if (bytes === 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(0)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: color + "18", color }}>
      {children}
    </span>
  );
}

const RECURSOS_LABELS: { chave: string; label: string }[] = [
  { chave: "album",      label: "Álbum" },
  { chave: "contatos",   label: "Contatos" },
  { chave: "entrega",    label: "Entrega" },
  { chave: "pagamentos", label: "Pagamentos" },
  { chave: "selecao",    label: "Seleção" },
  { chave: "crm",        label: "CRM" },
  { chave: "site",       label: "Site" },
];

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await createClient().auth.getSession();
  return { Authorization: `Bearer ${session?.access_token ?? ""}` };
}

function RecursosCell({ fotografoId }: { fotografoId: string }) {
  const [aberto,   setAberto]   = useState(false);
  const [recursos, setRecursos] = useState<Record<string, boolean> | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function abrir() {
    if (!aberto && !recursos) {
      const res = await fetch(`/api/webmaster/fotografo-config/${fotografoId}`, {
        headers: await authHeaders(),
      });
      const data = await res.json();
      setRecursos((data?.recursos as Record<string, boolean>) ?? { selecao: true, entrega: true, album: true, contatos: true, pagamentos: true });
    }
    setAberto(!aberto);
  }

  async function alternar(chave: string) {
    if (!recursos) return;
    const novos = { ...recursos, [chave]: !recursos[chave] };
    setRecursos(novos);
    setSalvando(true);
    await fetch(`/api/webmaster/fotografo-config/${fotografoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ recursos: novos }),
    });
    setSalvando(false);
  }

  const ativos = recursos ? Object.values(recursos).filter(Boolean).length : null;

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={abrir}
        style={{ padding: "5px 12px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", fontSize: 11, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer", whiteSpace: "nowrap" }}
      >
        ⚙ {ativos !== null ? `${ativos}/${RECURSOS_LABELS.length}` : "Recursos"}
      </button>
      {aberto && recursos && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 30, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: 10, padding: "12px 14px", boxShadow: "0 6px 24px rgba(0,0,0,0.15)", minWidth: 170 }}>
          {RECURSOS_LABELS.map((r) => (
            <label key={r.chave} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", cursor: "pointer", fontSize: 12, color: "var(--color-text-primary)" }}>
              <input
                type="checkbox"
                checked={recursos[r.chave] !== false}
                onChange={() => alternar(r.chave)}
                style={{ width: 14, height: 14, accentColor: "#2563EB", cursor: "pointer" }}
              />
              {r.label}
            </label>
          ))}
          <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginTop: 6 }}>
            {salvando ? "Salvando…" : "Salvo automaticamente"}
          </div>
        </div>
      )}
    </div>
  );
}

function LimiteFotosCell({ inicial, planLimite }: { inicial: number | null; planLimite: number | null }) {
  const efetivo: number | null =
    inicial != null && planLimite != null ? Math.max(inicial, planLimite)
    : inicial != null ? inicial
    : planLimite;

  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-primary)", whiteSpace: "nowrap" }}>
      {efetivo != null ? `${efetivo.toLocaleString("pt-BR")} fotos` : "∞ fotos"}
    </span>
  );
}

const PLANO_COLOR: Record<string, string> = {
  gratuito:     "#059669",
  profissional: "#2563EB",
  estudio:      "#7C3AED",
};

export default function WebmasterPage() {
  const [stats,           setStats]           = useState<FotografoStats[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [planLimits,      setPlanLimits]      = useState<Record<string, number | null>>({});
  const [planosConfig,    setPlanosConfig]    = useState<PlanoConfig[]>([]);
  const [pendingIds,      setPendingIds]      = useState<Set<string>>(new Set());
  const [filtro,          setFiltro]          = useState<"todos" | "pendentes">("todos");
  const [modalExcluir,    setModalExcluir]    = useState<FotografoStats | null>(null);
  const [confirmEmail,    setConfirmEmail]    = useState("");
  const [excluindo,       setExcluindo]       = useState(false);
  const [erroExcluir,     setErroExcluir]     = useState("");
  const [resetando,       setResetando]       = useState<string | null>(null);
  const [ativando,        setAtivando]        = useState<string | null>(null);
  const [modalAtivacao,   setModalAtivacao]   = useState<{ id: string; nome: string } | null>(null);
  const [periodoAtivacao, setPeriodoAtivacao] = useState<"mensal" | "anual">("mensal");
  const [planoSelecionado, setPlanoSelecionado] = useState<PlanoConfig | null>(null);

  useEffect(() => {
    carregarStats();
    async function carregarPlanos() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/webmaster/planos", {
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      });
      if (res.ok) {
        const json = await res.json();
        const lista = json.planos as PlanoConfig[];
        const map: Record<string, number | null> = {};
        lista.forEach((p) => { map[p.codigo] = p.limite_fotos; });
        setPlanLimits(map);
        setPlanosConfig(lista);
      }
    }
    carregarPlanos();
  }, []);

  async function carregarStats() {
    setLoading(true);
    const res  = await fetch("/api/webmaster/stats", { headers: await authHeaders() });
    const json = await res.json();
    if (res.ok && json.data) setStats(json.data as FotografoStats[]);
    setLoading(false);
  }

  async function aprovar(id: string, valor: boolean) {
    setPendingIds((prev) => new Set([...prev, id]));
    try {
      const res = await fetch(`/api/webmaster/fotografo-config/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ aprovado: valor }),
      });
      if (res.ok) {
        setStats((prev) => prev.map((f) => f.id === id ? { ...f, aprovado: valor } : f));
      } else {
        alert("Não foi possível atualizar a aprovação. Tente novamente em instantes.");
      }
    } finally {
      setPendingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  }

  function abrirAtivacao(fotografoId: string, nome: string) {
    setPeriodoAtivacao("mensal");
    const defaultPlano = planosConfig.find((p) => p.codigo === "profissional" && !p.eh_campanha) ?? planosConfig[0] ?? null;
    setPlanoSelecionado(defaultPlano);
    setModalAtivacao({ id: fotografoId, nome });
  }

  async function confirmarAtivacao() {
    if (!modalAtivacao || !planoSelecionado) return;
    setAtivando(modalAtivacao.id);
    const dias = periodoAtivacao === "anual" ? 365 : (planoSelecionado as PlanoConfig & { duracao_dias?: number }).duracao_dias ?? 31;
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    await fetch("/api/webmaster/ativar-plano", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({
        fotografo_id:   modalAtivacao.id,
        plano:          planoSelecionado.codigo,
        plano_config_id: planoSelecionado.id,
        dias,
        periodo: periodoAtivacao,
      }),
    });
    await carregarStats();
    setAtivando(null);
    setModalAtivacao(null);
    setPlanoSelecionado(null);
  }

  async function resetarContaTeste(id: string) {
    if (!confirm("Reiniciar conta de teste? Onboarding e categorias serão limpos.")) return;
    setResetando(id);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    await fetch("/api/webmaster/resetar-conta-teste", {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
    });
    setResetando(null);
  }

  async function excluirFotografo() {
    if (!modalExcluir) return;
    setExcluindo(true);
    setErroExcluir("");
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/webmaster/excluir-fotografo", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({ fotografo_id: modalExcluir.id }),
    });
    if (!res.ok) {
      const body = await res.json();
      setErroExcluir(body.error ?? "Erro ao excluir.");
      setExcluindo(false);
      return;
    }
    setStats((prev) => prev.filter((f) => f.id !== modalExcluir.id));
    setModalExcluir(null);
    setConfirmEmail("");
    setExcluindo(false);
  }

  const pendentes = stats.filter((f) => !f.aprovado);
  const lista     = filtro === "pendentes" ? pendentes : stats;

  return (
    <div>
      {/* Stats resumo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 32 }}>
        {[
          { label: "Total fotógrafos",    value: stats.length,                                                         color: "#2563EB" },
          { label: "Pendentes aprovação", value: pendentes.length,                                                      color: "#F59E0B" },
          { label: "Aprovados",           value: stats.filter((f) => f.aprovado).length,                               color: "#059669" },
          { label: "Total de fotos",      value: stats.reduce((a, f) => a + f.total_fotos, 0).toLocaleString("pt-BR"), color: "#6B7280" },
          { label: "Armazenamento total", value: formatGB(stats.reduce((a, f) => a + f.total_bytes, 0)),               color: "#7C3AED" },
        ].map((item) => (
          <div key={item.label} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "16px 20px" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: item.color, letterSpacing: "-0.03em" }}>{item.value}</div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2, fontWeight: 500 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Pendentes — destaque */}
      {pendentes.length > 0 && (
        <div style={{ background: "rgba(245,158,11,0.06)", border: "0.5px solid rgba(245,158,11,0.35)", borderRadius: 12, padding: "20px 24px", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 16 }}>⏳</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#92400E" }}>
              {pendentes.length} cadastro{pendentes.length !== 1 ? "s" : ""} aguardando aprovação
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pendentes.map((f) => (
              <div key={f.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{f.nome_completo}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{f.nome_empresa} · {f.email}</div>
                </div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", flexShrink: 0 }}>
                  {new Date(f.created_at).toLocaleDateString("pt-BR")}
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => aprovar(f.id, true)}
                    disabled={pendingIds.has(f.id)}
                    style={{ padding: "7px 18px", borderRadius: 8, border: "none", background: pendingIds.has(f.id) ? "#D1FAE5" : "#059669", color: "#fff", fontSize: 12, fontWeight: 700, cursor: pendingIds.has(f.id) ? "default" : "pointer" }}
                  >
                    {pendingIds.has(f.id) ? "Aprovando…" : "✓ Aprovar"}
                  </button>
                  <button
                    onClick={() => { setModalExcluir(f); setConfirmEmail(""); setErroExcluir(""); }}
                    disabled={pendingIds.has(f.id)}
                    style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "rgba(239,68,68,0.1)", color: "#EF4444", fontSize: 12, fontWeight: 700, cursor: pendingIds.has(f.id) ? "default" : "pointer" }}
                  >
                    ✕ Recusar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabela completa */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>Fotógrafos</div>
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
          <div style={{ padding: "40px", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
        ) : lista.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>
            {filtro === "pendentes" ? "Nenhum cadastro pendente. 🎉" : "Nenhum fotógrafo cadastrado."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 900, borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--color-background-secondary)" }}>
                  {["Nome / Empresa", "Email", "Plano", "Expira", "Status", "Clientes", "Galerias", "Fotos", "Uso", "Limite", "Cadastro", "Recursos", "Ação"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "0.5px solid var(--color-border-tertiary)", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lista.map((f, i) => (
                  <tr key={f.id} style={{ borderBottom: i < lista.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{f.nome_completo}</div>
                      <div style={{ color: "var(--color-text-secondary)", fontSize: 11 }}>{f.nome_empresa}</div>
                    </td>
                    <td style={{ padding: "12px 14px", color: "var(--color-text-secondary)" }}>{f.email}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <Badge color={PLANO_COLOR[f.plano] ?? "#6B7280"}>{f.plano}</Badge>
                    </td>
                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                      {(() => {
                        const exp = f.plano_expira_em;
                        if (!exp) return <span style={{ color: "var(--color-text-secondary)", fontSize: 11 }}>—</span>;
                        const d    = new Date(exp);
                        const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
                        const txt  = d.toLocaleDateString("pt-BR");
                        if (diff < 0)  return <span style={{ color: "#EF4444",  fontSize: 11, fontWeight: 600 }}>Expirado</span>;
                        if (diff <= 7) return <span style={{ color: "#B45309",  fontSize: 11, fontWeight: 600 }}>⚠ {txt}</span>;
                        return <span style={{ color: "#059669", fontSize: 11 }}>{txt}</span>;
                      })()}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      {f.aprovado ? <Badge color="#059669">Aprovado</Badge> : <Badge color="#F59E0B">Pendente</Badge>}
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "center", color: "var(--color-text-primary)", fontWeight: 500 }}>{f.total_clientes}</td>
                    <td style={{ padding: "12px 14px", textAlign: "center", color: "var(--color-text-primary)", fontWeight: 500 }}>{f.total_galerias}</td>
                    <td style={{ padding: "12px 14px", textAlign: "center", color: "var(--color-text-primary)", fontWeight: 500 }}>{f.total_fotos.toLocaleString("pt-BR")}</td>
                    <td style={{ padding: "12px 14px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>{formatGB(f.total_bytes)}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <LimiteFotosCell
                        inicial={f.limite_fotos_custom}
                        planLimite={planLimits[f.plano] ?? null}
                      />
                    </td>
                    <td style={{ padding: "12px 14px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                      {new Date(f.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <RecursosCell fotografoId={f.id} />
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <button
                          onClick={() => aprovar(f.id, !f.aprovado)}
                          disabled={pendingIds.has(f.id)}
                          style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: f.aprovado ? "rgba(239,68,68,0.1)" : "rgba(5,150,105,0.1)", color: f.aprovado ? "#EF4444" : "#059669", fontSize: 11, fontWeight: 600, cursor: pendingIds.has(f.id) ? "default" : "pointer", opacity: pendingIds.has(f.id) ? 0.6 : 1, whiteSpace: "nowrap" }}
                        >
                          {pendingIds.has(f.id) ? "…" : f.aprovado ? "Suspender" : "Aprovar"}
                        </button>
                        <button
                          onClick={() => { setModalExcluir(f); setConfirmEmail(""); setErroExcluir(""); }}
                          style={{ padding: "5px 10px", borderRadius: 7, border: "none", background: "rgba(239,68,68,0.08)", color: "#EF4444", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
                          title="Excluir conta e todos os dados"
                        >
                          Excluir
                        </button>
                        {f.plano !== "profissional" && (
                          <button
                            onClick={() => abrirAtivacao(f.id, f.nome_empresa || f.nome_completo)}
                            disabled={ativando === f.id}
                            title="Ativar plano Profissional manualmente"
                            style={{ padding: "4px 10px", borderRadius: 6, border: "0.5px solid rgba(37,99,235,0.4)", background: "rgba(37,99,235,0.08)", color: "#2563EB", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                          >
                            {ativando === f.id ? "…" : "✓ Ativar Pro"}
                          </button>
                        )}
                        {f.email === "fernando.agrelaws@gmail.com" && (
                          <button
                            onClick={() => resetarContaTeste(f.id)}
                            disabled={resetando === f.id}
                            title="Reiniciar conta de teste"
                            style={{ padding: "4px 10px", borderRadius: 6, border: "0.5px solid rgba(124,58,237,0.4)", background: "rgba(124,58,237,0.08)", color: "#7C3AED", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                          >
                            {resetando === f.id ? "…" : "🔄 Reiniciar"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal exclusão */}
      {modalExcluir && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
          onClick={(e) => e.target === e.currentTarget && !excluindo && setModalExcluir(null)}
        >
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 30px", width: 420, boxShadow: "0 8px 40px rgba(0,0,0,0.25)" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#EF4444", marginBottom: 8 }}>⚠️ Excluir conta permanentemente</div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 20, lineHeight: 1.6 }}>
              Esta ação é <strong>irreversível</strong>. Todos os dados de{" "}
              <strong style={{ color: "var(--color-text-primary)" }}>{modalExcluir.nome_completo}</strong>{" "}
              serão apagados: galerias, fotos, pedidos, financeiro, CRM e a conta de acesso.
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                Digite o email do fotógrafo para confirmar
              </div>
              <input
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={modalExcluir.email}
                autoFocus
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, boxSizing: "border-box", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 13, color: "var(--color-text-primary)", outline: "none" }}
              />
            </div>
            {erroExcluir && (
              <div style={{ fontSize: 12, color: "#EF4444", marginBottom: 12, padding: "8px 12px", background: "rgba(239,68,68,0.07)", borderRadius: 7 }}>
                {erroExcluir}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => { setModalExcluir(null); setConfirmEmail(""); setErroExcluir(""); }}
                disabled={excluindo}
                style={{ flex: 1, padding: "9px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={excluirFotografo}
                disabled={excluindo || confirmEmail.trim() !== modalExcluir.email}
                style={{ flex: 2, padding: "9px", borderRadius: 8, border: "none", background: (excluindo || confirmEmail.trim() !== modalExcluir.email) ? "rgba(239,68,68,0.3)" : "#EF4444", color: "#fff", fontSize: 13, fontWeight: 700, cursor: (excluindo || confirmEmail.trim() !== modalExcluir.email) ? "default" : "pointer" }}
              >
                {excluindo ? "Excluindo…" : "Excluir tudo permanentemente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ativar plano */}
      {modalAtivacao && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}
          onClick={(e) => { if (e.target === e.currentTarget) setModalAtivacao(null); }}
        >
          <div style={{ background: "var(--color-background-primary)", borderRadius: 14, padding: "28px 30px", width: 420, boxShadow: "0 8px 40px rgba(0,0,0,0.25)" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 4 }}>Ativar Plano</div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 20 }}>{modalAtivacao.nome}</div>

            {/* Seleção do plano */}
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 8 }}>Plano</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
              {planosConfig.filter((p) => p.codigo !== "gratuito").map((p) => {
                const sel = planoSelecionado?.id === p.id;
                const preco = periodoAtivacao === "anual" && p.preco_anual != null ? p.preco_anual : p.preco;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPlanoSelecionado(p)}
                    style={{
                      padding: "10px 14px", borderRadius: 8, cursor: "pointer", textAlign: "left",
                      border: sel ? "2px solid #2563EB" : "0.5px solid var(--color-border-secondary)",
                      background: sel ? "rgba(37,99,235,0.06)" : "transparent",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: sel ? "#2563EB" : "var(--color-text-primary)" }}>
                      {p.nome}
                      {p.eh_campanha && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 8, background: "rgba(245,158,11,0.15)", color: "#B45309" }}>CAMPANHA</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
                      R${Number(preco).toFixed(2).replace(".", ",")} · {p.limite_fotos != null ? `${p.limite_fotos.toLocaleString("pt-BR")} fotos` : "fotos ilimitadas"}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Período */}
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 8 }}>Período</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              {(["mensal", "anual"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodoAtivacao(p)}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700,
                    border: periodoAtivacao === p ? "2px solid #2563EB" : "0.5px solid var(--color-border-secondary)",
                    background: periodoAtivacao === p ? "rgba(37,99,235,0.08)" : "transparent",
                    color: periodoAtivacao === p ? "#2563EB" : "var(--color-text-secondary)",
                  }}
                >
                  {p === "mensal" ? "Mensal (31d)" : "Anual (365d)"}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => { setModalAtivacao(null); setPlanoSelecionado(null); }}
                disabled={!!ativando}
                style={{ flex: 1, padding: "9px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarAtivacao}
                disabled={!!ativando || !planoSelecionado}
                style={{ flex: 2, padding: "9px", borderRadius: 8, border: "none", background: (ativando || !planoSelecionado) ? "rgba(37,99,235,0.3)" : "#2563EB", color: "#fff", fontSize: 13, fontWeight: 700, cursor: (ativando || !planoSelecionado) ? "default" : "pointer" }}
              >
                {ativando ? "Ativando…" : `Ativar — ${periodoAtivacao}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
