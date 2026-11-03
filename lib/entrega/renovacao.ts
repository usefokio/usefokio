// Regras de renovação da galeria de entrega (Configurações → Financeiro → Galeria de entrega e funil).
// Fonte única do que o cliente pode escolher na renovação: opções do fotógrafo (lista livre) com o valor
// resolvido por prioridade — galeria personalizada > categoria > padrão da opção. Puro: roda no client e no servidor.

export type OpcaoRenovacao = {
  id: string;
  rotulo: string;
  dias: number;
  valor_padrao: number | null;
  ativo: boolean;
  ordem: number;
};

// { "<opcao_id>": valor | null } — chave ausente = herda; null/0 = não oferece.
export type RenovacaoPersonalizada = Record<string, number | null>;

export type OrigemValor = "galeria" | "categoria" | "padrao";

export type OpcaoEfetiva = {
  id: string;
  rotulo: string;
  dias: number;
  valor: number;
  origem: OrigemValor;
};

// Galeria antiga sem opções cadastradas (fotógrafo novo antes de abrir a tela): mantém o comportamento
// das colunas antigas (taxa 30 dias + anual opcional).
export type LegadoRenovacao = {
  renewal_fee: number | null;
  renovacao_dias: number | null;
  renovacao_anual_valor: number | null;
  renewal_fee_padrao: number | null;
};

export const LEGADO_MENSAL = "legado-mensal";
export const LEGADO_ANUAL = "legado-anual";

export function opcoesEfetivas({ opcoes, precosCategoria, personalizada, legado }: {
  opcoes: OpcaoRenovacao[];
  precosCategoria: Record<string, number>;           // opcao_id → valor da categoria da galeria
  personalizada: RenovacaoPersonalizada | null;
  legado?: LegadoRenovacao;
}): OpcaoEfetiva[] {
  if (opcoes.length === 0) {
    if (!legado) return [];
    const lista: OpcaoEfetiva[] = [];
    const mensal = (legado.renewal_fee ?? 0) > 0 ? legado.renewal_fee! : (legado.renewal_fee_padrao ?? 0);
    const dias = legado.renovacao_dias && legado.renovacao_dias > 0 ? legado.renovacao_dias : 30;
    if (mensal > 0) lista.push({ id: LEGADO_MENSAL, rotulo: `${dias} dias`, dias, valor: mensal, origem: "galeria" });
    if ((legado.renovacao_anual_valor ?? 0) > 0) {
      lista.push({ id: LEGADO_ANUAL, rotulo: "1 ano", dias: 365, valor: legado.renovacao_anual_valor!, origem: "galeria" });
    }
    return lista;
  }

  return [...opcoes]
    .filter((o) => o.ativo)
    .sort((a, b) => a.ordem - b.ordem || a.dias - b.dias)
    .flatMap((o): OpcaoEfetiva[] => {
      let valor: number | null;
      let origem: OrigemValor;
      if (personalizada && Object.prototype.hasOwnProperty.call(personalizada, o.id)) {
        valor = personalizada[o.id];
        origem = "galeria";
      } else if (precosCategoria[o.id] != null) {
        valor = precosCategoria[o.id];
        origem = "categoria";
      } else {
        valor = o.valor_padrao;
        origem = "padrao";
      }
      return valor != null && valor > 0 ? [{ id: o.id, rotulo: o.rotulo, dias: o.dias, valor: Number(valor), origem }] : [];
    });
}

export const formatarReais = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

// Resumo curto para listas e formulário: "30 dias R$ 39,90 · 1 ano R$ 79,90".
export function resumoOpcoes(lista: OpcaoEfetiva[]): string {
  return lista.length ? lista.map((o) => `${o.rotulo} ${formatarReais(o.valor)}`).join(" · ") : "Sem renovação paga";
}
