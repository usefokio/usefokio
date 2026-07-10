"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { AlbumSelecao, AlbumLamina, AlbumComentario } from "@/lib/supabase/types";

// ─── Card de lâmina com comentário ───────────────────────────────────────────
function LaminaCard({
  lamina,
  numero,
  comentario,
  onToggle,
}: {
  lamina: AlbumLamina;
  numero: number;
  comentario: AlbumComentario;
  onToggle: (id: string, resolvido: boolean) => void;
}) {
  return (
    <div style={{
      background: "var(--color-background-primary)",
      border: `0.5px solid ${comentario.resolvido ? "var(--color-border-tertiary)" : "rgba(239,68,68,0.25)"}`,
      borderRadius: 12,
      overflow: "hidden",
      opacity: comentario.resolvido ? 0.65 : 1,
      transition: "opacity 0.2s, border-color 0.2s",
    }}>
      {/* Imagem */}
      <div style={{ position: "relative" }}>
        <img
          src={lamina.url_publica}
          alt={`Lâmina ${numero}`}
          style={{ display: "block", width: "100%", height: "auto" }}
          draggable={false}
        />
        {/* Badge número */}
        <div style={{
          position: "absolute", top: 10, left: 10,
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
          color: "#fff", fontSize: 11, fontWeight: 700,
          padding: "3px 10px", borderRadius: 20, letterSpacing: "0.04em",
        }}>
          Lâmina {numero}
        </div>
        {/* Badge status */}
        <div style={{
          position: "absolute", top: 10, right: 10,
          background: comentario.resolvido ? "rgba(5,150,105,0.85)" : "rgba(239,68,68,0.85)",
          backdropFilter: "blur(4px)",
          color: "#fff", fontSize: 11, fontWeight: 700,
          padding: "3px 10px", borderRadius: 20,
        }}>
          {comentario.resolvido ? "✓ Resolvido" : "Pendente"}
        </div>
      </div>

      {/* Comentário */}
      <div style={{ padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
          background: comentario.resolvido ? "#94A3B8" : "#EF4444",
          color: "#fff", fontSize: 13,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          💬
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, color: "var(--color-text-primary)", lineHeight: 1.6 }}>
            {comentario.texto}
          </div>
        </div>
        <button
          onClick={() => onToggle(comentario.id, comentario.resolvido)}
          style={{
            flexShrink: 0, padding: "6px 14px", borderRadius: 7, fontSize: 12, fontWeight: 700,
            border: "none", cursor: "pointer",
            background: comentario.resolvido ? "rgba(100,116,139,0.1)" : "rgba(16,185,129,0.1)",
            color: comentario.resolvido ? "#64748B" : "#059669",
          }}
        >
          {comentario.resolvido ? "Reabrir" : "✓ Resolver"}
        </button>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function RevisaoAlbumPage() {
  const { id }        = useParams<{ id: string }>();
  const router        = useRouter();
  const { fotografo } = useFotografo();

  const [selecao,     setSelecao]     = useState<AlbumSelecao | null>(null);
  const [laminas,     setLaminas]     = useState<AlbumLamina[]>([]);
  const [comentarios, setComentarios] = useState<AlbumComentario[]>([]);
  const [carregando,  setCarregando]  = useState(true);

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("album_selecoes").select("*").eq("id", id).eq("fotografo_id", fotografo.id).single(),
      supabase.from("album_laminas").select("*").eq("selecao_id", id).order("ordem").order("created_at"),
      supabase.from("album_comentarios").select("*").eq("selecao_id", id).order("created_at"),
    ]).then(([{ data: s }, { data: l }, { data: c }]) => {
      setSelecao(s as AlbumSelecao);
      // Só a versão corrente (versões anteriores ficam no histórico)
      const versaoAtual = (s as AlbumSelecao | null)?.versao ?? 1;
      setLaminas(((l as AlbumLamina[]) ?? []).filter((x) => (x.versao ?? 1) === versaoAtual));
      setComentarios(((c as AlbumComentario[]) ?? []).filter((x) => (x.versao ?? 1) === versaoAtual));
      setCarregando(false);
    });
  }, [fotografo, id]);

  async function toggleResolvido(comentarioId: string, atualResolvido: boolean) {
    const supabase = createClient();
    await supabase
      .from("album_comentarios")
      .update({ resolvido: !atualResolvido, updated_at: new Date().toISOString() })
      .eq("id", comentarioId);
    setComentarios((prev) =>
      prev.map((c) => c.id === comentarioId ? { ...c, resolvido: !atualResolvido } : c)
    );
  }

  async function resolverTodos() {
    const pendentes = comentarios.filter((c) => !c.resolvido);
    if (pendentes.length === 0) return;
    const supabase = createClient();
    await supabase
      .from("album_comentarios")
      .update({ resolvido: true, updated_at: new Date().toISOString() })
      .in("id", pendentes.map((c) => c.id));
    setComentarios((prev) => prev.map((c) => ({ ...c, resolvido: true })));
  }

  if (carregando) {
    return (
      <div style={{ padding: "60px 30px", textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>
        Carregando…
      </div>
    );
  }

  if (!selecao) {
    return (
      <div style={{ padding: "60px 30px", textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>
        Galeria não encontrada.
      </div>
    );
  }

  const pendentes = comentarios.filter((c) => !c.resolvido).length;

  // Só lâminas que têm comentário (um por lâmina)
  const laminasComComentario = laminas
    .map((l) => ({ lamina: l, comentario: comentarios.find((c) => c.lamina_id === l.id) }))
    .filter((item): item is { lamina: AlbumLamina; comentario: AlbumComentario } => !!item.comentario);

  return (
    <div style={{ padding: "26px 30px", maxWidth: 720 }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
        <button
          onClick={() => router.push(`/album/${id}/editar`)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 13, padding: 0 }}
        >
          ← Editar álbum
        </button>
        <span style={{ color: "var(--color-border-secondary)" }}>/</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>
          Revisão do cliente
        </span>
      </div>

      {/* Resumo */}
      <div style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: 14, padding: "18px 24px", marginBottom: 28,
        display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap",
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)" }}>{selecao.titulo}</div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 3 }}>
            {laminasComComentario.length} lâmina{laminasComComentario.length !== 1 ? "s" : ""} com observações
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: pendentes > 0 ? "#EF4444" : "#059669" }}>{pendentes}</div>
            <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Pendente{pendentes !== 1 ? "s" : ""}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--color-text-primary)" }}>{comentarios.length - pendentes}</div>
            <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Resolvido{(comentarios.length - pendentes) !== 1 ? "s" : ""}</div>
          </div>
          {pendentes > 0 && (
            <button
              onClick={resolverTodos}
              style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "rgba(16,185,129,0.1)", color: "#059669", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              ✓ Resolver todos
            </button>
          )}
        </div>
      </div>

      {/* Lista de lâminas com comentário */}
      {laminasComComentario.length === 0 ? (
        <div style={{ padding: "48px 0", textAlign: "center", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14 }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>💬</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>Nenhum comentário ainda</div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>O cliente ainda não adicionou observações de revisão.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {laminasComComentario.map(({ lamina, comentario }, i) => (
            <LaminaCard
              key={lamina.id}
              lamina={lamina}
              numero={laminas.indexOf(lamina) + 1}
              comentario={comentario}
              onToggle={toggleResolvido}
            />
          ))}
        </div>
      )}
    </div>
  );
}
