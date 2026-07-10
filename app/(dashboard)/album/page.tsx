"use client";

import { useEffect, useState } from "react";
import { usePersistedState } from "@/lib/hooks/usePersistedState";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { deleteFilesClient } from "@/lib/storage/deleteClient";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { AlbumSelecao } from "@/lib/supabase/types";

type StatusAlbum = "rascunho" | "ativa" | "aguardando_revisao" | "aprovado" | "encerrada";
type Filtro = "todos" | StatusAlbum;

const STATUS_BADGE: Record<StatusAlbum, { bg: string; color: string; label: string }> = {
  rascunho:           { bg: "rgba(100,116,139,0.12)", color: "#64748B",  label: "Rascunho" },
  ativa:              { bg: "rgba(16,185,129,0.12)",  color: "#059669",  label: "Ativa" },
  aguardando_revisao: { bg: "rgba(245,158,11,0.12)",  color: "#B45309",  label: "Ag. revisão" },
  aprovado:           { bg: "rgba(5,150,105,0.12)",   color: "#059669",  label: "Aprovado ✓" },
  encerrada:          { bg: "rgba(100,116,139,0.10)", color: "#94A3B8",  label: "Encerrada" },
};

const appUrl =
  typeof window !== "undefined"
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.usefokio.com.br");

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

// ─── Ícones ───────────────────────────────────────────────────────────────────
const IcoEdit = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IcoTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

