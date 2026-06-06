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
        nome:        form.nome?.trim(),
        email:       form.email?.trim()       || null,
        telefone:    form.telefone?.trim()    || null,
        whatsapp:    form.whatsapp?.trim()    || null,
        instagram:   form.instagram?.trim()   || null,
        observacoes: form.observacoes?.trim() || null,
        updated_at:  new Date().toISOString(),
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
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Observações">
                  <textarea value={form.observacoes ?? ""} onChange={(e) => upd("observacoes", e.target.value)} placeholder="Notas internas sobre este cliente…" rows={3} style={{ ...inputStyle, resize: "vertical", height: "auto" }} />
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
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "44px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 38, marginBottom: 12 }}>🖼</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>Nenhuma galeria ainda</div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 24 }}>
            Crie uma galeria de seleção ou entrega vinculada a <strong>{cliente.nome}</strong>.
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <Link href={`/selecao/nova?cliente=${cliente.id}`} style={{ padding: "9px 18px", borderRadius: 8, background: "rgba(37,99,235,0.08)", border: "0.5px solid rgba(37,99,235,0.2)", color: "#2563EB", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              🖼 Nova seleção
            </Link>
            <Link href={`/entrega/nova?cliente=${cliente.id}`} style={{ padding: "9px 18px", borderRadius: 8, background: "rgba(139,92,246,0.08)", border: "0.5px solid rgba(139,92,246,0.2)", color: "#7C3AED", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              📦 Nova entrega
            </Link>
          </div>
        </div>
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
