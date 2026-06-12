"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { ClienteSelect } from "@/app/(dashboard)/entrega/_components/ClienteSelect";
import { LaminasUpload } from "@/app/(dashboard)/album/_components/LaminasUpload";
import { Field } from "@/components/ui/Field";
import { inputStyle } from "@/lib/styles";
import type { AlbumSelecao, AlbumComentario, AlbumLamina, FotografoAlbumModelo } from "@/lib/supabase/types";

type StatusAlbum = "rascunho" | "ativa" | "aguardando_revisao" | "aprovado" | "encerrada";

const STATUS_LABEL: Record<StatusAlbum, string> = {
  rascunho:          "Rascunho — cliente não consegue acessar",
  ativa:             "Ativa — cliente pode visualizar e comentar",
  aguardando_revisao: "Aguardando revisão — cliente enviou comentários",
  aprovado:          "Aprovado — cliente aprovou o álbum",
  encerrada:         "Encerrada — acesso bloqueado",
};

const STATUS_BADGE: Record<StatusAlbum, { bg: string; color: string; label: string }> = {
  rascunho:          { bg: "rgba(100,116,139,0.12)", color: "#64748B",  label: "Rascunho" },
  ativa:             { bg: "rgba(16,185,129,0.12)",  color: "#059669",  label: "Ativa" },
  aguardando_revisao:{ bg: "rgba(245,158,11,0.12)",  color: "#B45309",  label: "Ag. revisão" },
  aprovado:          { bg: "rgba(5,150,105,0.12)",   color: "#059669",  label: "Aprovado ✓" },
  encerrada:         { bg: "rgba(100,116,139,0.10)", color: "#94A3B8",  label: "Encerrada" },
};

const appUrl =
  typeof window !== "undefined"
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL ?? "https://usefokio.com.br");

function BotaoSalvar({ saving, disabled, onClick }: { saving: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <button
        onClick={onClick}
        disabled={saving || disabled}
        style={{
          padding: "9px 24px", borderRadius: 8,
          background: saving || disabled ? "#93C5FD" : "#2563EB",
          color: "#fff", border: "none",
          fontSize: 13, fontWeight: 700,
          cursor: saving || disabled ? "not-allowed" : "pointer",
        }}
      >
        {saving ? "Salvando…" : "Salvar alterações"}
      </button>
    </div>
  );
}

