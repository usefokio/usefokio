"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { gerarSenhaAcesso } from "@/lib/utils";
import type { Cliente } from "@/lib/supabase/types";
import { Field } from "@/components/ui/Field";
import { inputStyle } from "@/lib/styles";

type TabId = "perfil" | "galerias";

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const SEXO_LABELS: Record<string, string> = {
  feminino: "Feminino", masculino: "Masculino", outro: "Outro", nao_declarar: "Não declarar",
};

type GaleriaSelecaoMin = { id: string; titulo: string; status: string; total_fotos: number; created_at: string };
type GaleriaEntregaMin = { id: string; titulo: string; expires_at: string | null; downloads: number; suspensa: boolean; created_at: string };
type AlbumMin          = { id: string; titulo: string; status: string; created_at: string };

// ─── Aba Galerias ─────────────────────────────────────────────────────────────
function TabGalerias({ clienteId, clienteNome }: { clienteId: string; clienteNome: string }) {
  const [selecoes,  setSelecoes]  = useState<GaleriaSelecaoMin[]>([]);
  const [entregas,  setEntregas]  = useState<GaleriaEntregaMin[]>([]);
  const [albuns,    setAlbuns]    = useState<AlbumMin[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("galerias_selecao").select("id, titulo, status, total_fotos, created_at").eq("cliente_id", clienteId).order("created_at", { ascending: false }),
      supabase.from("galerias_entrega").select("id, titulo, expires_at, downloads, suspensa, created_at").eq("cliente_id", clienteId).order("created_at", { ascending: false }),
      supabase.from("album_selecoes").select("id, titulo, status, created_at").eq("cliente_id", clienteId).order("created_at", { ascending: false }),
    ]).then(([{ data: s }, { data: e }, { data: a }]) => {
      setSelecoes((s as GaleriaSelecaoMin[]) ?? []);
      setEntregas((e as GaleriaEntregaMin[]) ?? []);
      setAlbuns((a as AlbumMin[]) ?? []);
      setLoading(false);
    });
  }, [clienteId]);

  const total = selecoes.length + entregas.length + albuns.length;

  if (loading) return <div style={{ padding: "40px 24px", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>;

  const fmtData = (s: string) => new Date(s).toLocaleDateString("pt-BR");
  const fmtExpira = (e: GaleriaEntregaMin) => {
    if (e.suspensa) return { label: "Suspensa", color: "#B45309", bg: "rgba(245,158,11,0.10)" };
    if (!e.expires_at) return { label: "Sem prazo", color: "#6B7280", bg: "rgba(107,114,128,0.08)" };
    const dias = Math.round((new Date(e.expires_at).getTime() - Date.now()) / 86_400_000);
    if (dias < 0) return { label: "Expirado", color: "#EF4444", bg: "rgba(239,68,68,0.08)" };
    if (dias <= 7) return { label: `${dias}d restantes`, color: "#B45309", bg: "rgba(245,158,11,0.10)" };
    return { label: `Expira ${new Date(e.expires_at).toLocaleDateString("pt-BR")}`, color: "#059669", bg: "rgba(16,185,129,0.08)" };
  };

  const STATUS_SEL: Record<string, { label: string; color: string; bg: string }> = {
    rascunho:           { label: "Rascunho",     color: "#64748B", bg: "rgba(100,116,139,0.10)" },
    ativa:              { label: "Ativa",         color: "#059669", bg: "rgba(16,185,129,0.10)"  },
    encerrada:          { label: "Encerrada",     color: "#EF4444", bg: "rgba(239,68,68,0.10)"   },
    aguardando_revisao: { label: "Ag. revisão",   color: "#B45309", bg: "rgba(245,158,11,0.10)"  },
  };
  const STATUS_ALB: Record<string, { label: string; color: string; bg: string }> = {
    rascunho:           { label: "Rascunho",     color: "#64748B", bg: "rgba(100,116,139,0.10)" },
    ativa:              { label: "Ativa",         color: "#059669", bg: "rgba(16,185,129,0.10)"  },
    aguardando_revisao: { label: "Ag. revisão",   color: "#B45309", bg: "rgba(245,158,11,0.10)"  },
    aprovado:           { label: "Aprovado",      color: "#2563EB", bg: "rgba(37,99,235,0.10)"   },
    encerrada:          { label: "Encerrada",     color: "#EF4444", bg: "rgba(239,68,68,0.10)"   },
  };

  const cardStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "11px 16px", borderRadius: 9,
    border: "0.5px solid var(--color-border-tertiary)",
    background: "var(--color-background-primary)",
    textDecoration: "none", gap: 12,
  };
  const badge = (label: string, color: string, bg: string) => (
    <span style={{ fontSize: 11, fontWeight: 600, color, background: bg, padding: "2px 8px", borderRadius: 10, whiteSpace: "nowrap" }}>{label}</span>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Seleção ── */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Seleção de fotos ({selecoes.length})
          </div>
          <Link href={`/selecao/nova?cliente=${clienteId}`} style={{ fontSize: 12, color: "#2563EB", textDecoration: "none", fontWeight: 600 }}>+ Nova</Link>
        </div>
        {selecoes.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", padding: "12px 16px", borderRadius: 9, border: "0.5px dashed var(--color-border-secondary)" }}>Nenhuma galeria de seleção.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {selecoes.map((g) => {
              const st = STATUS_SEL[g.status] ?? { label: g.status, color: "#6B7280", bg: "rgba(107,114,128,0.08)" };
              return (
                <Link key={g.id} href={`/selecao/${g.id}`} style={cardStyle}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.titulo}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{fmtData(g.created_at)} · {g.total_fotos} foto{g.total_fotos !== 1 ? "s" : ""}</div>
                  </div>
                  {badge(st.label, st.color, st.bg)}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Entrega ── */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Entrega de fotos ({entregas.length})
          </div>
          <Link href={`/entrega/nova?cliente=${clienteId}`} style={{ fontSize: 12, color: "#7C3AED", textDecoration: "none", fontWeight: 600 }}>+ Nova</Link>
        </div>
        {entregas.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", padding: "12px 16px", borderRadius: 9, border: "0.5px dashed var(--color-border-secondary)" }}>Nenhuma galeria de entrega.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {entregas.map((g) => {
              const exp = fmtExpira(g);
              return (
                <Link key={g.id} href={`/entrega/${g.id}/editar`} style={cardStyle}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.titulo}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{fmtData(g.created_at)} · {g.downloads} download{g.downloads !== 1 ? "s" : ""}</div>
                  </div>
                  {badge(exp.label, exp.color, exp.bg)}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Álbuns ── */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Álbuns ({albuns.length})
          </div>
          <Link href={`/album/nova?cliente=${clienteId}`} style={{ fontSize: 12, color: "#059669", textDecoration: "none", fontWeight: 600 }}>+ Novo</Link>
        </div>
        {albuns.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", padding: "12px 16px", borderRadius: 9, border: "0.5px dashed var(--color-border-secondary)" }}>Nenhum álbum.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {albuns.map((g) => {
              const st = STATUS_ALB[g.status] ?? { label: g.status, color: "#6B7280", bg: "rgba(107,114,128,0.08)" };
              return (
                <Link key={g.id} href={`/album/${g.id}`} style={cardStyle}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.titulo}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{fmtData(g.created_at)}</div>
                  </div>
                  {badge(st.label, st.color, st.bg)}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {total === 0 && (
        <div style={{ textAlign: "center", padding: "12px 0 4px", fontSize: 12, color: "var(--color-text-secondary)" }}>
          Nenhuma galeria vinculada a <strong>{clienteNome}</strong>.
        </div>
      )}
    </div>
  );
}

function avatarColor(nome: string) {
  const colors = ["#2563EB","#7C3AED","#DB2777","#059669","#D97706","#DC2626","#0891B2"];
  return colors[nome.charCodeAt(0) % colors.length];
}
function initials(nome: string) {
  return nome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

// ─── Componente de exibição da senha ────────────────────────────────────────
function SenhaAcesso({ clienteId, senhaInicial }: { clienteId: string; senhaInicial: string | null }) {
  const [senhaAtual, setSenhaAtual] = useState(senhaInicial ?? "");
  const [novaSenha, setNovaSenha]   = useState<string | null>(null); // prévia pendente
  const [visivel, setVisivel]       = useState(false);
  const [copiado, setCopiado]       = useState(false);
  const [salvando, setSalvando]     = useState(false);

  // Senha exibida: se há prévia pendente mostra ela, senão a atual
  const senhaExibida = novaSenha ?? senhaAtual;
  const temPendente  = novaSenha !== null;

  const copiar = async () => {
    await navigator.clipboard.writeText(senhaExibida);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  // Gera prévia sem salvar
  const gerarPrevia = () => {
    setNovaSenha(gerarSenhaAcesso());
    setVisivel(true); // mostra automaticamente para o fotógrafo ver
    setCopiado(false);
  };

  // Descarta a prévia, volta para a senha atual
  const cancelarPrevia = () => {
    setNovaSenha(null);
    setVisivel(false);
  };

  // Confirma e salva no banco
  const confirmarNovaSenha = async () => {
    if (!novaSenha) return;
    setSalvando(true);
    const supabase = createClient();
    await supabase
      .from("clientes")
      .update({ senha_acesso: novaSenha, updated_at: new Date().toISOString() })
      .eq("id", clienteId);
    setSenhaAtual(novaSenha);
    setNovaSenha(null);
    setSalvando(false);
  };

  return (
    <div>
      {/* Linha principal */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>

        {/* Exibição da senha */}
        <div style={{
          flex: 1, padding: "9px 14px", borderRadius: 8, minWidth: 0,
          border: `0.5px solid ${temPendente ? "rgba(234,179,8,0.5)" : "var(--color-border-secondary)"}`,
          background: temPendente ? "rgba(234,179,8,0.05)" : "var(--color-background-secondary)",
          fontFamily: "monospace",
          fontSize: visivel ? 15 : 14,
          letterSpacing: visivel ? "0.12em" : "0.3em",
          fontWeight: 600,
          color: visivel ? "var(--color-text-primary)" : "var(--color-text-secondary)",
          userSelect: visivel ? "all" : "none",
          transition: "all 0.2s",
        }}>
          {visivel ? senhaExibida : "••••••••"}
        </div>

        {/* Mostrar / ocultar */}
        <button
          onClick={() => setVisivel((v) => !v)}
          title={visivel ? "Ocultar" : "Mostrar senha"}
          style={{ padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", cursor: "pointer", fontSize: 15, color: "var(--color-text-secondary)", flexShrink: 0 }}
        >
          {visivel ? "🙈" : "👁"}
        </button>

        {/* Copiar */}
        <button
          onClick={copiar}
          title="Copiar senha"
          style={{
            padding: "9px 14px", borderRadius: 8, flexShrink: 0,
            border: "0.5px solid var(--color-border-secondary)",
            background: copiado ? "rgba(16,185,129,0.1)" : "var(--color-background-secondary)",
            cursor: "pointer", fontSize: 13, fontWeight: 600,
            color: copiado ? "#059669" : "var(--color-text-secondary)",
            transition: "all 0.15s",
          }}
        >
          {copiado ? "✓ Copiado" : "Copiar"}
        </button>

        {/* Gerar nova (só aparece se não há pendente) */}
        {!temPendente && (
          <button
            onClick={gerarPrevia}
            title="Gerar nova senha"
            style={{ padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", cursor: "pointer", fontSize: 15, color: "var(--color-text-secondary)", flexShrink: 0 }}
          >
            🔄
          </button>
        )}
      </div>

      {/* Aviso + botões de confirmação quando há prévia pendente */}
      {temPendente && (
        <div style={{
          marginTop: 10, padding: "12px 14px",
          background: "rgba(234,179,8,0.06)",
          border: "0.5px solid rgba(234,179,8,0.35)",
          borderRadius: 8,
          display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        }}>
          <span style={{ fontSize: 12, color: "var(--color-text-primary)", flex: 1, minWidth: 180 }}>
            ⚠️ Nova senha gerada. <strong>Confirme para salvar</strong> — a senha anterior deixará de funcionar.
          </span>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              onClick={confirmarNovaSenha}
              disabled={salvando}
              style={{
                padding: "7px 18px", borderRadius: 7,
                background: salvando ? "#93C5FD" : "#2563EB",
                color: "#fff", border: "none",
                fontSize: 12, fontWeight: 700,
                cursor: salvando ? "not-allowed" : "pointer",
                transition: "background 0.15s",
              }}
            >
              {salvando ? "Salvando…" : "✓ Confirmar"}
            </button>
            <button
              onClick={cancelarPrevia}
              disabled={salvando}
              style={{
                padding: "7px 14px", borderRadius: 7,
                background: "transparent",
                color: "var(--color-text-secondary)",
                border: "0.5px solid var(--color-border-secondary)",
                fontSize: 12, cursor: salvando ? "not-allowed" : "pointer",
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {!temPendente && (
        <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: "6px 0 0", lineHeight: 1.5 }}>
          Somente você vê esta senha. O cliente usa para acessar as galerias e não pode alterá-la.
        </p>
      )}
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────
export default function ClienteDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<TabId>("perfil");

  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState<Partial<Cliente>>({});
  const [saving, setSaving]   = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]           = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("clientes").select("*").eq("id", id).single();
      if (!error && data) { setCliente(data); setForm(data); }
      setLoading(false);
    }
    load();
  }, [id]);

  const upd = (k: keyof Cliente, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.nome?.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("clientes")
      .update({
        nome:            form.nome?.trim(),
        email:           form.email?.trim()           || null,
        telefone:        form.telefone?.trim()        || null,
        whatsapp:        form.whatsapp?.trim()        || null,
        instagram:       form.instagram?.trim()       || null,
        cpf:             form.cpf?.trim()             || null,
        observacoes:     form.observacoes?.trim()     || null,
        data_nascimento: form.data_nascimento || null,
        rg:              form.rg?.trim()     || null,
        sexo:            form.sexo           || null,
        cep:             form.cep?.replace(/\D/g,"") || null,
        logradouro:      form.logradouro?.trim()    || null,
        numero:          form.numero?.trim()        || null,
        complemento:     form.complemento?.trim()   || null,
        bairro:          form.bairro?.trim()        || null,
        cidade:          form.cidade?.trim()        || null,
        estado:          form.estado               || null,
        updated_at:      new Date().toISOString(),
      })
      .eq("id", id)
      .select().single();
    setSaving(false);
    if (!error && data) {
      setCliente(data); setForm(data); setEditing(false);
      setSaveMsg("Dados atualizados!");
      setTimeout(() => setSaveMsg(""), 3000);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("clientes").delete().eq("id", id);
    router.push("/clientes");
  };

  if (loading) return (
    <div style={{ padding: "40px 30px", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
  );
  if (!cliente) return (
    <div style={{ padding: "40px 30px", fontSize: 13, color: "var(--color-text-secondary)" }}>
      Cliente não encontrado.{" "}
      <button onClick={() => router.push("/clientes")} style={{ color: "#2563EB", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>Voltar</button>
    </div>
  );

  const cor = avatarColor(cliente.nome);

  return (
    <div style={{ padding: "26px 30px", maxWidth: 780 }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
        <button onClick={() => router.push("/clientes")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 13, padding: 0 }}>
          ← Clientes
        </button>
        <span style={{ color: "var(--color-border-secondary)" }}>/</span>
        <span style={{ fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500 }}>{cliente.nome}</span>
      </div>

      {/* Card topo */}
      <div style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: 12, padding: "20px 22px",
        display: "flex", alignItems: "center", gap: 16, marginBottom: 16,
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%", background: cor, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, fontWeight: 700, color: "#fff",
        }}>
          {initials(cliente.nome)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.01em" }}>{cliente.nome}</div>
          {cliente.email    && <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>{cliente.email}</div>}
          {cliente.telefone && <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>{cliente.telefone}</div>}
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {!editing && (
            <button onClick={() => setEditing(true)} style={{ padding: "7px 14px", borderRadius: 7, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 12, fontWeight: 500, cursor: "pointer", color: "var(--color-text-primary)" }}>
              ✏️ Editar
            </button>
          )}
          <button onClick={() => setConfirmDelete(true)} style={{ padding: "7px 14px", borderRadius: 7, background: "rgba(239,68,68,0.06)", border: "0.5px solid rgba(239,68,68,0.2)", fontSize: 12, fontWeight: 500, cursor: "pointer", color: "#EF4444" }}>
            🗑 Excluir
          </button>
        </div>
      </div>

      {saveMsg && (
        <div style={{ background: "rgba(16,185,129,0.08)", border: "0.5px solid rgba(16,185,129,0.3)", borderRadius: 8, padding: "9px 16px", marginBottom: 12, fontSize: 13, color: "#059669" }}>
          ✓ {saveMsg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, borderBottom: "0.5px solid var(--color-border-tertiary)", marginBottom: 16 }}>
        {(["perfil", "galerias"] as TabId[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 16px", background: "none", border: "none", cursor: "pointer",
            fontSize: 13, fontWeight: tab === t ? 600 : 400,
            color: tab === t ? "var(--color-text-primary)" : "var(--color-text-secondary)",
            borderBottom: tab === t ? "2px solid var(--color-text-primary)" : "2px solid transparent",
            marginBottom: -1,
          }}>
            {t === "perfil" ? "Dados do cliente" : "Galerias"}
          </button>
        ))}
      </div>

      {/* ── Tab: Dados ── */}
      {tab === "perfil" && (
        editing ? (
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "24px 28px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Nome completo *">
                  <input value={form.nome ?? ""} onChange={(e) => upd("nome", e.target.value)} style={inputStyle} placeholder="Nome do cliente" autoFocus />
                </Field>
              </div>
              <Field label="Email">
                <input type="email" value={form.email ?? ""} onChange={(e) => upd("email", e.target.value)} style={inputStyle} placeholder="email@exemplo.com" />
              </Field>
              <Field label="Telefone">
                <input type="tel" value={form.telefone ?? ""} onChange={(e) => upd("telefone", e.target.value)} style={inputStyle} placeholder="(00) 00000-0000" />
              </Field>
              <Field label="WhatsApp">
                <input type="tel" value={form.whatsapp ?? ""} onChange={(e) => upd("whatsapp", e.target.value)} style={inputStyle} placeholder="(00) 00000-0000" />
              </Field>
              <Field label="Instagram">
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--color-text-secondary)" }}>@</span>
                  <input value={form.instagram ?? ""} onChange={(e) => upd("instagram", e.target.value)} style={{ ...inputStyle, paddingLeft: 24 }} placeholder="perfil" />
                </div>
              </Field>
              <Field label="CPF / CNPJ">
                <input value={form.cpf ?? ""} onChange={(e) => upd("cpf", e.target.value)} style={inputStyle} placeholder="000.000.000-00 ou 00.000.000/0001-00" />
              </Field>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Observações">
                  <textarea value={form.observacoes ?? ""} onChange={(e) => upd("observacoes", e.target.value)} placeholder="Notas internas sobre este cliente…" rows={3} style={{ ...inputStyle, resize: "vertical", height: "auto" }} />
                </Field>
              </div>
            </div>

            {/* Dados pessoais + endereço */}
            <div style={{ marginTop: 24, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Dados pessoais</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                <Field label="Data de nascimento">
                  <input type="date" value={form.data_nascimento ?? ""} onChange={(e) => setForm((f) => ({ ...f, data_nascimento: e.target.value }))} style={inputStyle} />
                </Field>
                <Field label="RG">
                  <input value={form.rg ?? ""} onChange={(e) => setForm((f) => ({ ...f, rg: e.target.value }))} placeholder="00.000.000-0" style={inputStyle} />
                </Field>
                <Field label="Sexo">
                  <select value={form.sexo ?? ""} onChange={(e) => setForm((f) => ({ ...f, sexo: e.target.value }))} style={inputStyle}>
                    <option value="">Selecionar…</option>
                    <option value="feminino">Feminino</option>
                    <option value="masculino">Masculino</option>
                    <option value="outro">Outro</option>
                    <option value="nao_declarar">Não declarar</option>
                  </select>
                </Field>
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Endereço</div>
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 14, marginBottom: 14 }}>
                <Field label="CEP">
                  <input value={form.cep ?? ""} onChange={async (e) => {
                    const v = e.target.value;
                    setForm((f) => ({ ...f, cep: v }));
                    const limpo = v.replace(/\D/g,"");
                    if (limpo.length === 8) {
                      try {
                        const r = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
                        const d = await r.json();
                        if (!d.erro) setForm((f) => ({ ...f, logradouro: d.logradouro ?? f.logradouro, bairro: d.bairro ?? f.bairro, cidade: d.localidade ?? f.cidade, estado: d.uf ?? f.estado }));
                      } catch { /* ignora */ }
                    }
                  }} placeholder="00000-000" maxLength={9} style={inputStyle} />
                </Field>
                <Field label="Logradouro">
                  <input value={form.logradouro ?? ""} onChange={(e) => setForm((f) => ({ ...f, logradouro: e.target.value }))} placeholder="Rua, Av., etc." style={inputStyle} />
                </Field>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 14, marginBottom: 14 }}>
                <Field label="Número">
                  <input value={form.numero ?? ""} onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))} placeholder="123" style={inputStyle} />
                </Field>
                <Field label="Complemento">
                  <input value={form.complemento ?? ""} onChange={(e) => setForm((f) => ({ ...f, complemento: e.target.value }))} placeholder="Apto, Bloco, etc." style={inputStyle} />
                </Field>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: 14 }}>
                <Field label="Bairro">
                  <input value={form.bairro ?? ""} onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value }))} placeholder="Bairro" style={inputStyle} />
                </Field>
                <Field label="Cidade">
                  <input value={form.cidade ?? ""} onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))} placeholder="Cidade" style={inputStyle} />
                </Field>
                <Field label="Estado">
                  <select value={form.estado ?? ""} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))} style={inputStyle}>
                    <option value="">UF</option>
                    {ESTADOS_BR.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </Field>
              </div>
            </div>

            <div style={{ marginTop: 22, display: "flex", gap: 10 }}>
              <button onClick={handleSave} disabled={saving || !form.nome?.trim()} style={{ padding: "9px 24px", borderRadius: 8, background: saving ? "#93C5FD" : "#2563EB", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Salvando…" : "Salvar"}
              </button>
              <button onClick={() => { setEditing(false); setForm(cliente); }} style={{ padding: "9px 18px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer" }}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Dados de contato */}
            <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "9px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Contato</span>
              </div>
              {[
                { label: "Email",     value: cliente.email },
                { label: "Telefone",  value: cliente.telefone },
                { label: "WhatsApp",  value: cliente.whatsapp },
                { label: "Instagram", value: cliente.instagram ? `@${cliente.instagram}` : null },
                { label: "CPF/CNPJ",  value: cliente.cpf },
              ].filter(r => r.value).map((row, i, arr) => (
                <div key={row.label} style={{ display: "flex", padding: "11px 20px", borderBottom: i < arr.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
                  <span style={{ fontSize: 13, color: "var(--color-text-secondary)", width: 120, flexShrink: 0 }}>{row.label}</span>
                  <span style={{ fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500 }}>{row.value}</span>
                </div>
              ))}
              {!cliente.email && !cliente.telefone && !cliente.whatsapp && (
                <div style={{ padding: "20px", fontSize: 13, color: "var(--color-text-secondary)", textAlign: "center" }}>
                  Nenhum contato cadastrado.{" "}
                  <button onClick={() => setEditing(true)} style={{ color: "#2563EB", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>Adicionar</button>
                </div>
              )}
            </div>

            {/* Dados pessoais */}
            {(cliente.data_nascimento || cliente.rg || cliente.sexo) && (
              <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "9px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Dados pessoais</span>
                </div>
                {[
                  { label: "Nascimento", value: cliente.data_nascimento ? new Date(cliente.data_nascimento + "T12:00:00").toLocaleDateString("pt-BR") : null },
                  { label: "RG",         value: cliente.rg },
                  { label: "Sexo",       value: cliente.sexo ? (SEXO_LABELS[cliente.sexo] ?? cliente.sexo) : null },
                ].filter(r => r.value).map((row, i, arr) => (
                  <div key={row.label} style={{ display: "flex", padding: "11px 20px", borderBottom: i < arr.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
                    <span style={{ fontSize: 13, color: "var(--color-text-secondary)", width: 120, flexShrink: 0 }}>{row.label}</span>
                    <span style={{ fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500 }}>{row.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Endereço */}
            {(cliente.logradouro || cliente.cidade) && (
              <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "9px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Endereço</span>
                </div>
                <div style={{ padding: "14px 20px", fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.8 }}>
                  {cliente.logradouro && (
                    <div>{cliente.logradouro}{cliente.numero ? `, ${cliente.numero}` : ""}{cliente.complemento ? ` — ${cliente.complemento}` : ""}</div>
                  )}
                  {cliente.bairro && <div>{cliente.bairro}</div>}
                  {(cliente.cidade || cliente.estado) && (
                    <div>{[cliente.cidade, cliente.estado].filter(Boolean).join(" — ")}</div>
                  )}
                  {cliente.cep && <div style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>CEP {cliente.cep}</div>}
                </div>
              </div>
            )}

            {/* Observações */}
            {cliente.observacoes && (
              <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "9px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Observações</span>
                </div>
                <div style={{ padding: "14px 20px", fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {cliente.observacoes}
                </div>
              </div>
            )}

            {/* Senha de acesso */}
            <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "9px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Senha de acesso às galerias</span>
                <span style={{ fontSize: 10, color: "var(--color-text-secondary)", background: "rgba(107,114,128,0.1)", padding: "2px 8px", borderRadius: 10 }}>Visível apenas para você</span>
              </div>
              <div style={{ padding: "16px 20px" }}>
                <SenhaAcesso clienteId={cliente.id} senhaInicial={cliente.senha_acesso} />
              </div>
            </div>

          </div>
        )
      )}

      {/* ── Tab: Galerias ── */}
      {tab === "galerias" && (
        <TabGalerias clienteId={cliente.id} clienteNome={cliente.nome} />
      )}

      {/* Modal exclusão */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 32px", maxWidth: 400, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 10 }}>Excluir cliente?</div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 24, lineHeight: 1.6 }}>
              Esta ação é irreversível. <strong>{cliente.nome}</strong> e todos os dados serão removidos permanentemente.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleDelete} disabled={deleting} style={{ padding: "9px 20px", borderRadius: 8, background: "#EF4444", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: deleting ? "not-allowed" : "pointer" }}>
                {deleting ? "Excluindo…" : "Sim, excluir"}
              </button>
              <button onClick={() => setConfirmDelete(false)} style={{ padding: "9px 18px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
