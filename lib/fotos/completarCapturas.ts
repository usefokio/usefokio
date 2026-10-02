// Chama /api/fotos/capturada-em em lotes até preencher a hora (EXIF) de todas as fotos da galeria.
// Devolve true se alguma foto foi atualizada (a tela recarrega para reordenar).
export async function completarCapturas(tipo: "selecao" | "entrega", galeriaId: string): Promise<boolean> {
  let atualizou = false;
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch("/api/fotos/capturada-em", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, galeria_id: galeriaId }),
      });
      if (!r.ok) break;
      const j = (await r.json()) as { processadas: number; restantes: number };
      if (j.processadas > 0) atualizou = true;
      if (j.restantes === 0 || j.processadas === 0) break;
    } catch {
      break;
    }
  }
  return atualizou;
}
