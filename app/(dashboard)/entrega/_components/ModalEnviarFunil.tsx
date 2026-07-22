"use client";

// Modal ao enviar a galeria ao funil de reativação. Além de inscrever, o fotógrafo escolhe se
// oferece também a renovação ANUAL (1 ano) ao cliente — a de 30 dias continua valendo sempre.
// O valor é pré-preenchido a partir da categoria (taxa_renovacao_anual), editável aqui.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mascaraMoeda, parseMoeda, formatarMoeda } from "@/lib/moeda";

type GaleriaMin = {
  id: string;
  categoria_id: string | null;
  renovacao_anual_ativa?: boolean | null;
  renovacao_anual_valor?: number | null;
};

export function ModalEnviarFunil({
  galeria, jaNoFunil = false, onFechar, onConfirmado,
}: {
  galeria: GaleriaMin;
  jaNoFunil?: boolean;
  onFechar: () => void;
  onConfirmado: () => void;
}) {
  const [ativa, setAtiva]   = useState<boolean>(!!galeria.renovacao_anual_ativa);
  const [valor, setValor]   = useState<string>(galeria.renovacao_anual_valor != null ? formatarMoeda(galeria.renovacao_anual_valor) : "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]     = useState<string | null>(null);

  // Pré-preenche o valor com a taxa anual da categoria quando ainda não há valor na galeria.
  useEffect(() => {
    if (!galeria.categoria_id || galeria.renovacao_anual_valor != null) return;
    createClient().from("categorias").select("taxa_renovacao_anual").eq("id", galeria.categoria_id).maybeSingle()
      .then(({ data }) => {
        const t = (data as { taxa_renovacao_anual: number | null } | null)?.taxa_renovacao_anual;
        if (t != null) setValor((v) => v || formatarMoeda(t));
      });
  }, [galeria.categoria_id, galeria.renovacao_anual_valor]);

  async function confirmar() {
    setErro(null);
    const valorNum = parseMoeda(valor) || null;
    if (ativa && (!valorNum || valorNum <= 0)) { setErro("Informe o valor da renovação de 1 ano."); return; }
    setSalvando(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("galerias_entrega")
        .update({ renovacao_anual_ativa: ativa, renovacao_anual_valor: valorNum })
        .eq("id", galeria.id);
      if (error) throw new Error(error.message);
      // Inscreve no funil (idempotente — upsert por galeria_id).
      const res = await fetch(`/api/campanha/galeria/${galeria.id}`);
      if (!res.ok) throw new Error("Falha ao enviar ao funil.");
      onConfirmado();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao enviar ao funil.");
      setSalvando(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
      onClick={(e) => { if (e.target === e.currentTarget) onFechar(); }}
    >
      <div style={{ background: "var(--color-background-primary)", borderRadius: 14, padding: 24, maxWidth: 440, width: "100%", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 6 }}>Enviar ao funil de reativação</div>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 18px", lineHeight: 1.6 }}>
          A galeria entra na campanha de reativação. O cliente sempre poderá renovar por <strong>30 dias</strong>
          {" "}(valor padrão da galeria). Você pode oferecer <strong>também</strong> a renovação anual:
        </p>

        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: ativa ? 12 : 0 }}>
          <input type="checkbox" checked={ativa} onChange={(e) => setAtiva(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#2563EB", cursor: "pointer" }} />
          Oferecer também renovação de 1 ano
        </label>

        {ativa && (
          <div style={{ marginBottom: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>
              Valor da renovação de 1 ano
            </label>
            <div style={{ position: "relative", width: 180 }}>
              <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--color-text-secondary)", pointerEvents: "none" }}>R$</span>
              <input
                type="text" inputMode="numeric"
                value={valor} onChange={(e) => setValor(mascaraMoeda(e.target.value))}
                placeholder="0,00"
                style={{ width: "100%", padding: "9px 11px 9px 34px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13, boxSizing: "border-box", outline: "none" }}
              />
            </div>
            <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: "6px 0 0", lineHeight: 1.5 }}>
              Pré-preenchido do valor anual da categoria (Configurações → Categorias). Editável aqui.
            </p>
          </div>
        )}

        {erro && <div style={{ fontSize: 12, color: "#DC2626", marginTop: 12 }}>{erro}</div>}

        <div style={{ display: "flex", gap: 8, marginTop: 22, justifyContent: "flex-end" }}>
          <button onClick={onFechar} disabled={salvando}
            style={{ padding: "10px 16px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Cancelar
          </button>
          <button onClick={confirmar} disabled={salvando}
            style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#2563EB", color: "#fff", fontSize: 13, fontWeight: 700, cursor: salvando ? "default" : "pointer", opacity: salvando ? 0.7 : 1 }}>
            {salvando ? "Enviando…" : jaNoFunil ? "Salvar" : "Enviar ao funil"}
          </button>
        </div>
      </div>
    </div>
  );
}
