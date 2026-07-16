"use client";

// Tela de VISUALIZAÇÃO do álbum (read-only). Visualizar ≠ editar: aqui o fotógrafo vê todas as
// informações relevantes do álbum sem alterar nada. Ações de mudança ficam em Editar/Revisão.
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { garantirSenhaCliente } from "@/lib/clientes/garantirSenha";
import { ClienteLink } from "@/components/ui/ClienteLink";
import type { AlbumSelecao, AlbumLamina, AlbumComentario } from "@/lib/supabase/types";

type StatusAlbum = "rascunho" | "ativa" | "aguardando_revisao" | "aprovado" | "encerrada";

const STATUS_BADGE: Record<StatusAlbum, { bg: string; color: string; label: string }> = {
  rascunho:           { bg: "rgba(100,116,139,0.12)", color: "#64748B", label: "Rascunho" },
  ativa:              { bg: "rgba(16,185,129,0.12)",  color: "#059669", label: "Ativa" },
  aguardando_revisao: { bg: "rgba(245,158,11,0.12)",  color: "#B45309", label: "Ag. revisão" },
  aprovado:           { bg: "rgba(5,150,105,0.12)",   color: "#059669", label: "Aprovado ✓" },
  encerrada:          { bg: "rgba(100,116,139,0.10)", color: "#94A3B8", label: "Encerrada" },
};

