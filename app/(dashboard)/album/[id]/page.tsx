"use client";

// Tela de VISUALIZAÇÃO do álbum (read-only). Visualizar ≠ editar: aqui o fotógrafo vê todas as
// informações relevantes do álbum sem alterar nada. Ações de mudança ficam em Editar/Revisão.
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
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

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("album_selecoes").select("*, clientes(nome)").eq("id", id).eq("fotografo_id", fotografo.id).maybeSingle(),
      supabase.from("album_laminas").select("*").eq("selecao_id", id).order("ordem").order("created_at"),
      supabase.from("album_comentarios").select("*").eq("selecao_id", id).order("created_at"),
    ]).then(([{ data: s }, { data: l }, { data: c }]) => {
      setSelecao(s as AlbumSelecao & { clientes?: { nome: string | null } | null });
      setLaminas((l as AlbumLamina[]) ?? []);
      setComentarios((c as AlbumComentario[]) ?? []);
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
    if (!confirm("Reabrir o acesso do cliente? O álbum volta a ficar Ativo para o cliente visualizar, pedir alterações ou aprovar.")) return;
    setReativando(true);
    await createClient().from("album_selecoes").update({ status: "ativa", updated_at: new Date().toISOString() }).eq("id", id);
    setSelecao((s) => s ? { ...s, status: "ativa" } : s);
    setReativando(false);
  }

  if (carregando) {
    return <div style={{ padding: "60px 30px", textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>Carregando…</div>;
  }
  if (!selecao) {
    return <div style={{ padding: "60px 30px", textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>Álbum não encontrado.</div>;
  }

  const st = STATUS_BADGE[selecao.status as StatusAlbum] ?? STATUS_BADGE.rascunho;
  const pendentes = comentarios.filter((c) => !c.resolvido).length;
  const comentariosPorLamina = new Map(comentarios.map((c) => [c.lamina_id, c]));
  const clienteNome = selecao.clientes?.nome ?? "Sem cliente";

  // Só as lâminas que receberam observação (o fotógrafo não precisa rever as páginas sem pedido).
  const laminasComComentario = laminas
    .map((l, i) => ({ lamina: l, numero: i + 1, comentario: comentariosPorLamina.get(l.id) }))
    .filter((x): x is { lamina: AlbumLamina; numero: number; comentario: AlbumComentario } => !!x.comentario);

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
            </div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4 }}>
              👤 {clienteNome}
              {selecao.modelo_nome && <span> · {selecao.modelo_nome}{selecao.modelo_largura_cm && selecao.modelo_altura_cm ? ` (${selecao.modelo_largura_cm}×${selecao.modelo_altura_cm} cm)` : ""}</span>}
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 3 }}>
              Criado em {fmtData(selecao.created_at)} · Atualizado em {fmtData(selecao.updated_at)}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
            {selecao.status !== "ativa" && selecao.status !== "rascunho" && (
              <button onClick={reativar} disabled={reativando} style={{ ...btnStyle, background: "#B45309", color: "#fff", border: "none" }}>
                {reativando ? "Reabrindo…" : "↩ Reativar"}
              </button>
            )}
            <button onClick={() => router.push(`/album/${id}/revisao`)} style={btnStyle}>💬 Revisão{pendentes > 0 ? ` (${pendentes})` : ""}</button>
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

      {/* Métricas */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { label: "Lâminas", valor: laminas.length, color: "var(--color-text-primary)" },
          { label: "Observações", valor: comentarios.length, color: "var(--color-text-primary)" },
          { label: "Pendentes", valor: pendentes, color: pendentes > 0 ? "#EF4444" : "#059669" },
        ].map((m) => (
          <div key={m.label} style={{ flex: 1, minWidth: 120, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "14px 18px" }}>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: m.color }}>{m.valor}</div>
          </div>
        ))}
      </div>

      {/* Observações do cliente — cada lâmina COMENTADA com a imagem e o texto lado a lado.
          Páginas sem observação não são exibidas (o fotógrafo só precisa ver o que foi pedido). */}
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 12 }}>
        Observações do cliente ({laminasComComentario.length})
      </div>
      {laminasComComentario.length === 0 ? (
        <div style={{ padding: "36px 24px", textAlign: "center", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, fontSize: 13, color: "var(--color-text-secondary)" }}>
          {selecao.status === "rascunho"
            ? "Álbum ainda não enviado ao cliente."
            : selecao.status === "ativa"
            ? "O cliente ainda está revisando. As observações aparecem aqui quando ele enviar."
            : selecao.status === "aprovado"
            ? "Álbum aprovado sem observações."
            : "Nenhuma observação — o cliente não pediu alterações."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {laminasComComentario.map(({ lamina, numero, comentario }) => (
            <div key={lamina.id} style={{ display: "flex", gap: 0, background: "var(--color-background-primary)", border: `0.5px solid ${comentario.resolvido ? "var(--color-border-tertiary)" : "rgba(239,68,68,0.25)"}`, borderRadius: 12, overflow: "hidden", flexWrap: "wrap", opacity: comentario.resolvido ? 0.7 : 1 }}>
              <img src={lamina.url_publica} alt={`Lâmina ${numero}`} style={{ width: 300, maxWidth: "100%", height: "auto", display: "block", flexShrink: 0 }} loading="lazy" draggable={false} />
              <div style={{ flex: 1, minWidth: 220, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)" }}>Lâmina {numero}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: comentario.resolvido ? "#059669" : "#B45309" }}>{comentario.resolvido ? "✓ Resolvido" : "Pendente"}</span>
                </div>
                <div style={{ fontSize: 14, color: "var(--color-text-primary)", lineHeight: 1.6 }}>{comentario.texto}</div>
              </div>
            </div>
          ))}
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
            Para marcar como resolvido, use a tela de <button onClick={() => router.push(`/album/${id}/revisao`)} style={{ background: "none", border: "none", padding: 0, color: "#2563EB", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Revisão</button>.
          </div>
        </div>
      )}
    </div>
  );
}
