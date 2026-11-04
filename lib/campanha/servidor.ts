// Operações de servidor do funil da galeria expirada (service role): histórico de contatos e campos que
// voltam ao início quando o ciclo é reiniciado.
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

export type EtapaContato = "email_1" | "email_2" | "whatsapp_1" | "whatsapp_2" | "exclusao" | "resposta" | "pausa" | "retomada";

export async function registrarContato(admin: Admin, c: {
  fotografo_id: string;
  galeria_id: string;
  etapa: EtapaContato;
  canal: "email" | "whatsapp" | "sistema";
  modo: "auto" | "manual";
  direcao?: "enviado" | "recebido";
  resend_id?: string | null;
  detalhe?: string | null;
}) {
  const { error } = await admin.from("entrega_contatos").insert({ direcao: "enviado", ...c });
  if (error) console.error("[campanha] histórico não gravado:", error.message);
}

/** Campos da régua zerados ao reiniciar o ciclo (o histórico de contatos é mantido). */
export const CAMPOS_REGUA_ZERADOS = {
  email_1_em: null,
  email_2_em: null,
  whatsapp_em: null,
  whatsapp_2_em: null,
  exclusao_feita_em: null,
  pausado_em: null,
  pausa_motivo: null,
} as const;
