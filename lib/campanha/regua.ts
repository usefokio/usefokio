// Régua do funil da galeria expirada: qual é a próxima etapa de cada galeria e quando ela vence.
// Função pura, usada pelo cron (e-mails automáticos) e pelo bloco de Tarefas (WhatsApps e exclusão).
//
// Dias do 1º e-mail, 2º e-mail e 1º WhatsApp contam a partir do vencimento da galeria; o 2º WhatsApp conta a
// partir do 1º WhatsApp e a exclusão a partir do 2º WhatsApp. Se uma etapa atrasar, a seguinte respeita o
// mesmo intervalo depois dela (nunca saem duas etapas no mesmo dia por atraso).
import type { EstagioFunil } from "@/lib/supabase/types";

export type RegrasFunil = {
  funil_entrar_auto: boolean;
  funil_email_auto: boolean;
  funil_email_auto_desde: string | null;
  dias_email_1: number | null;
  dias_email_2: number | null;
  dias_whatsapp_1: number | null;
  dias_whatsapp_2: number | null;
  dias_exclusao: number | null;
};

export const REGRAS_FUNIL_PADRAO: RegrasFunil = {
  funil_entrar_auto: true,
  funil_email_auto: false,
  funil_email_auto_desde: null,
  dias_email_1: 3,
  dias_email_2: 10,
  dias_whatsapp_1: 17,
  dias_whatsapp_2: null,
  dias_exclusao: null,
};

export type EtapaRegua = "email_1" | "email_2" | "whatsapp_1" | "whatsapp_2" | "exclusao";

export type RegistroRegua = {
  estagio: EstagioFunil;
  email_1_em: string | null;
  email_2_em: string | null;
  whatsapp_em: string | null;
  whatsapp_2_em: string | null;
  created_at: string;
};

const DIA = 86_400_000;

/** Data-base da régua: o vencimento da galeria; sem vencimento (suspensa), a entrada no funil. */
export function baseDaRegua(expiresAt: string | null, entradaFunil: string): Date {
  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) return new Date(expiresAt);
  return new Date(entradaFunil);
}

function soma(base: Date | string, dias: number): Date {
  return new Date(new Date(base).getTime() + Math.max(0, dias) * DIA);
}
function maior(a: Date, b: Date | null): Date {
  return b && b.getTime() > a.getTime() ? b : a;
}

/** Próxima etapa da galeria e a data em que ela vence (null = nada a fazer pela régua). */
export function proximaEtapa(r: RegistroRegua, base: Date, temEmail: boolean, regras: RegrasFunil): { etapa: EtapaRegua; venceEm: Date } | null {
  const d1 = regras.dias_email_1 ?? 0;
  const d2 = regras.dias_email_2 ?? d1;
  const dw1 = regras.dias_whatsapp_1 ?? d2;

  switch (r.estagio) {
    case "nao_contatado":
      // Sem e-mail cadastrado vai direto para o WhatsApp, no dia do 1º contato.
      return temEmail
        ? { etapa: "email_1", venceEm: soma(base, d1) }
        : { etapa: "whatsapp_1", venceEm: soma(base, d1) };
    case "email_1":
      return temEmail
        ? { etapa: "email_2", venceEm: maior(soma(base, d2), r.email_1_em ? soma(r.email_1_em, d2 - d1) : null) }
        : { etapa: "whatsapp_1", venceEm: maior(soma(base, dw1), r.email_1_em ? soma(r.email_1_em, dw1 - d1) : null) };
    case "email_2":
      return { etapa: "whatsapp_1", venceEm: maior(soma(base, dw1), r.email_2_em ? soma(r.email_2_em, dw1 - d2) : null) };
    case "whatsapp":
      if (regras.dias_whatsapp_2 == null) return null;
      return { etapa: "whatsapp_2", venceEm: soma(r.whatsapp_em ?? r.created_at, regras.dias_whatsapp_2) };
    case "whatsapp_2":
      if (regras.dias_exclusao == null) return null;
      return { etapa: "exclusao", venceEm: soma(r.whatsapp_2_em ?? r.created_at, regras.dias_exclusao) };
    default:
      return null;
  }
}

/** Dias de atraso (0 = vence hoje; negativo = ainda não venceu), contando por dia de calendário em Brasília. */
export function diasDeAtraso(venceEm: Date, agora = new Date()): number {
  const dia = (d: Date) => {
    const s = d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  };
  return Math.round((dia(agora) - dia(venceEm)) / DIA);
}