function fmtData(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

const btnStyle: React.CSSProperties = {
  padding: "8px 16px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)",
  background: "transparent", color: "var(--color-text-primary)", fontSize: 13, fontWeight: 600, cursor: "pointer",
  textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6,
};

export default function VisualizarAlbumPage() {
  const { id }        = useParams<{ id: string }>();
  const router        = useRouter();
  const { fotografo } = useFotografo();

  const [selecao,     setSelecao]     = useState<(AlbumSelecao & { clientes?: { nome: string | null } | null }) | null>(null);
  const [laminas,     setLaminas]     = useState<AlbumLamina[]>([]);
  const [comentarios, setComentarios] = useState<AlbumComentario[]>([]);
  const [carregando,  setCarregando]  = useState(true);
  const [copiado,     setCopiado]     = useState(false);
  const [reativando,  setReativando]  = useState(false);
  const [versaoVista, setVersaoVista] = useState<number | null>(null); // null = versão corrente

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("album_selecoes").select("*, clientes(id, nome)").eq("id", id).eq("fotografo_id", fotografo.id).maybeSingle(),
      supabase.from("album_laminas").select("*").eq("selecao_id", id).order("ordem").order("created_at"),
      supabase.from("album_comentarios").select("*").eq("selecao_id", id).order("created_at"),
    ]).then(([{ data: s }, { data: l }, { data: c }]) => {
      setSelecao(s as AlbumSelecao & { clientes?: { nome: string | null } | null });
      // Garante que o cliente tenha senha (clientes migrados vieram sem) → acesso passa a exigir senha
      garantirSenhaCliente((s as AlbumSelecao | null)?.cliente_id);
      // Guarda TODAS as versões (o histórico é navegado pelo seletor de versões).
      setLaminas((l as AlbumLamina[]) ?? []);
      setComentarios((c as AlbumComentario[]) ?? []);
      setVersaoVista((s as AlbumSelecao | null)?.versao ?? 1);
      setCarregando(false);
    });
  }, [fotografo, id]);

  const linkAcesso = typeof window !== "undefined" ? `${window.location.origin}/acesso/album/${id}` : "";

  function copiarLink() {
    navigator.clipboard.writeText(linkAcesso).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    });
  }

  // Reativar = reabrir o acesso do cliente (status → ativa), como na galeria de seleção.
  // Não tem relação com versão do álbum.
  async function reativar() {
    if (!selecao) return;
    // Não publicar uma versão sem nenhuma lâmina (cliente veria um álbum vazio e poderia aprovar)
    const temLaminasNaVersao = laminas.some((l) => (l.versao ?? 1) === (selecao.versao ?? 1));
    if (!temLaminasNaVersao) {
      alert("Suba ao menos uma lâmina desta versão antes de enviar ao cliente.");
      router.push(`/album/${id}/editar`);
      return;
    }
    if (!confirm("Reabrir o acesso do cliente? O álbum volta a ficar Ativo para o cliente visualizar, pedir alterações ou aprovar.")) return;
    setReativando(true);
    await createClient().from("album_selecoes").update({ status: "ativa", updated_at: new Date().toISOString() }).eq("id", id);
    setSelecao((s) => s ? { ...s, status: "ativa" } : s);
    setReativando(false);
  }

  // Adicionar nova versão: incrementa a versão do álbum (as lâminas/comentários atuais viram
  // histórico), mantém todas as configurações e leva o fotógrafo a subir as novas imagens.
  // Fica em rascunho até ele reativar/publicar para o cliente aprovar.
  async function adicionarNovaVersao() {
    if (!selecao) return;
    const nova = (selecao.versao ?? 1) + 1;
    if (!confirm(`Criar a versão ${nova} do álbum?\n\nAs lâminas e observações atuais viram histórico. Você vai enviar novas imagens (as configurações do álbum são mantidas). O álbum fica em rascunho até você reabrir o acesso do cliente.`)) return;
    await createClient().from("album_selecoes").update({ versao: nova, status: "rascunho", updated_at: new Date().toISOString() }).eq("id", id);
    router.push(`/album/${id}/editar`);
  }

  if (carregando) {
    return <div style={{ padding: "60px 30px", textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>Carregando…</div>;
  }
  if (!selecao) {
    return <div style={{ padding: "60px 30px", textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>Álbum não encontrado.</div>;
  }

  const st = STATUS_BADGE[selecao.status as StatusAlbum] ?? STATUS_BADGE.rascunho;
  const clienteNome = selecao.clientes?.nome ?? "Sem cliente";
  const clienteId = selecao.clientes?.id ?? null;

  const versaoCorrente = selecao.versao ?? 1;
  const vVista = versaoVista ?? versaoCorrente;
  const ehCorrente = vVista === versaoCorrente;

  // Lâminas/comentários da versão sendo vista (corrente por padrão, ou uma do histórico)
  const laminasVista = laminas.filter((l) => (l.versao ?? 1) === vVista);
  const comentariosVista = comentarios.filter((c) => (c.versao ?? 1) === vVista);
  const comentariosPorLamina = new Map(comentariosVista.map((c) => [c.lamina_id, c]));
  const pendentes = comentariosVista.filter((c) => !c.resolvido).length;

  // Versão final aprovada → mostra o álbum montado (todas as lâminas em grade).
  const modoAlbumFinal = ehCorrente && selecao.status === "aprovado";
  // Corrente em revisão: só as lâminas com observação (foco na ação). Histórico: todas.
  const soComentadas = ehCorrente && !modoAlbumFinal;
  const laminasParaExibir = laminasVista
    .map((l, i) => ({ lamina: l, numero: i + 1, comentario: comentariosPorLamina.get(l.id) }))
    .filter((x) => (soComentadas ? !!x.comentario : true));

  return (
    <div style={{ padding: "26px 30px", maxWidth: 900, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <button onClick={() => router.push("/album")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 13, padding: 0, marginBottom: 18 }}>
        ← Álbuns
      </button>

      {/* Cabeçalho */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "22px 26px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div style={{ width: 48, height: 48, borderRadius: 10, background: "var(--color-background-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>📖</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--color-text-primary)", margin: 0 }}>{selecao.titulo}</h1>
              <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: st.bg, color: st.color }}>{st.label}</span>
              {(selecao.versao ?? 1) > 1 && (
                <span title="Versão atual do álbum" style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "rgba(37,99,235,0.12)", color: "#2563EB" }}>v{selecao.versao}</span>
              )}
            </div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4 }}>
              👤 {clienteId ? <ClienteLink id={clienteId} nome={clienteNome} /> : clienteNome}
              {selecao.modelo_nome && <span> · {selecao.modelo_nome}{selecao.modelo_largura_cm && selecao.modelo_altura_cm ? ` (${selecao.modelo_largura_cm}×${selecao.modelo_altura_cm} cm)` : ""}</span>}
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 3 }}>
              Criado em {fmtData(selecao.created_at)} · Atualizado em {fmtData(selecao.updated_at)}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
            {selecao.status !== "ativa" && (selecao.status !== "rascunho" || (selecao.versao ?? 1) > 1) && (
              <button onClick={reativar} disabled={reativando} style={{ ...btnStyle, background: "#B45309", color: "#fff", border: "none" }}>
                {reativando ? "Enviando…" : selecao.status === "rascunho" ? "📢 Enviar ao cliente" : "↩ Reativar"}
              </button>
            )}
            {selecao.status === "aguardando_revisao" && (
              <button onClick={adicionarNovaVersao} style={{ ...btnStyle, background: "#2563EB", color: "#fff", border: "none" }}>➕ Adicionar nova versão</button>
            )}
            <button onClick={() => router.push(`/album/${id}/editar`)} style={{ ...btnStyle, background: "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none" }}>✏️ Editar</button>
          </div>
        </div>

        {/* Descrição */}
        {selecao.descricao && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "0.5px solid var(--color-border-tertiary)", fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.6 }}>
            {selecao.descricao}
          </div>
        )}

        {/* Link de acesso */}
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 600 }}>Link do cliente:</span>
          <code style={{ flex: 1, minWidth: 200, fontSize: 12, color: "var(--color-text-primary)", background: "var(--color-background-secondary)", padding: "6px 10px", borderRadius: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{linkAcesso}</code>
          <button onClick={copiarLink} style={{ ...btnStyle, padding: "6px 12px", fontSize: 12 }}>{copiado ? "✓ Copiado" : "Copiar"}</button>
          {["ativa", "aprovado", "aguardando_revisao"].includes(selecao.status) && (
            <a href={linkAcesso} target="_blank" rel="noopener noreferrer" style={{ ...btnStyle, padding: "6px 12px", fontSize: 12 }}>Abrir prévia ↗</a>
          )}
        </div>
      </div>

      {/* Métricas (da versão sendo vista) */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "Lâminas", valor: laminasVista.length, color: "var(--color-text-primary)" },
          { label: "Observações", valor: comentariosVista.length, color: "var(--color-text-primary)" },
          { label: "Pendentes", valor: pendentes, color: pendentes > 0 ? "#EF4444" : "#059669" },
        ].map((m) => (
          <div key={m.label} style={{ flex: 1, minWidth: 120, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "14px 18px" }}>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: m.color }}>{m.valor}</div>
          </div>
        ))}
      </div>

      {/* Seletor de versões (histórico) — só aparece quando há mais de uma versão */}
      {versaoCorrente > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)" }}>Versões:</span>
          {Array.from({ length: versaoCorrente }, (_, i) => versaoCorrente - i).map((v) => {
            const ativa = v === vVista;
            return (
              <button key={v} onClick={() => setVersaoVista(v)}
                style={{ padding: "5px 12px", borderRadius: 20, border: "0.5px solid", fontSize: 12, cursor: "pointer",
                  borderColor: ativa ? "#2563EB" : "var(--color-border-secondary)",
                  background: ativa ? "#2563EB" : "transparent",
                  color: ativa ? "#fff" : "var(--color-text-secondary)", fontWeight: ativa ? 700 : 400 }}>
                v{v}{v === versaoCorrente ? " (atual)" : ""}
              </button>
            );
          })}
        </div>
      )}

      {/* Título da seção */}
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 12 }}>
        {modoAlbumFinal
          ? `✅ Versão final aprovada — ${laminasVista.length} lâmina${laminasVista.length !== 1 ? "s" : ""}`
          : ehCorrente
          ? `Observações do cliente (${laminasParaExibir.length})`
          : `Versão ${vVista} — ${laminasVista.length} lâmina${laminasVista.length !== 1 ? "s" : ""}, ${comentariosVista.length} observaç${comentariosVista.length !== 1 ? "ões" : "ão"}`}
      </div>

      {modoAlbumFinal ? (
        /* Álbum final aprovado: grade com todas as lâminas da versão aprovada (o álbum montado) */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {laminasVista.map((l, i) => (
            <div key={l.id} style={{ position: "relative", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, overflow: "hidden", background: "var(--color-background-primary)" }}>
              <img src={l.url_publica} alt={`Lâmina ${i + 1}`} style={{ width: "100%", height: "auto", display: "block" }} loading="lazy" draggable={false} />
              <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 20 }}>{i + 1}</div>
            </div>
          ))}
        </div>
      ) : laminasParaExibir.length === 0 ? (
        <div style={{ padding: "36px 24px", textAlign: "center", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, fontSize: 13, color: "var(--color-text-secondary)" }}>
          {selecao.status === "rascunho"
            ? "Álbum ainda não enviado ao cliente."
            : selecao.status === "ativa"
            ? "O cliente ainda está revisando. As observações aparecem aqui quando ele enviar."
            : "Nenhuma observação — o cliente não pediu alterações."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {laminasParaExibir.map(({ lamina, numero, comentario }) => (
            <div key={lamina.id} style={{ display: "flex", gap: 0, background: "var(--color-background-primary)", border: `0.5px solid ${comentario && !comentario.resolvido ? "rgba(239,68,68,0.25)" : "var(--color-border-tertiary)"}`, borderRadius: 12, overflow: "hidden", flexWrap: "wrap", opacity: comentario?.resolvido ? 0.7 : 1 }}>
              <img src={lamina.url_publica} alt={`Lâmina ${numero}`} style={{ width: 300, maxWidth: "100%", height: "auto", display: "block", flexShrink: 0 }} loading="lazy" draggable={false} />
              <div style={{ flex: 1, minWidth: 220, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)" }}>Lâmina {numero}</span>
                  {comentario && <span style={{ fontSize: 11, fontWeight: 700, color: comentario.resolvido ? "#059669" : "#B45309" }}>{comentario.resolvido ? "✓ Resolvido" : "Pendente"}</span>}
                </div>
                {comentario
                  ? <div style={{ fontSize: 14, color: "var(--color-text-primary)", lineHeight: 1.6 }}>{comentario.texto}</div>
                  : <div style={{ fontSize: 13, color: "var(--color-text-secondary)", fontStyle: "italic" }}>Sem observação nesta lâmina.</div>}
              </div>
            </div>
          ))}
          {ehCorrente && (
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
              Para marcar como resolvido, use a tela de <button onClick={() => router.push(`/album/${id}/revisao`)} style={{ background: "none", border: "none", padding: 0, color: "#2563EB", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Revisão</button>.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
