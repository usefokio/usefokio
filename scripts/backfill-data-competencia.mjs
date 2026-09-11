/**
 * Gera o SQL que preenche crm_financial_entries.data_competencia dos lancamentos que ja existiam.
 * So escreve a coluna nova (e so onde ela esta vazia) — valor, vencimento, pago_em e status ficam intactos.
 *
 * Regras, nesta ordem:
 *  1. Contas a pagar que estavam em aberto no sistema antigo (arquivo exportado em 24/06/2026, vespera da
 *     importacao): a `add_date` do sistema antigo. Se o valor foi editado no CRM depois da troca (valor
 *     diferente do arquivo) e o lancamento ja foi pago, vale a data do pagamento — a edicao e feita na baixa.
 *  2. Lancamentos ligados a pedido (custos e parcelas): data de lancamento do pedido.
 *  3. Demais: o vencimento. (Tudo que cai ate jun/2026 fica no periodo congelado do Resultados e nao e
 *     lido pela logica ao vivo; `created_at` nao serve — parcelas foram recriadas em 23/07/2026.)
 *
 * A regra 1 vale so para a conta do Fernando (o arquivo e dele); as regras 2 e 3 valem para todos.
 *
 * Uso:
 *   node scripts/backfill-data-competencia.mjs "<tds contas a pagar.csv>" <fotografo_id>  > backfill.sql
 */

import { readFileSync } from "fs";

const [arquivo, fotografoId] = process.argv.slice(2);
if (!arquivo || !/^[0-9a-f-]{36}$/.test(fotografoId ?? "")) {
  console.error('Uso: node scripts/backfill-data-competencia.mjs "<tds contas a pagar.csv>" <fotografo_id>');
  process.exit(1);
}

const linhas = readFileSync(arquivo, "utf8").split(/\r?\n/).filter((l) => l.trim() !== "");
const cab = linhas[0].split(";");
const col = (nome) => {
  const i = cab.indexOf(nome);
  if (i < 0) { console.error(`Coluna ausente no CSV: ${nome}`); process.exit(1); }
  return i;
};
const iId = col("id"), iAdd = col("add_date"), iAmount = col("amount");

const tuplas = [];
for (const linha of linhas.slice(1)) {
  const c = linha.split(";");
  const id = c[iId]?.trim();
  const add = c[iAdd]?.trim();
  if (!/^\d+$/.test(id ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(add ?? "")) continue;
  const valor = parseFloat((c[iAmount] ?? "").replace(/\./g, "").replace(",", ".")) || 0;
  tuplas.push(`(${id},'${add}'::date,${valor.toFixed(2)})`);
}

console.log(`-- ${tuplas.length} contas a pagar do sistema antigo (regra 1)
begin;

-- 1) contas a pagar em aberto no sistema antigo
update public.crm_financial_entries f
set data_competencia = case
  when f.valor <> a.valor_antigo and f.pago_em is not null then f.pago_em
  else a.add_date end
from (values
${tuplas.join(",\n")}
) as a(legacy_id, add_date, valor_antigo)
where f.fotografo_id = '${fotografoId}'
  and f.tipo = 'despesa'
  and f.legacy_id = a.legacy_id
  and f.data_competencia is null;

-- 2) custos e parcelas de pedido: data de lancamento do pedido
update public.crm_financial_entries f
set data_competencia = o.data_lancamento
from public.crm_orders o
where o.id = f.pedido_id
  and o.data_lancamento is not null
  and f.data_competencia is null;

-- 3) demais: vencimento
update public.crm_financial_entries
set data_competencia = vencimento
where data_competencia is null;

commit;`);
