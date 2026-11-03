"use client";

// Renovação no formulário da galeria: mostra o que a galeria herda (categoria ou padrão — regras em
// Configurações → Financeiro) e permite personalizar só nesta galeria. Valor = { "<opcao_id>": valor | null }.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { inputStyle } from "@/lib/styles";
import { mascaraMoeda, parseMoeda, formatarMoeda } from "@/lib/moeda";
import { opcoesEfetivas, resumoOpcoes, type OpcaoEfetiva, type OpcaoRenovacao, type RenovacaoPersonalizada } from "@/lib/entrega/renovacao";

export type RegrasRenovacaoCarregadas = {
  opcoes: OpcaoRenovacao[];
  precosPorCategoria: Record<string, Record<string, number>>; // categoria_id → opcao_id → valor
  prazoPadrao: number | null;
  prazoPorCategoria: Record<string, number | null>;
};

export function useRegrasRenovacao(fotografoId: string | undefined) {
  const [regras, setRegras] = useState<RegrasRenovacaoCarregadas | null>(null);
  useEffect(() => {
    if (!fotografoId) return;
    const sb = createClient();
    (async () => {
      const [{ data: ops }, { data: reg }, { data: cats }] = await Promise.all([
        sb.from("renovacao_opcoes").select("id, rotulo, dias, valor_padrao, ativo, ordem").eq("fotografo_id", fotografoId),
        sb.from("entrega_regras").select("prazo_inicial_dias").eq("fotografo_id", fotografoId).maybeSingle(),
        sb.from("categorias").select("id, prazo_inicial_dias").eq("fotografo_id", fotografoId),
      ]);
      const opcoes = ((ops ?? []) as OpcaoRenovacao[]).map((o) => ({ ...o, valor_padrao: o.valor_padrao != null ? Number(o.valor_padrao) : null }));
      const precosPorCategoria: Record<string, Record<string, number>> = {};
      if (opcoes.length) {
        const { data: pr } = await sb.from("renovacao_precos_categoria").select("opcao_id, categoria_id, valor").in("opcao_id", opcoes.map((o) => o.id));
        for (const p of (pr ?? []) as { opcao_id: string; categoria_id: string; valor: number }[]) {
          (precosPorCategoria[p.categoria_id] ??= {})[p.opcao_id] = Number(p.valor);
        }
      }
      setRegras({
        opcoes,
        precosPorCategoria,
        prazoPadrao: reg?.prazo_inicial_dias ?? null,
        prazoPorCategoria: Object.fromEntries(((cats ?? []) as { id: string; prazo_inicial_dias: number | null }[]).map((c) => [c.id, c.prazo_inicial_dias])),
      });
    })();
  }, [fotografoId]);
  return regras;
}

/** Opções efetivas de uma galeria (para gravar as colunas antigas por compatibilidade e para exibir). */
export function efetivasDaGaleria(regras: RegrasRenovacaoCarregadas | null, categoriaId: string | null, personalizada: RenovacaoPersonalizada | null): OpcaoEfetiva[] {
  if (!regras) return [];
  return opcoesEfetivas({
    opcoes: regras.opcoes,
    precosCategoria: (categoriaId && regras.precosPorCategoria[categoriaId]) || {},
    personalizada,
  });
}

/** Prazo inicial sugerido: o da categoria ou o padrão (null = sem prazo). */
export function prazoSugerido(regras: RegrasRenovacaoCarregadas | null, categoriaId: string | null): number | null {
  if (!regras) return null;
  return (categoriaId ? regras.prazoPorCategoria[categoriaId] : null) ?? regras.prazoPadrao;
}

export function RenovacaoGaleria({ regras, categoriaNome, categoriaId, value, onChange }: {
  regras: RegrasRenovacaoCarregadas | null;
  categoriaNome: string | null;
  categoriaId: string | null;
  value: RenovacaoPersonalizada | null;
  onChange: (v: RenovacaoPersonalizada | null) => void;
}) {
  if (!regras) return <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Carregando regras de renovação…</div>;

  const ativas = regras.opcoes.filter((o) => o.ativo).sort((a, b) => a.ordem - b.ordem || a.dias - b.dias);
  const herdadas = efetivasDaGaleria(regras, categoriaId, null);
  const efetivas = efetivasDaGaleria(regras, categoriaId, value);
  const origem = categoriaId && regras.precosPorCategoria[categoriaId] && Object.keys(regras.precosPorCategoria[categoriaId]).length
    ? `categoria ${categoriaNome ?? ""}`.trim() : "padrão";

  if (ativas.length === 0) {
    return (
      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
        Nenhuma opção de renovação ativa. Configure em{" "}
        <a href="/configuracoes/financeiro/galeria-entrega" style={{ color: "#2563EB", fontWeight: 600, textDecoration: "none" }}>⚙️ Configurações → Financeiro</a>.
      </div>
    );
  }

  if (!value) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 13, color: "var(--color-text-primary)" }}>
          <span style={{ fontSize: 11, color: "var(--color-text-secondary)", display: "block", marginBottom: 2 }}>Herdado de: {origem}</span>
          {resumoOpcoes(herdadas)}
        </div>
        <button type="button"
          onClick={() => onChange(Object.fromEntries(ativas.map((o) => [o.id, herdadas.find((h) => h.id === o.id)?.valor ?? null])))}
          style={{ padding: "6px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
          Personalizar
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 8 }}>Valores só desta galeria (vazio = não oferece esta opção).</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ativas.map((o) => (
          <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: "var(--color-text-primary)", width: 110 }}>{o.rotulo}</span>
            <div style={{ position: "relative", width: 150 }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--color-text-secondary)", pointerEvents: "none" }}>R$</span>
              <input type="text" inputMode="numeric"
                value={value[o.id] != null && value[o.id]! > 0 ? formatarMoeda(value[o.id]!) : ""}
                onChange={(e) => onChange({ ...value, [o.id]: parseMoeda(mascaraMoeda(e.target.value)) || null })}
                placeholder="não oferece"
                style={{ ...inputStyle, width: "100%", paddingLeft: 32, fontSize: 13 }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Cliente verá: {resumoOpcoes(efetivas)}</span>
        <button type="button" onClick={() => onChange(null)}
          style={{ background: "none", border: "none", color: "#2563EB", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>
          Voltar a herdar ({resumoOpcoes(herdadas)})
        </button>
      </div>
    </div>
  );
}
