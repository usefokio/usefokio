// Antes de excluir fotos de uma galeria de entrega: garante que a capa seja um arquivo próprio
// (senão, em galerias antigas, a capa era a 1ª foto e sumia junto). Ver /api/entrega/[id]/garantir-capa.
export async function garantirCapaEntrega(galeriaId: string): Promise<boolean> {
  try {
    const r = await fetch(`/api/entrega/${galeriaId}/garantir-capa`, { method: "POST" });
    return r.ok;
  } catch {
    return false;
  }
}

export const AVISO_CAPA_NAO_PRESERVADA =
  "Não foi possível preservar a capa da galeria antes de excluir. Nenhuma foto foi excluída — tente de novo.";