export default function AlbumPage() {
  const router        = useRouter();
  const { fotografo } = useFotografo();

  const [selecoes,    setSelecoes]    = useState<AlbumSelecao[]>([]);
  const [carregando,  setCarregando]  = useState(true);
  const [copiando,    setCopiando]    = useState<string | null>(null);
  const [filtro,      setFiltro]      = usePersistedState<Filtro>("album:filtro", "todos");
  const [excluindo,   setExcluindo]   = useState<AlbumSelecao | null>(null);
  const [deletando,   setDeletando]   = useState(false);
  const [menuContato, setMenuContato] = useState<string | null>(null);

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    supabase
      .from("album_selecoes")
      .select("*, clientes(nome, telefone, whatsapp, email)")
      .eq("fotografo_id", fotografo.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setSelecoes((data as AlbumSelecao[]) ?? []);
        setCarregando(false);
      });
  }, [fotografo]);

  async function excluirAlbum() {
    if (!excluindo || !fotografo) return;
    setDeletando(true);
    const supabase = createClient();
    // Limpar arquivos do storage antes de deletar
    const { data: laminas } = await supabase
      .from("album_laminas")
      .select("storage_path, url_publica")
      .eq("selecao_id", excluindo.id);
    if (laminas && laminas.length > 0) {
      const items = (laminas as { storage_path: string; url_publica: string | null }[])
        .map((l) => ({ storage_path: l.storage_path, url_publica: l.url_publica }));
      for (let i = 0; i < items.length; i += 100)
        await deleteFilesClient(items.slice(i, i + 100));
    }
    await supabase.from("album_selecoes").delete().eq("id", excluindo.id).eq("fotografo_id", fotografo.id);
    setSelecoes((prev) => prev.filter((s) => s.id !== excluindo.id));
    setExcluindo(null);
    setDeletando(false);
  }

  async function copiarLink(selecaoId: string) {
    const link = `${appUrl}/acesso/album/${selecaoId}`;
    await navigator.clipboard.writeText(link);
    setCopiando(selecaoId);
    setTimeout(() => setCopiando(null), 2000);
  }

  function enviarWhatsapp(s: AlbumSelecao) {
    const cliente = (s as any).clientes;
    const tel     = cliente?.whatsapp ?? cliente?.telefone ?? "";
    const link    = `${appUrl}/acesso/album/${s.id}`;
    const nome    = cliente?.nome ?? "";
    const msg     = encodeURIComponent(
      `Olá${nome ? " " + nome : ""}! Suas lâminas de álbum "${s.titulo}" estão prontas para revisão.\n\nAcesse o link abaixo, visualize cada página e clique para adicionar seus comentários:\n${link}`
    );
    const numero = tel.replace(/\D/g, "");
    window.open(`https://wa.me/${numero ? numero : ""}?text=${msg}`, "_blank");
  }

  function enviarEmail(s: AlbumSelecao) {
    const cliente = (s as any).clientes;
    const email   = cliente?.email ?? "";
    const link    = `${appUrl}/acesso/album/${s.id}`;
    const nome    = cliente?.nome ?? "";
    const assunto = encodeURIComponent(`Álbum "${s.titulo}" para revisão`);
    const corpo   = encodeURIComponent(
      `Olá${nome ? " " + nome : ""}!\n\nSuas lâminas de álbum "${s.titulo}" estão prontas para revisão. Acesse o link abaixo, visualize cada página e adicione seus comentários:\n${link}`
    );
    window.open(`mailto:${email}?subject=${assunto}&body=${corpo}`, "_blank");
  }

  const menuItemStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
    padding: "9px 10px", borderRadius: 7, border: "none", background: "transparent",
    color: "var(--color-text-primary)", fontSize: 13, cursor: "pointer",
  };

  // Contadores por status
  const contadores: Record<Filtro, number> = {
    todos:              selecoes.length,
    rascunho:           selecoes.filter((s) => s.status === "rascunho").length,
    ativa:              selecoes.filter((s) => s.status === "ativa").length,
    aguardando_revisao: selecoes.filter((s) => s.status === "aguardando_revisao").length,
    aprovado:           selecoes.filter((s) => s.status === "aprovado").length,
    encerrada:          selecoes.filter((s) => s.status === "encerrada").length,
  };

  const filtradas = filtro === "todos"
    ? selecoes
    : selecoes.filter((s) => s.status === filtro);

  const pendentesRevisao = contadores.aguardando_revisao;

  const iconBtnStyle = (color?: string): React.CSSProperties => ({
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 30, height: 30, borderRadius: 7, border: "0.5px solid var(--color-border-secondary)",
    background: "transparent", color: color ?? "var(--color-text-secondary)",
    cursor: "pointer",
  });

  return (
    <div style={{ padding: "26px 30px", maxWidth: 960 }}>

      {/* Modal confirmar exclusão */}
      {excluindo && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }} onClick={() => !deletando && setExcluindo(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 30px", width: 380, boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: "#EF4444" }}>Excluir álbum</h3>
            <p style={{ margin: "0 0 22px", fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
              Tem certeza que deseja excluir <strong style={{ color: "var(--color-text-primary)" }}>{excluindo.titulo}</strong>?<br />Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setExcluindo(null)} disabled={deletando} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}>Cancelar</button>
              <button onClick={excluirAlbum} disabled={deletando} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: "#EF4444", color: "#fff", fontSize: 13, fontWeight: 600, cursor: deletando ? "default" : "pointer" }}>
                {deletando ? "Excluindo…" : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 3px", letterSpacing: "-0.02em" }}>Álbuns</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
            {carregando ? "Carregando…" : `${selecoes.length} álbum${selecoes.length !== 1 ? "ns" : ""}`}
          </p>
        </div>
        <button
          onClick={() => router.push("/album/nova")}
          style={{ padding: "9px 18px", borderRadius: 8, background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
        >
          + Novo álbum
        </button>
      </div>

      {/* Banner revisão pendente */}
      {!carregando && pendentesRevisao > 0 && filtro !== "aguardando_revisao" && (
        <div
          onClick={() => setFiltro("aguardando_revisao")}
          style={{ background: "rgba(245,158,11,0.08)", border: "0.5px solid rgba(245,158,11,0.4)", borderRadius: 10, padding: "12px 16px", marginBottom: 18, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(245,158,11,0.13)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(245,158,11,0.08)")}
        >
          <span style={{ fontSize: 20 }}>💬</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>
              {pendentesRevisao} álbum{pendentesRevisao !== 1 ? "ns" : ""} aguardando revisão
            </div>
            <div style={{ fontSize: 11, color: "#B45309" }}>
              {selecoes.filter((s) => s.status === "aguardando_revisao").map((s) => s.titulo).join(", ")}
            </div>
          </div>
          <span style={{ fontSize: 12, color: "#B45309", fontWeight: 600 }}>Ver →</span>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        {([
          { key: "todos",              label: "Todos" },
          { key: "ativa",              label: "Ativa" },
          { key: "aguardando_revisao", label: "Ag. revisão" },
          { key: "aprovado",           label: "Aprovado" },
          { key: "rascunho",           label: "Rascunho" },
          { key: "encerrada",          label: "Encerrada" },
        ] as { key: Filtro; label: string }[]).map(({ key, label }) => {
          const ativo      = filtro === key;
          const isAtencao  = key === "aguardando_revisao" && pendentesRevisao > 0;
          return (
            <button
              key={key}
              onClick={() => setFiltro(key)}
              style={{
                padding: "5px 14px", borderRadius: 20, border: "0.5px solid", cursor: "pointer", transition: "all 0.15s", fontSize: 12,
                borderColor: ativo ? (isAtencao ? "#B45309" : "var(--color-text-primary)") : (isAtencao ? "rgba(245,158,11,0.5)" : "var(--color-border-tertiary)"),
                background:  ativo ? (isAtencao ? "#B45309" : "var(--color-text-primary)") : (isAtencao ? "rgba(245,158,11,0.08)" : "transparent"),
                color:       ativo ? "#fff" : (isAtencao ? "#92400E" : "var(--color-text-secondary)"),
                fontWeight:  ativo || isAtencao ? 600 : 400,
              }}
            >
              {label} ({contadores[key]})
            </button>
          );
        })}
      </div>

      {/* Lista */}
      {carregando ? (
        <div style={{ padding: "40px 0", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : filtradas.length === 0 ? (
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "52px 24px", textAlign: "center" }}>
          {selecoes.length === 0 ? (
            <>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📖</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>Nenhum álbum ainda</div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 22 }}>Crie um álbum, envie as lâminas e compartilhe o link com o cliente.</div>
              <button onClick={() => router.push("/album/nova")} style={{ padding: "10px 22px", borderRadius: 8, background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}>
                + Criar primeiro álbum
              </button>
            </>
          ) : (
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
              Nenhum álbum com status "{STATUS_BADGE[filtro as StatusAlbum]?.label ?? filtro}"
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtradas.map((s) => {
            const st           = STATUS_BADGE[s.status as StatusAlbum] ?? STATUS_BADGE.rascunho;
            const aguardando   = s.status === "aguardando_revisao";
            const encerrada    = s.status === "encerrada";
            const cliente      = (s as any).clientes;

            return (
              <div
                key={s.id}
                style={{
                  background: aguardando ? "rgba(245,158,11,0.04)" : "var(--color-background-primary)",
                  border: `0.5px solid ${aguardando ? "rgba(245,158,11,0.35)" : "var(--color-border-tertiary)"}`,
                  borderRadius: 10, padding: "14px 18px",
                  display: "flex", alignItems: "center", gap: 14,
                  opacity: encerrada ? 0.65 : 1,
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = aguardando ? "#F59E0B" : "#2563EB")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = aguardando ? "rgba(245,158,11,0.35)" : "var(--color-border-tertiary)")}
              >
                {/* Ícone álbum */}
                <div style={{ width: 42, height: 42, borderRadius: 9, background: aguardando ? "rgba(245,158,11,0.15)" : "var(--color-background-secondary)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                  📖
                </div>

                {/* Info (clicável → abre a VISUALIZAÇÃO do álbum, como nas outras galerias) */}
                <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => router.push(`/album/${s.id}`)}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.titulo}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                    {cliente?.nome ?? "Sem cliente"}
                    {s.modelo_nome && <span> · {s.modelo_nome}</span>}
                    <span> · {formatarData(s.created_at)}</span>
                  </div>
                </div>

                {/* Status badge */}
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: st.bg, color: st.color }}>
                    {st.label}
                  </span>
                </div>

                {/* Ações */}
                <div style={{ flexShrink: 0, display: "flex", gap: 4, position: "relative" }} onClick={(e) => e.stopPropagation()}>
                  {/* Contato com o cliente — menu com as formas de enviar o acesso */}
                  <button
                    onClick={() => setMenuContato(menuContato === s.id ? null : s.id)}
                    title="Entrar em contato com o cliente"
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      border: aguardando ? "0.5px solid rgba(245,158,11,0.5)" : "0.5px solid var(--color-border-secondary)",
                      background: aguardando ? "rgba(245,158,11,0.08)" : "transparent",
                      color: aguardando ? "#B45309" : "var(--color-text-secondary)" }}
                  >💬 Contato</button>
                  {menuContato === s.id && (
                    <>
                      <div style={{ position: "fixed", inset: 0, zIndex: 10 }} onClick={() => setMenuContato(null)} />
                      <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, minWidth: 190, zIndex: 20, padding: 4, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, boxShadow: "0 10px 30px rgba(0,0,0,0.16)" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", padding: "6px 10px 4px" }}>Enviar acesso</div>
                        <button onClick={() => { enviarWhatsapp(s); setMenuContato(null); }} style={menuItemStyle}>📱 WhatsApp</button>
                        <button onClick={() => { enviarEmail(s); setMenuContato(null); }} style={menuItemStyle}>✉️ Email</button>
                        <button onClick={() => { copiarLink(s.id); setMenuContato(null); }} style={menuItemStyle}>🔗 Copiar link</button>
                      </div>
                    </>
                  )}

                  <button
                    onClick={() => router.push(`/album/${s.id}/editar`)}
                    title="Editar"
                    style={iconBtnStyle()}
                  ><IcoEdit /></button>

                  <button
                    onClick={() => setExcluindo(s)}
                    title="Excluir álbum"
                    style={{ ...iconBtnStyle("#EF4444"), border: "0.5px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.04)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.10)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.04)")}
                  ><IcoTrash /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
