"use client";

// Fotos da página do trabalho com curtida por foto (coração central que aparece no hover/toque)
// e registro de visualização. O layout segue o "modo de exibição" (lista/slideshow/grid).
import { useEffect, useState } from "react";
import { GaleriaFotos } from "./GaleriaFotos";

type Foto = { id: string; url_publica: string; descricao: string | null };

const CHAVE_LIKES = "usefokio_site_likes";

function likesSalvos(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(CHAVE_LIKES) ?? "[]")); } catch { return new Set(); }
}
function salvarLikes(s: Set<string>) {
  try { localStorage.setItem(CHAVE_LIKES, JSON.stringify([...s])); } catch { /* sem storage */ }
}

export function FotosTrabalho({ trabalhoId, titulo, fotos, modo = "lista" }: { trabalhoId: string; titulo: string; fotos: Foto[]; modo?: string }) {
  const [curtidas, setCurtidas] = useState<Set<string>>(new Set());

  useEffect(() => {
    setCurtidas(likesSalvos());
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

  async function alternarLike(fotoId: string) {
    const jaCurtiu = curtidas.has(fotoId);
    const novas = new Set(curtidas);
    if (jaCurtiu) novas.delete(fotoId); else novas.add(fotoId);
    setCurtidas(novas);
    salvarLikes(novas);
    try {
      await fetch("/api/site/foto-like", {
        method: jaCurtiu ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fotoId }),
      });
    } catch { /* otimista; falha de rede não trava a navegação */ }
  }

  return (
    <GaleriaFotos
      modo={modo}
      curtidas={curtidas}
      onCurtir={alternarLike}
      fotos={fotos.map((f) => ({ id: f.id, url: f.url_publica, alt: f.descricao || titulo }))}
    />
  );
}
