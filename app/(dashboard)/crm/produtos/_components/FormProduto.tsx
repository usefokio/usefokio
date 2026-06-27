"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { CrmProduct, CrmChartOfAccount, CrmProductCategory, CrmProductCusto } from "@/lib/supabase/types";

type Tab = "info" | "custos";

interface Props { produto?: CrmProduct; }

const LABELS: Record<Tab, string> = {
  info: "Informação básica",
  custos: "Custos",
};

const EMPTY_CUSTO: Omit<CrmProductCusto, "id" | "produto_id" | "fotografo_id" | "created_at"> = {
  descricao: "",
  valor: 0,
  percentual: null,
  conta_id: null,
  referencia: "data_evento",
  dias_offset: 0,
  dias_direcao: "na_data",
  ordem: 0,
};

export function FormProduto({ produto }: Props) {
  const router        = useRouter();
  const { fotografo } = useFotografo();
  const editando      = !!produto;

  const [aba, setAba]                         = useState<Tab>("info");
  const [saving, setSaving]                   = useState(false);
  const [erro, setErro]                       = useState("");
  const [contasVendas, setContasVendas]       = useState<CrmChartOfAccount[]>([]);
  const [contasDespesa, setContasDespesa]     = useState<CrmChartOfAccount[]>([]);
  const [categorias, setCategorias]           = useState<CrmProductCategory[]>([]);


  // Campos info
  const [categoria,     setCategoria]     = useState(produto?.categoria     ?? "");
  const [nome,          setNome]          = useState(produto?.nome          ?? "");
  const [codigo,        setCodigo]        = useState(produto?.codigo        ?? "");
  const [descricao,     setDescricao]     = useState(produto?.descricao     ?? "");
  const [tagsInput,     setTagsInput]     = useState(produto?.tags?.join(", ") ?? "");
  const [pacote,        setPacote]        = useState(produto?.pacote        ?? false);
  const [preco,         setPreco]         = useState(produto ? String(produto.preco) : "");
  const [contaVendas,   setContaVendas]   = useState(produto?.conta_vendas_id ?? "");
  const [ativo,         setAtivo]         = useState(produto?.ativo         ?? true);
  // Campos custos
  const [custos,        setCustos]        = useState<(CrmProductCusto | typeof EMPTY_CUSTO & { _tmpId?: string })[]>([]);
  const [custosRemover, setCustosRemover] = useState<string[]>([]); // IDs a deletar
  const [custoForm,     setCustoForm]     = useState<typeof EMPTY_CUSTO & { _tmpId?: string; id?: string } | null>(null);

  useEffect(() => {
    if (!fotografo) return;
    const sb = createClient();

    sb.from("crm_chart_of_accounts")
      .select("*")
      .eq("tipo", "receita")
      .or("fotografo_id.is.null,fotografo_id.eq." + fotografo.id)
      .order("codigo")
      .then(({ data }) => setContasVendas((data ?? []) as CrmChartOfAccount[]));

    sb.from("crm_chart_of_accounts")
      .select("*")
      .eq("tipo", "despesa")
      .or("fotografo_id.is.null,fotografo_id.eq." + fotografo.id)
      .order("codigo")
      .then(({ data }) => setContasDespesa((data ?? []) as CrmChartOfAccount[]));

    sb.from("crm_product_categories")
      .select("*")
      .eq("fotografo_id", fotografo.id)
      .eq("ativo", true)
      .order("ordem")
      .then(({ data }) => setCategorias((data ?? []) as CrmProductCategory[]));

    if (editando && produto) {
      sb.from("crm_product_custos")
        .select("*")
        .eq("produto_id", produto.id)
        .order("ordem")
        .then(({ data }) => setCustos((data ?? []) as CrmProductCusto[]));
    }
  }, [fotografo, editando, produto]);

  const precoNum = () => parseFloat(preco.replace(/\./g, "").replace(",", ".")) || 0;

  const salvar = async () => {
    if (!fotografo) return;
    if (!nome.trim())      { setErro("Nome é obrigatório."); setAba("info"); return; }
    if (!categoria.trim()) { setErro("Categoria é obrigatória."); setAba("info"); return; }
    if (!contaVendas)      { setErro("Conta de vendas é obrigatória."); setAba("info"); return; }
    if (precoNum() < 0)    { setErro("Preço inválido."); return; }

    setSaving(true);
    setErro("");
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);

    const payload = {
      fotografo_id:         fotografo.id,
      categoria,
      nome:                 nome.trim(),
      codigo:               codigo.trim() || null,
      descricao:            descricao.trim() || null,
      tags,
      pacote,
      preco:                precoNum(),
      conta_vendas_id:      contaVendas || null,
      ativo,

    };

    const sb = createClient();
    let produtoId = produto?.id ?? "";

    if (editando) {
      const { error } = await sb.from("crm_products").update(payload).eq("id", produto!.id);
      if (error) { setSaving(false); setErro(error.message); return; }
    } else {
      const { data, error } = await sb.from("crm_products").insert(payload).select("id").single();
      if (error || !data) { setSaving(false); setErro(error?.message ?? "Erro ao criar produto."); return; }
      produtoId = data.id;
    }

    // Sincronizar custos
    if (custosRemover.length > 0) {
      await sb.from("crm_product_custos").delete().in("id", custosRemover);
    }
    const custosNovos = custos.filter((c) => !(c as CrmProductCusto).id || custosRemover.includes((c as CrmProductCusto).id));
    const custosExist  = custos.filter((c) => (c as CrmProductCusto).id && !custosRemover.includes((c as CrmProductCusto).id));

    for (const [i, c] of custosExist.entries()) {
      const cc = c as CrmProductCusto;
      await sb.from("crm_product_custos").update({
        descricao: cc.descricao, valor: cc.valor, percentual: cc.percentual,
        conta_id: cc.conta_id, referencia: cc.referencia,
        dias_offset: cc.dias_offset, dias_direcao: cc.dias_direcao, ordem: i,
      }).eq("id", cc.id);
    }
    if (custosNovos.length > 0) {
      await sb.from("crm_product_custos").insert(
        custosNovos.map((c, i) => ({
          produto_id:   produtoId,
          fotografo_id: fotografo.id,
          descricao:    c.descricao,
          valor:        c.valor,
          percentual:   c.percentual,
          conta_id:     c.conta_id,
          referencia:   c.referencia,
          dias_offset:  c.dias_offset,
          dias_direcao: c.dias_direcao,
          ordem:        custosExist.length + i,
        }))
      );
    }

    setSaving(false);
    router.push("/crm/produtos");
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", borderRadius: 8,
    border: "0.5px solid var(--color-border-secondary)",
    background: "var(--color-background-secondary)",
    fontSize: 13, color: "var(--color-text-primary)", outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", letterSpacing: "0.04em", display: "block", marginBottom: 5,
  };
  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 38, height: 22, borderRadius: 11, cursor: "pointer", position: "relative", transition: "background 0.2s",
        background: value ? "#2563EB" : "var(--color-border-secondary)", flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute", top: 3, left: value ? 18 : 3, width: 16, height: 16,
        borderRadius: "50%", background: "#fff", transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </div>
  );

  const descricaoVencimento = (c: typeof EMPTY_CUSTO) => {
    if (c.dias_direcao === "na_data") return `Na ${c.referencia === "data_evento" ? "data do evento" : "data do pedido"}`;
    const ref = c.referencia === "data_evento" ? "data do evento" : "data do pedido";
    return `${c.dias_offset} ${c.dias_offset === 1 ? "dia" : "dias"} ${c.dias_direcao === "antes" ? "antes da" : "após a"} ${ref}`;
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 680, fontFamily: "var(--font-sans)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.push("/crm/produtos")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 13, padding: 0 }}>
            ← Produtos
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-text-primary)", margin: 0 }}>
            {editando ? "Editar produto" : "Novo produto"}
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => router.push("/crm/produtos")}
            style={{ padding: "8px 16px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer" }}>
            Cancelar
          </button>
          <button onClick={salvar} disabled={saving}
            style={{ padding: "8px 20px", borderRadius: 8, background: saving ? "#93C5FD" : "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Salvando…" : editando ? "Salvar alterações" : "Criar produto"}
          </button>
        </div>
      </div>

      {/* Abas */}
      <div style={{ display: "flex", gap: 2, marginBottom: 24, borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: 0 }}>
        {(["info", "custos"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setAba(t)}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: "8px 14px",
              fontSize: 13, fontWeight: aba === t ? 600 : 400,
              color: aba === t ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              borderBottom: aba === t ? "2px solid #2563EB" : "2px solid transparent",
              marginBottom: -1, whiteSpace: "nowrap",
            }}
          >
            {LABELS[t]}
          </button>
        ))}
      </div>

      {erro && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 18, fontSize: 13, color: "#EF4444" }}>
          {erro}
        </div>
      )}

      {/* Aba: Informação básica */}
      {aba === "info" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={labelStyle}>CATEGORIA *</label>
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={inputStyle}>
                <option value="">Selecione…</option>
                {categorias.map((c) => <option key={c.id} value={c.nome}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>CÓDIGO</label>
              <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="SKU-001" style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>NOME *</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Sessão de casamento completa" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>DESCRIÇÃO</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o produto ou serviço…"
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          <div>
            <label style={labelStyle}>TAGS</label>
            <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="casamento, foto, premium (separadas por vírgula)" style={inputStyle} />
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>Separe as tags por vírgula</div>
          </div>

          <div style={{ display: "flex", gap: 20 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
              <Toggle value={pacote} onChange={setPacote} />
              <div>
                <div style={{ fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500 }}>Pacote</div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Este produto é um pacote de serviços</div>
              </div>
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={labelStyle}>PREÇO DE VENDA *</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--color-text-secondary)" }}>R$</span>
                <input
                  value={preco}
                  onChange={(e) => setPreco(e.target.value)}
                  placeholder="0,00"
                  style={{ ...inputStyle, paddingLeft: 32 }}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>CONTA DE VENDAS *</label>
              <select value={contaVendas} onChange={(e) => setContaVendas(e.target.value)}
                style={{ ...inputStyle, borderColor: !contaVendas ? "rgba(239,68,68,0.5)" : undefined }}>
                <option value="">Selecione…</option>
                {contasVendas.filter((c) => c.codigo.startsWith("3.1")).map((c) => (
                  <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 20 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
              <Toggle value={ativo} onChange={setAtivo} />
              <div>
                <div style={{ fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500 }}>Ativo</div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Produto disponível para uso em pedidos</div>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Aba: Custos */}
      {aba === "custos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
            Configure os custos deste produto. Ao ser vendido em um pedido, esses custos serão criados automaticamente como contas a pagar.
          </div>

          {custos.filter((c) => !(custosRemover.includes((c as CrmProductCusto).id))).length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                  {["Descrição", "Valor", "Quando pagar", ""].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 10px", fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", letterSpacing: "0.04em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {custos
                  .filter((c) => !(custosRemover.includes((c as CrmProductCusto).id)))
                  .map((c, i) => (
                    <tr key={(c as CrmProductCusto).id ?? (c as { _tmpId?: string })._tmpId ?? i} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                      <td style={{ padding: "8px 10px", color: "var(--color-text-primary)" }}>{c.descricao}</td>
                      <td style={{ padding: "8px 10px", color: "var(--color-text-primary)", whiteSpace: "nowrap" }}>
                        {c.percentual != null ? `${c.percentual}%` : `R$ ${Number(c.valor).toFixed(2)}`}
                      </td>
                      <td style={{ padding: "8px 10px", color: "var(--color-text-secondary)", fontSize: 12 }}>
                        {descricaoVencimento(c)}
                      </td>
                      <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                        <button
                          onClick={() => setCustoForm({ ...c, id: (c as CrmProductCusto).id, _tmpId: (c as { _tmpId?: string })._tmpId })}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#2563EB", marginRight: 8 }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => {
                            const id = (c as CrmProductCusto).id;
                            if (id) {
                              setCustosRemover((p) => [...p, id]);
                            } else {
                              setCustos((p) => p.filter((x) => x !== c));
                            }
                          }}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#EF4444" }}
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}

          <button
            onClick={() => setCustoForm({ ...EMPTY_CUSTO, _tmpId: Math.random().toString(36).slice(2) })}
            style={{ alignSelf: "flex-start", padding: "8px 14px", borderRadius: 8, background: "none", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, color: "var(--color-text-primary)", cursor: "pointer", fontWeight: 500 }}
          >
            + Adicionar custo
          </button>

          {/* Formulário inline de custo */}
          {custoForm && (
            <div style={{ border: "0.5px solid var(--color-border-secondary)", borderRadius: 10, padding: "18px 20px", background: "var(--color-background-secondary)", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 4 }}>
                {custoForm.id ? "Editar custo" : "Novo custo"}
              </div>

              <div>
                <label style={labelStyle}>DESCRIÇÃO</label>
                <input
                  value={custoForm.descricao}
                  onChange={(e) => setCustoForm((p) => p ? { ...p, descricao: e.target.value } : p)}
                  placeholder="Ex: Fotógrafo freelancer"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelStyle}>VALOR (R$)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={custoForm.percentual != null ? "" : custoForm.valor}
                    onChange={(e) => setCustoForm((p) => p ? { ...p, valor: parseFloat(e.target.value) || 0, percentual: null } : p)}
                    placeholder="0,00"
                    style={inputStyle}
                    disabled={custoForm.percentual != null}
                  />
                </div>
                <div>
                  <label style={labelStyle}>— OU PERCENTUAL (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={custoForm.percentual ?? ""}
                    onChange={(e) => {
                      const v = e.target.value === "" ? null : parseFloat(e.target.value);
                      setCustoForm((p) => p ? { ...p, percentual: v, valor: v != null ? 0 : p.valor } : p);
                    }}
                    placeholder="Ex: 10"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>CONTA A PAGAR</label>
                <select
                  value={custoForm.conta_id ?? ""}
                  onChange={(e) => setCustoForm((p) => p ? { ...p, conta_id: e.target.value || null } : p)}
                  style={inputStyle}
                >
                  <option value="">Selecione…</option>
                  {contasDespesa.map((c) => (
                    <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>REFERÊNCIA</label>
                  <select
                    value={custoForm.referencia}
                    onChange={(e) => setCustoForm((p) => p ? { ...p, referencia: e.target.value as "data_evento" | "data_pedido" } : p)}
                    style={inputStyle}
                  >
                    <option value="data_evento">Data do evento</option>
                    <option value="data_pedido">Data do pedido</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>DIAS</label>
                  <input
                    type="number"
                    min={0}
                    value={custoForm.dias_offset}
                    onChange={(e) => setCustoForm((p) => p ? { ...p, dias_offset: parseInt(e.target.value) || 0 } : p)}
                    disabled={custoForm.dias_direcao === "na_data"}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>DIREÇÃO</label>
                  <select
                    value={custoForm.dias_direcao}
                    onChange={(e) => setCustoForm((p) => p ? { ...p, dias_direcao: e.target.value as "antes" | "apos" | "na_data", dias_offset: e.target.value === "na_data" ? 0 : p!.dias_offset } : p)}
                    style={inputStyle}
                  >
                    <option value="na_data">Na data</option>
                    <option value="antes">Antes</option>
                    <option value="apos">Após</option>
                  </select>
                </div>
              </div>

              <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                Vencimento: <strong>{descricaoVencimento(custoForm)}</strong>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => {
                    if (!custoForm.descricao.trim()) return;
                    if (custoForm.id) {
                      setCustos((p) => p.map((c) => (c as CrmProductCusto).id === custoForm.id ? { ...custoForm } as unknown as CrmProductCusto : c));
                    } else {
                      setCustos((p) => [...p, { ...custoForm } as unknown as CrmProductCusto]);
                    }
                    setCustoForm(null);
                  }}
                  style={{ padding: "8px 16px", borderRadius: 8, background: "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  {custoForm.id ? "Atualizar" : "Adicionar"}
                </button>
                <button
                  onClick={() => setCustoForm(null)}
                  style={{ padding: "8px 14px", borderRadius: 8, background: "none", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ações */}
      <div style={{ display: "flex", gap: 10, marginTop: 28, paddingTop: 20, borderTop: "0.5px solid var(--color-border-tertiary)" }}>
        <button
          onClick={salvar}
          disabled={saving}
          style={{ padding: "10px 22px", borderRadius: 8, background: saving ? "#93C5FD" : "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}
        >
          {saving ? "Salvando…" : editando ? "Salvar alterações" : "Criar produto"}
        </button>
        <button onClick={() => router.push("/crm/produtos")} style={{ padding: "10px 16px", borderRadius: 8, background: "none", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
