"use client";

// Fotos da página do trabalho com curtida por foto (coração sobreposto, como no site antigo)
// e registro de visualização do trabalho. Dedup por navegador via local/sessionStorage.
import { useEffect, useState } from "react";

type Foto = { id: string; url_publica: string; descricao: string | null; likes: number };

const CHAVE_LIKES = "usefokio_site_likes";

function likesSalvos(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(CHAVE_LIKES) ?? "[]")); } catch { return new Set(); }
}
function salvarLikes(s: Set<string>) {
  try { localStorage.setItem(CHAVE_LIKES, JSON.stringify([...s])); } catch { /* sem storage */ }
}

export function FotosTrabalho({ trabalhoId, titulo, fotos }: { trabalhoId: string; titulo: string; fotos: Foto[] }) {
  const [curtidas, setCurtidas] = useState<Set<string>>(new Set());
  const [contadores, setContadores] = useState<Record<string, number>>(
    Object.fromEntries(fotos.map((f) => [f.id, f.likes ?? 0])),
  );

  useEffect(() => {
    setCurtidas(likesSalvos());
    // Registra a visualização 1x por sessão por trabalho
    const chaveView = `usefokio_site_view_${trabalhoId}`;
    try {
      if (!sessionStorage.getItem(chaveView)) {
        sessionStorage.setItem(chaveView, "1");
        fetch("/api/site/trabalho-view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trabalhoId }),
        }).catch(() => {});
      }
    } catch { /* sem storage */ }
  }, [trabalhoId]);

  async function alternarLike(foto: Foto) {
    const jaCurtiu = curtidas.has(foto.id);
    const novas = new Set(curtidas);
    if (jaCurtiu) novas.delete(foto.id); else novas.add(foto.id);
    setCurtidas(novas);
    salvarLikes(novas);
    setContadores((prev) => ({ ...prev, [foto.id]: Math.max(0, (prev[foto.id] ?? 0) + (jaCurtiu ? -1 : 1)) }));
    try {
      await fetch("/api/site/foto-like", {
        method: jaCurtiu ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fotoId: foto.id }),
      });
    } catch { /* otimista; falha de rede não trava a navegação */ }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {fotos.map((f) => {
        const curtiu = curtidas.has(f.id);
        const total = contadores[f.id] ?? 0;
        return (
          <div key={f.id} style={{ position: "relative" }}>
            <img
              src={f.url_publica}
              alt={f.descricao || titulo}
              style={{ width: "100%", height: "auto", borderRadius: 8, display: "block" }}
              loading="lazy"
            />
            <button
              onClick={() => alternarLike(f)}
              title={curtiu ? "Descurtir" : "Curtir esta foto"}
              aria-label={curtiu ? "Descurtir foto" : "Curtir foto"}
              style={{
                position: "absolute", right: 12, bottom: 12,
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 12px", borderRadius: 999, border: "none", cursor: "pointer",
                background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
                color: "#fff", fontSize: 13, lineHeight: 1,
              }}
            >
              <span style={{ fontSize: 15, color: curtiu ? "#f43f5e" : "#fff", transition: "transform 0.15s ease", transform: curtiu ? "scale(1.15)" : "none" }}>
                {curtiu ? "♥" : "♡"}
              </span>
              {total > 0 && <span>{total}</span>}
            </button>
          </div>
        );
      })}
    </div>
  );
}