export default function EditarAlbumPage() {
  const { id }        = useParams<{ id: string }>();
  const router        = useRouter();
  const { fotografo } = useFotografo();

  const [selecao,     setSelecao]     = useState<AlbumSelecao | null>(null);
  const [titulo,      setTitulo]      = useState("");
  const [clienteId,   setClienteId]   = useState("");
  const [modeloId,    setModeloId]    = useState("");
  const [descricao,   setDescricao]   = useState("");
  const [status,      setStatus]      = useState<StatusAlbum>("ativa");
  const [modelos,     setModelos]     = useState<FotografoAlbumModelo[]>([]);
  const [comentarios, setComentarios] = useState<(AlbumComentario & { album_laminas?: { nome_arquivo: string | null; ordem: number } | null })[]>([]);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");
  const [copiado,     setCopiado]     = useState(false);
  const [carregando,  setCarregando]  = useState(true);
  const [excluindo,   setExcluindo]   = useState(false);
  const [confirmarExcluir, setConfirmarExcluir] = useState(false);

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("album_selecoes").select("*, clientes(nome)").eq("id", id).single(),
      supabase.from("fotografo_album_modelos").select("*").eq("fotografo_id", fotografo.id).order("ordem"),
      supabase.from("album_comentarios")
        .select("*, album_laminas(nome_arquivo, ordem)")
        .eq("selecao_id", id)
        .order("created_at"),
    ]).then(([{ data: s }, { data: m }, { data: c }]) => {
      if (s) {
        setSelecao(s as AlbumSelecao);
        setTitulo(s.titulo);
        setClienteId(s.cliente_id ?? "");
        setModeloId(s.modelo_id ?? "");
        setDescricao(s.descricao ?? "");
        setStatus(s.status as StatusAlbum);
      }
      setModelos((m as FotografoAlbumModelo[]) ?? []);
      setComentarios((c as any[]) ?? []);
      setCarregando(false);
    });
  }, [fotografo, id]);

  async function handleSave() {
    if (!titulo.trim()) { setError("Título é obrigatório."); return; }
    setSaving(true);
    setError("");
    const modelo = modelos.find((m) => m.id === modeloId) ?? null;
    const supabase = createClient();
    const { error: err } = await supabase
      .from("album_selecoes")
      .update({
        titulo:            titulo.trim(),
        cliente_id:        clienteId || null,
        modelo_id:         modeloId  || null,
        descricao:         descricao.trim() || null,
        status,
        modelo_nome:       modelo?.nome ?? selecao?.modelo_nome ?? null,
        modelo_largura_cm: modelo?.largura_cm ?? selecao?.modelo_largura_cm ?? null,
        modelo_altura_cm:  modelo?.altura_cm ?? selecao?.modelo_altura_cm ?? null,
        updated_at:        new Date().toISOString(),
      })
      .eq("id", id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    router.push("/album");
  }

  async function handleExcluir() {
    setExcluindo(true);
    const supabase = createClient();
    // Remover lâminas do storage
    const { data: lams } = await supabase.from("album_laminas").select("storage_path").eq("selecao_id", id);
    if (lams && lams.length > 0) {
      await supabase.storage.from("galerias").remove(lams.map((l: any) => l.storage_path));
    }
    await supabase.from("album_selecoes").delete().eq("id", id);
    router.push("/album");
  }

  async function toggleResolvido(comentarioId: string, atual: boolean) {
    const supabase = createClient();
    await supabase
      .from("album_comentarios")
      .update({ resolvido: !atual, updated_at: new Date().toISOString() })
      .eq("id", comentarioId);
    setComentarios((prev) =>
      prev.map((c) => c.id === comentarioId ? { ...c, resolvido: !atual } : c)
    );
  }

  const linkAcesso = `${appUrl}/acesso/album/${id}`;

  const copiar = async () => {
    await navigator.clipboard.writeText(linkAcesso);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const enviarWhatsapp = () => {
    const cliente = (selecao as any)?.clientes?.nome ?? "cliente";
    const msg = encodeURIComponent(
      `Olá${cliente ? " " + cliente : ""}! Suas lâminas de álbum "${titulo}" estão prontas para revisão.\n\nAcesse o link abaixo, visualize cada página e clique para adicionar comentários:\n${linkAcesso}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  if (carregando) {
    return (
      <div style={{ padding: "60px 30px", textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>
        Carregando…
      </div>
    );
  }

  const pendentes  = comentarios.filter((c) => !c.resolvido).length;
  const st         = STATUS_BADGE[status];

  return (
    <div style={{ padding: "26px 30px", maxWidth: 720 }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => router.push("/album")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 13, padding: 0 }}
          >
            ← Álbuns
          </button>
          <span style={{ color: "var(--color-border-secondary)" }}>/</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>{titulo || "Editar álbum"}</span>
          <span style={{
            marginLeft: 4, padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600,
            background: st.bg, color: st.color,
          }}>
            {st.label}
          </span>
        </div>
        <BotaoSalvar saving={saving} disabled={!titulo.trim()} onClick={handleSave} />
      </div>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#EF4444" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Link de acesso */}
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "20px 28px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
            Acesso do cliente
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div style={{
              ...inputStyle as any, flex: 1, minWidth: 200,
              display: "flex", alignItems: "center",
              fontSize: 12, color: "var(--color-text-secondary)",
              fontFamily: "monospace", overflow: "hidden",
              textOverflow: "ellipsis", whiteSpace: "nowrap",
              userSelect: "all",
            }}>
              {linkAcesso}
            </div>
            <button
              onClick={copiar}
              style={{
                padding: "0 16px", borderRadius: 8, height: 38,
                border: "0.5px solid var(--color-border-secondary)",
                background: copiado ? "rgba(16,185,129,0.1)" : "var(--color-background-secondary)",
                color: copiado ? "#059669" : "var(--color-text-secondary)",
                fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0, transition: "all 0.15s",
              }}
            >
              {copiado ? "✓ Copiado" : "Copiar"}
            </button>
            <button
              onClick={enviarWhatsapp}
              style={{
                padding: "0 16px", borderRadius: 8, height: 38,
                border: "0.5px solid rgba(34,197,94,0.3)",
                background: "rgba(34,197,94,0.08)",
                color: "#16A34A",
                fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0,
              }}
            >
              WhatsApp
            </button>
          </div>
          {status !== "ativa" && status !== "aguardando_revisao" && (
            <div style={{ marginTop: 10, padding: "7px 12px", borderRadius: 7, background: "rgba(245,158,11,0.08)", border: "0.5px solid rgba(245,158,11,0.25)", fontSize: 12, color: "#B45309" }}>
              O status atual é <strong>{st.label}</strong>. Mude para <strong>Ativa</strong> para o cliente conseguir acessar.
            </div>
          )}
        </div>

        {/* Dados gerais */}
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "24px 28px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>
            Dados da seleção
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Título *">
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} style={inputStyle} />
            </Field>

            <Field label="Cliente">
              <ClienteSelect value={clienteId} onChange={(id) => setClienteId(id)} />
            </Field>

            <Field label="Modelo de álbum">
              <select value={modeloId} onChange={(e) => setModeloId(e.target.value)} style={inputStyle}>
                <option value="">Selecionar modelo…</option>
                {modelos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome} ({m.largura_cm}×{m.altura_cm} cm)
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Descrição / observações">
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={2}
                style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
              />
            </Field>

            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value as StatusAlbum)} style={inputStyle}>
                {(Object.keys(STATUS_LABEL) as StatusAlbum[]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
            </Field>
          </div>

          <div style={{ marginTop: 20 }}>
            <BotaoSalvar saving={saving} disabled={!titulo.trim()} onClick={handleSave} />
          </div>
        </div>

        {/* Lâminas */}
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "20px 28px" }}>
          <LaminasUpload
            selecaoId={id}
            fotografoId={fotografo?.id ?? ""}
          />
        </div>

        {/* Comentários do cliente */}
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "20px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Comentários do cliente
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {pendentes > 0 && (
                <span style={{ padding: "2px 10px", borderRadius: 20, background: "rgba(239,68,68,0.1)", color: "#EF4444", fontSize: 11, fontWeight: 700 }}>
                  {pendentes} pendente{pendentes !== 1 ? "s" : ""}
                </span>
              )}
              {comentarios.length > 0 && (
                <button
                  onClick={() => router.push(`/album/${id}/revisao`)}
                  style={{
                    padding: "4px 12px", borderRadius: 6, border: "0.5px solid #2563EB",
                    background: "rgba(37,99,235,0.06)", color: "#2563EB",
                    fontSize: 11, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  Ver revisão visual →
                </button>
              )}
            </div>
          </div>

          {comentarios.length === 0 ? (
            <div style={{ padding: "20px 0", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>
              Nenhum comentário ainda. O cliente adiciona ao visualizar o álbum.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {comentarios.map((c, idx) => {
                const lam = c.album_laminas;
                return (
                  <div key={c.id} style={{
                    display: "flex", gap: 12, padding: "12px 14px",
                    borderRadius: 9, border: "0.5px solid var(--color-border-tertiary)",
                    background: c.resolvido ? "transparent" : "rgba(37,99,235,0.03)",
                    opacity: c.resolvido ? 0.6 : 1,
                  }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                      background: c.resolvido ? "var(--color-border-tertiary)" : "#2563EB",
                      color: c.resolvido ? "var(--color-text-secondary)" : "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700,
                    }}>
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>
                        {lam
                          ? `Lâmina ${(lam.ordem ?? 0) + 1}${lam.nome_arquivo ? ` · ${lam.nome_arquivo}` : ""}`
                          : "Lâmina removida"}
                        <span style={{ marginLeft: 8, opacity: 0.7 }}>
                          pos. {c.pos_x.toFixed(1)}%, {c.pos_y.toFixed(1)}%
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.5 }}>
                        {c.texto}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleResolvido(c.id, c.resolvido)}
                      style={{
                        flexShrink: 0, padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                        border: "0.5px solid var(--color-border-secondary)",
                        background: c.resolvido ? "var(--color-background-secondary)" : "rgba(16,185,129,0.08)",
                        color: c.resolvido ? "var(--color-text-secondary)" : "#059669",
                        cursor: "pointer",
                      }}
                    >
                      {c.resolvido ? "Reabrir" : "✓ Resolver"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Botão salvar — repetido no final */}
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
            Salvar todas as alterações acima
          </span>
          <BotaoSalvar saving={saving} disabled={!titulo.trim()} onClick={handleSave} />
        </div>

        {/* Zona de perigo — excluir */}
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid rgba(239,68,68,0.2)", borderRadius: 14, padding: "20px 28px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#EF4444", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
            Zona de perigo
          </div>
          {!confirmarExcluir ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                Excluir permanentemente esta seleção de álbum, todas as lâminas e comentários.
              </span>
              <button
                onClick={() => setConfirmarExcluir(true)}
                style={{ padding: "7px 18px", borderRadius: 8, border: "0.5px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.06)", color: "#EF4444", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
              >
                Excluir galeria
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 13, color: "#EF4444", fontWeight: 600, marginBottom: 12 }}>
                Tem certeza? Esta ação é irreversível. As lâminas e comentários serão apagados permanentemente.
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setConfirmarExcluir(false)}
                  style={{ padding: "8px 20px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExcluir}
                  disabled={excluindo}
                  style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#EF4444", color: "#fff", fontSize: 13, fontWeight: 700, cursor: excluindo ? "not-allowed" : "pointer" }}
                >
                  {excluindo ? "Excluindo…" : "Sim, excluir permanentemente"}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
