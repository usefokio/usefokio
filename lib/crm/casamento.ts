// Onde aparece o checkbox "É casamento" (pedido/oportunidade).
//
// PONTO ÚNICO DE VERDADE — se a categoria de evento mudar de nome, é SÓ AQUI que se mexe.
// Histórico: antes o sistema decidia exibir cerimônia/recepção por `categoria.includes("casamento")`.
// Quando os pedidos passaram a usar as categorias de produto (Evento, Ensaio, Álbum…), nenhuma tinha
// "casamento" no nome e os campos sumiram silenciosamente. Agora o nome da categoria só decide se o
// CHECKBOX aparece; quem manda nos campos é a flag `eh_casamento`, gravada no registro.
import { normalizar } from "@/lib/utils/normalizar";

// Categorias em que faz sentido perguntar "é casamento?".
const CATEGORIAS_EVENTO = ["evento"];

export function ehCategoriaEvento(categoria: string | null | undefined): boolean {
  if (!categoria?.trim()) return false;
  const c = normalizar(categoria.trim());
  return CATEGORIAS_EVENTO.some((alvo) => c === alvo);
}
