"use client";

// Conta 1 acesso por sessão do visitante na página do post (mesmo critério dos trabalhos).
import { useEffect } from "react";

export function RegistrarViewPost({ postId }: { postId: string }) {
  useEffect(() => {
    const chave = `usefokio_site_view_post_${postId}`;
    try {
      if (sessionStorage.getItem(chave)) return;
      sessionStorage.setItem(chave, "1");
    } catch { /* sem storage: conta mesmo assim */ }
    fetch("/api/site/post-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId }),
    }).catch(() => {});
  }, [postId]);
  return null;
}
