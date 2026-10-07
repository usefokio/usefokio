import type { TaxasCartao } from "@/lib/asaas";

// Opções de parcelamento no cartão de uma solicitação de pagamento.
// Repassando a taxa do Asaas, o total é calculado para o fotógrafo receber o valor pedido:
//   total = (valor + taxa fixa) ÷ (1 − % da faixa de parcelas)
// Sem repasse, o cliente paga o valor pedido e a taxa sai do fotógrafo.
export type OpcaoParcela = { parcelas: number; total: number; parcela: number };

const centavosAcima = (v: number) => Math.ceil(Math.round(v * 1000) / 10) / 100;

export function pctDaFaixa(taxas: TaxasCartao, parcelas: number): number {
  if (parcelas <= 1) return taxas.pct1;
  if (parcelas <= 6) return taxas.pct2a6;
  return taxas.pct7a12;
}

export function simularParcelas(valor: number, maxParcelas: number, repassarTaxa: boolean, taxas: TaxasCartao | null): OpcaoParcela[] {
  const out: OpcaoParcela[] = [];
  for (let n = 1; n <= Math.max(1, Math.min(12, maxParcelas)); n++) {
    let total = valor;
    if (repassarTaxa && taxas) {
      const pct = pctDaFaixa(taxas, n) / 100;
      total = centavosAcima((valor + taxas.fixo) / (1 - pct));
    }
    out.push({ parcelas: n, total, parcela: Math.round((total / n) * 100) / 100 });
  }
  return out;
}

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
