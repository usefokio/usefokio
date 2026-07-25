// Banco de Propostas — helpers client-safe compartilhados por editor, modal de
// copiar/WhatsApp, PDF e página pública. O texto da mensagem usa {{VARIAVEIS}},
// mesmo esquema dos contratos (replaceAll simples, sem template engine).
import { formatBRL } from "@/lib/utils/format";
import type { CrmProposta, CrmPropostaOpcao } from "@/lib/supabase/types";

export const VARIAVEIS_PROPOSTA = [
  "TITULO", "DESCRICAO", "OPCOES", "ADICIONAIS", "VALIDADE", "NOME_EMPRESA", "LINK",
] as const;

// Modelo padrão da mensagem (WhatsApp usa *negrito*). O fotógrafo edita à vontade.
export const TEXTO_MENSAGEM_PADRAO = `*{{TITULO}}*

{{DESCRICAO}}

{{OPCOES}}

{{ADICIONAIS}}

{{VALIDADE}}

{{NOME_EMPRESA}}
{{LINK}}`;

function htmlParaTexto(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type ValoresOverride = Record<string, string>; // opcao.id → valor formatado ("1.500,00")

function valorDaOpcao(o: CrmPropostaOpcao, overrides?: ValoresOverride): string | null {
  const ov = overrides?.[o.id]?.trim();
  if (ov) return `R$ ${ov}`;
  return o.valor != null ? formatBRL(o.valor) : null;
}

// Renderiza o texto final da mensagem, substituindo as variáveis.
// `overrides` permite ajustar valores SÓ neste envio, sem alterar o cadastro (decisão do Fernando).
export function renderizarTextoProposta(args: {
  proposta: Pick<CrmProposta, "titulo" | "descricao_html" | "texto_mensagem" | "validade_dias">;
  opcoes: CrmPropostaOpcao[];
  nomeEmpresa: string;
  link: string | null;
  overrides?: ValoresOverride;
}): string {
  const { proposta, opcoes, nomeEmpresa, link, overrides } = args;
  const pacotes = opcoes.filter((o) => o.tipo === "pacote");
  const adicionais = opcoes.filter((o) => o.tipo === "adicional");

  const blocoOpcoes = pacotes.map((o) => {
    const linhas = [`📸 *${o.nome}*`];
    for (const it of o.itens.filter(Boolean)) linhas.push(`• ${it}`);
    const v = valorDaOpcao(o, overrides);
    if (v) linhas.push(`Valor: ${v}`);
    return linhas.join("\n");
  }).join("\n\n");

  const blocoAdicionais = adicionais.length
    ? "➕ *Adicionais*\n" + adicionais.map((o) => {
        const v = valorDaOpcao(o, overrides);
        return `• ${o.nome}${v ? ` — ${v}` : ""}`;
      }).join("\n")
    : "";

  const vars: Record<string, string> = {
    TITULO: proposta.titulo,
    DESCRICAO: proposta.descricao_html ? htmlParaTexto(proposta.descricao_html) : "",
    OPCOES: blocoOpcoes,
    ADICIONAIS: blocoAdicionais,
    VALIDADE: proposta.validade_dias ? `Proposta válida por ${proposta.validade_dias} dias.` : "",
    NOME_EMPRESA: nomeEmpresa,
    LINK: link ?? "",
  };

  let texto = proposta.texto_mensagem?.trim() ? proposta.texto_mensagem : TEXTO_MENSAGEM_PADRAO;
  for (const [k, v] of Object.entries(vars)) texto = texto.replaceAll(`{{${k}}}`, v);
  // limpa sobras de variáveis vazias (linhas em branco acumuladas)
  return texto.replace(/\n{3,}/g, "\n\n").trim();
}

// Faixa de valor de uma proposta (menor–maior entre os pacotes) para a listagem.
export function faixaDeValor(opcoes: CrmPropostaOpcao[]): string {
  const valores = opcoes.filter((o) => o.tipo === "pacote" && o.valor != null).map((o) => o.valor as number);
  if (valores.length === 0) return "—";
  const min = Math.min(...valores), max = Math.max(...valores);
  return min === max ? formatBRL(min) : `${formatBRL(min)} – ${formatBRL(max)}`;
}
