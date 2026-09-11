// Definições comuns das galerias (entrega, seleção, álbum) ligadas a pedidos — usadas pela seção
// "Galerias" do pedido e pela tela "Vincular galerias antigas". Vínculo = <tabela>.pedido_id.

export type Tipo = "entrega" | "selecao" | "album";

export type Galeria = {
  id: string;
  tipo: Tipo;
  titulo: string;
  data: string | null;
  cliente_id: string | null;
  pedido_id: string | null;
  situacao: string;
};

export type Linha = {
  id: string; titulo: string | null; data_evento?: string | null; created_at?: string | null;
  cliente_id: string | null; pedido_id: string | null;
  rascunho?: boolean | null; suspensa?: boolean | null; expires_at?: string | null; status?: string | null;
};

export const TIPOS: { tipo: Tipo; label: string; tabela: string; rota: string; campos: string }[] = [
  { tipo: "entrega", label: "Entrega", tabela: "galerias_entrega", rota: "/entrega",
    campos: "id, titulo, data_evento, cliente_id, pedido_id, rascunho, suspensa, expires_at" },
  { tipo: "selecao", label: "Seleção", tabela: "galerias_selecao", rota: "/selecao",
    campos: "id, titulo, data_evento, cliente_id, pedido_id, status" },
  { tipo: "album", label: "Álbum", tabela: "album_selecoes", rota: "/album",
    campos: "id, titulo, cliente_id, pedido_id, status, created_at" },
];

export function situacaoDe(tipo: Tipo, l: Linha): string {
  if (tipo === "entrega") {
    if (l.rascunho) return "Rascunho";
    if (l.suspensa) return "Suspensa";
    if (l.expires_at && new Date(l.expires_at) < new Date()) return "Expirada";
    return "Publicada";
  }
  const s = l.status ?? "";
  return s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "—";
}

export const paraGaleria = (tipo: Tipo, l: Linha): Galeria => ({
  id: l.id, tipo, titulo: l.titulo || "(sem título)",
  data: l.data_evento ?? (l.created_at ? l.created_at.slice(0, 10) : null),
  cliente_id: l.cliente_id, pedido_id: l.pedido_id, situacao: situacaoDe(tipo, l),
});

export const fmtData = (d: string | null) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "—");
