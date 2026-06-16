"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { CrmProduct, CrmChartOfAccount } from "@/lib/supabase/types";

const CATEGORIAS = ["Evento","Ensaio","Album/Livro","Ampliações","DVD/Mídia","Produtos","Curso","Estúdio","Produção Áudio Visual","Outro"];
type Tab = "info" | "precos";

interface Props { produto?: CrmProduct; }

export function FormProduto({ produto }: Props) {
  const router        = useRouter();
  const { fotografo } = useFotografo();
  const editando      = !!produto;

  const [aba, setAba]                   = useState<Tab>("info");
  const [saving, setSaving]             = useState(false);
  const [erro, setErro]                 = useState("");
  const [contasVendas, setContasVendas] = useState<CrmChartOfAccount[]>([]);

  // Campos
  const [categoria,     setCategoria]     = useState(produto?.categoria     ?? "");
  const [nome,          setNome]          = useState(produto?.nome          ?? "");
  const [codigo,        setCodigo]        = useState(produto?.codigo        ?? "");
  const [descricao,     setDescricao]     = useState(produto?.descricao     ?? "");
  const [tagsInput,     setTagsInput]     = useState(produto?.tags?.join(", ") ?? "");
  const [pacote,        setPacote]        = useState(produto?.pacote        ?? false);
  const [preco,         setPreco]         = useState(produto ? String(produto.preco) : "");
  const [contaVendas,   setContaVendas]   = useState(produto?.conta_vendas_id ?? "");
  const [ativo,         setAtivo]         = useState(produto?.ativo         ?? true);
  const [listaPrecos,   setListaPrecos]   = useState(produto?.lista_precos  ?? false);

  useEffect(() => {
    createClient()
      .from("crm_chart_of_accounts")
      .select("*")
      .eq("tipo", "receita")
      .or("fotografo_id.is.null,fotografo_id.eq." + (fotografo?.id ?? "00000000-0000-0000-0000-000000000000"))
      .order("codigo")
      .then(({ data }) => setContasVendas((data ?? []) as CrmChartOfAccount[]));
  }, [fotografo]);

  const precoNum = () => parseFloat(preco.replace(/\./g, "").replace(",", ".")) || 0;

  const salvar = async () => {
    if (!fotografo) return;
    if (!nome.trim())      { setErro("Nome é obrigatório."); setAba("info"); return; }
    if (!categoria.trim()) { setErro("Categoria é obrigatória."); setAba("info"); return; }
    if (precoNum() < 0)    { setErro("Preço inválido."); return; }

    setSaving(true);
    setErro("");
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);

    const payload = {
      fotografo_id:    fotografo.id,
      categoria,
      nome:            nome.trim(),
      codigo:          codigo.trim() || null,
      descricao:       descricao.trim() || null,
      tags,
      pacote,
      preco:           precoNum(),
      conta_vendas_id: contaVendas || null,
      ativo,
      lista_precos:    listaPrecos,
    };

    const sb = createClient();
    const { error } = editando
      ? await sb.from("crm_products").update(payload).eq("id", produto!.id)
      : await sb.from("crm_products").insert(payload);

    setSaving(false);
    if (error) { setErro(error.message); return; }
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

  return (
    <div style={{ padding: "28px 32px", maxWidth: 640, fontFamily: "var(--font-sans)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => router.push("/crm/produtos")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 13, padding: 0 }}>
          ← Produtos
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-text-primary)", margin: 0 }}>
          {editando ? "Editar produto" : "Novo produto"}
        </h1>
      </div>

      {/* Abas */}
      <div style={{ display: "flex", gap: 2, marginBottom: 24, borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: 0 }}>
        {(["info", "precos"] as Tab[]).map((t) => {
          const labels: Record<Tab, string> = { info: "Informação básica", precos: "Lista de preços" };
          return (
            <button
              key={t}
              onClick={() => setAba(t)}
              style={{
                background: "none", border: "none", cursor: "pointer", padding: "8px 14px",
                fontSize: 13, fontWeight: aba === t ? 600 : 400,
                color: aba === t ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                borderBottom: aba === t ? "2px solid #2563EB" : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              {labels[t]}
            </button>
          );
        })}
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
                {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
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
              <label style={labelStyle}>CONTA DE VENDAS</label>
              <select value={contaVendas} onChange={(e) => setContaVendas(e.target.value)} style={inputStyle}>
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
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
              <Toggle value={listaPrecos} onChange={setListaPrecos} />
              <div>
                <div style={{ fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500 }}>Lista de preços</div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Tem variações de preço</div>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Aba: Lista de preços */}
      {aba === "precos" && (
        <div style={{ padding: "32px 0", textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>
          Lista de preços diferenciados — disponível em breve.
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
