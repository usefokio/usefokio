// Agendamentos (crm_schedules) gerados a partir de um pedido. Fonte única do pedido→agenda,
// reusada na criação do pedido e na recriação quando a data muda. Client-safe.
import type { createClient } from "@/lib/supabase/client";

type SB = ReturnType<typeof createClient>;

export type PedidoParaAgenda = {
  fotografo_id: string;
  pedido_id: string;
  cliente_id: string | null;
  titulo: string;         // nome do pedido
  categoria: string | null;
  data_evento: string;    // "yyyy-mm-dd" — o chamador garante que existe
  hora_evento?: string | null; // "HH:MM" (opcional)
};

// Início = hora do evento quando houver (senão 08:00). Fim mantém 18:00 como fim do dia.
function inicioFim(dia: string, hora?: string | null) {
  const h = /^\d{2}:\d{2}$/.test(hora ?? "") ? hora! : "08:00";
  return { inicio: `${dia}T${h}:00`, fim: `${dia}T18:00:00` };
}

export async function criarAgendamentoDoPedido(sb: SB, p: PedidoParaAgenda) {
  const { inicio, fim } = inicioFim(p.data_evento, p.hora_evento);
  await sb.from("crm_schedules").insert({
    fotografo_id: p.fotografo_id,
    pedido_id:    p.pedido_id,
    cliente_id:   p.cliente_id,
    titulo:       p.titulo.trim() || "Evento",
    descricao:    p.categoria,
    inicio, fim,
    dia_todo:     false,
    tipo:         "evento",
  });
}

// Cancela (DELETE) todos os agendamentos do pedido e cria um novo na data atual.
// Usado quando a data do evento muda e o fotógrafo confirma recriar.
export async function recriarAgendamentosDoPedido(sb: SB, p: PedidoParaAgenda) {
  await sb.from("crm_schedules").delete().eq("pedido_id", p.pedido_id);
  await criarAgendamentoDoPedido(sb, p);
}
