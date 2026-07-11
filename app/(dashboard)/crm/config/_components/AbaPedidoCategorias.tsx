"use client";

// Config das CATEGORIAS DE PEDIDO: nome + flags (pede data / local / horário) + ativo.
// As flags controlam quais campos aparecem no formulário do pedido daquela categoria.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CrmPedidoCategoria } from "@/lib/supabase/types";

const inputStyle: React.CSSProperties = {
  padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)",
  background: "var(--color-background-secondary)", fontSize: 13, color: "var(--color-text-primary)", outline: "none",
};
const th: React.CSSProperties = { padding: "9px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", whiteSpace: "nowrap" };
const thC: React.CSSProperties = { ...th, textAlign: "center" };

export function AbaPedidoCategorias({ fotografoId }: { fotografoId: string }) {
  const [cats, setCats] = useState<CrmPedidoCategoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [novo, setNovo] = useState("");
  const sb = createClient();

  useEffect(() => {
    sb.from("crm_pedido_categorias").select("*").eq("fotografo_id", fotografoId).order("ordem").order("nome")
      .then(({ data }) => { setCats((data ?? []) as CrmPedidoCategoria[]); setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fotografoId]);

  async function adicionar() {
    const nome = novo.trim();
    if (!nome) return;
    const ordem = cats.length > 0 ? Math.max(...cats.map((c) => c.ordem)) + 1 : 0;
    const { data } = await sb.from("crm_pedido_categorias")
      .insert({ fotografo_id: fotografoId, nome, ordem }).select("*").single();
    if (data) setCats((prev) => [...prev, data as CrmPedidoCategoria]);
    setNovo("");
  }

  async function patch(c: CrmPedidoCategoria, campo: Partial<CrmPedidoCategoria>) {
    setCats((prev) => prev.map((x) => x.id === c.id ? { ...x, ...campo } : x));
    await sb.from("crm_pedido_categorias").update(campo).eq("id", c.id);
  }

  async function excluir(c: CrmPedidoCategoria) {
    if (!confirm(`Excluir a categoria "${c.nome}"? (pedidos existentes com essa categoria não mudam)`)) return;
    setCats((prev) => prev.filter((x) => x.id !== c.id));
    await sb.from("crm_pedido_categorias").delete().eq("id", c.id);
  }

  const chk = (on: boolean, onChange: () => void, cor = "#2563EB") => (
    <input type="checkbox" checked={on} onChange={onChange} style={{ accentColor: cor, cursor: "pointer", width: 15, height: 15 }} />
  );

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 16px", lineHeight: 1.6 }}>
        Categorias usadas nos pedidos. Marque, em cada uma, se ela pede <strong>data</strong>, <strong>local</strong> e <strong>horário</strong> —
        os campos aparecem no pedido conforme essas opções (ex.: álbum pode ficar sem nenhum).
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input value={novo} onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") adicionar(); }}
          placeholder="Nome da nova categoria…" style={{ ...inputStyle, flex: 1, maxWidth: 320 }} />
        <button onClick={adicionar} style={{ padding: "8px 16px", borderRadius: 8, background: "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Adicionar</button>
      </div>

      {loading ? (
        <div style={{ color: "var(--color-text-secondary)", fontSize: 13, padding: 20 }}>Carregando…</div>
      ) : cats.length === 0 ? (
        <div style={{ color: "var(--color-text-secondary)", fontSize: 13, padding: 20 }}>Nenhuma categoria ainda.</div>
      ) : (
        <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                <th style={th}>Categoria</th>
                <th style={thC}>Pede data</th>
                <th style={thC}>Pede local</th>
                <th style={thC}>Pede horário</th>
                <th style={thC}>Ativa</th>
                <th style={thC}></th>
              </tr>
            </thead>
            <tbody>
              {cats.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: i < cats.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none", opacity: c.ativo ? 1 : 0.55 }}>
                  <td style={{ padding: "8px 12px" }}>
                    <input defaultValue={c.nome} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== c.nome) patch(c, { nome: v }); }}
                      style={{ ...inputStyle, width: "100%", background: "transparent", border: "0.5px solid transparent" }} />
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "center" }}>{chk(c.pede_data, () => patch(c, { pede_data: !c.pede_data }))}</td>
                  <td style={{ padding: "8px 12px", textAlign: "center" }}>{chk(c.pede_local, () => patch(c, { pede_local: !c.pede_local }))}</td>
                  <td style={{ padding: "8px 12px", textAlign: "center" }}>{chk(c.pede_horario, () => patch(c, { pede_horario: !c.pede_horario }))}</td>
                  <td style={{ padding: "8px 12px", textAlign: "center" }}>{chk(c.ativo, () => patch(c, { ativo: !c.ativo }), "#16a34a")}</td>
                  <td style={{ padding: "8px 12px", textAlign: "center" }}>
                    <button onClick={() => excluir(c)} title="Excluir" style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#EF4444" }}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
