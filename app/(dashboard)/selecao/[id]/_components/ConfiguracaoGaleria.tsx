"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GaleriaSelecao, Cliente, Categoria } from "@/lib/supabase/types";

export function ConfiguracaoGaleria({
  galeria, cliente, categorias, onUpdate,
}: {
  galeria:    GaleriaSelecao;
  cliente:    Cliente | null;
  categorias: Categoria[];
  onUpdate:   (patch: Partial<GaleriaSelecao>, novoCliente: Cliente | null) => void;
}) {
  const [titulo,        setTitulo]        = useState(galeria.titulo);
  const [descricao,     setDescricao]     = useState(galeria.descricao ?? "");
  const [dataEvento,    setDataEvento]    = useState(galeria.data_evento ?? "");
  const [expiraEm,      setExpiraEm]      = useState(galeria.expira_em ? galeria.expira_em.slice(0, 10) : "");
  const [selecaoLivre,  setSelecaoLivre]  = useState(galeria.selecao_livre);
  const [mostrarRating, setMostrarRating] = useState(galeria.mostrar_rating_cliente);
  const [marcaDagua,    setMarcaDagua]    = useState(galeria.marca_dagua ?? true);
  const [limiteMin,     setLimiteMin]     = useState(galeria.limite_minimo?.toString() ?? "");
  const [limiteMax,     setLimiteMax]     = useState(galeria.limite_maximo?.toString() ?? "");
  const [clienteId,     setClienteId]     = useState(galeria.cliente_id ?? "");

  const [clientes,     setClientes]     = useState<{ id: string; nome: string; email: string | null }[]>([]);
  const [clientesLoad, setClientesLoad] = useState(false);
  const [salvando,     setSalvando]     = useState(false);
  const [erro,         setErro]         = useState("");
  const [salvo,        setSalvo]        = useState(false);

  useEffect(() => {
    setClientesLoad(true);
    createClient()
      .from("clientes")
      .select("id, nome, email")
      .order("nome")
      .then(({ data }) => {
        setClientes((data ?? []) as { id: string; nome: string; email: string | null }[]);
        setClientesLoad(false);
      });
  }, []);

  async function salvar() {
    if (!titulo.trim()) { setErro("O título é obrigatório."); return; }
    setSalvando(true);
    setErro("");

    const patch: Record<string, unknown> = {
      titulo:                 titulo.trim(),
      descricao:              descricao.trim() || null,
      data_evento:            dataEvento || null,
      expira_em:              expiraEm   || null,
      selecao_livre:          selecaoLivre,
      limite_minimo:          selecaoLivre ? null : (limiteMin ? parseInt(limiteMin) : null),
      limite_maximo:          selecaoLivre ? null : (limiteMax ? parseInt(limiteMax) : null),
      mostrar_rating_cliente: mostrarRating,
      marca_dagua:            marcaDagua,
      cliente_id:             clienteId   || null,
      updated_at:             new Date().toISOString(),
    };

    const { error } = await createClient()
      .from("galerias_selecao")
      .update(patch)
      .eq("id", galeria.id);

    setSalvando(false);
    if (error) { setErro(error.message); return; }

    let novoCliente: Cliente | null = null;
    if (clienteId && clienteId !== galeria.cliente_id) {
      const { data } = await createClient()
        .from("clientes").select("*").eq("id", clienteId).single();
      novoCliente = data as Cliente | null;
    } else if (!clienteId) {
      novoCliente = null;
    } else {
      novoCliente = cliente;
    }

    onUpdate(patch as Partial<GaleriaSelecao>, novoCliente);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2500);
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    background: "var(--color-background-secondary)",
    border: "0.5px solid var(--color-border-secondary)",
    color: "var(--color-text-primary)", fontSize: 13,
    outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  };
  const label: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)",
    textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, display: "block",
  };
  const field: React.CSSProperties = { marginBottom: 18 };

  return (
    <div style={{ maxWidth: 600 }}>

      <div style={field}>
        <label style={label}>Título da galeria</label>
        <input style={inp} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Casamento João e Maria" />
      </div>

      <div style={field}>
        <label style={label}>Descrição (opcional)</label>
        <textarea
          style={{ ...inp, resize: "vertical", lineHeight: 1.5 }}
          rows={2}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Mensagem exibida na capa da galeria…"
        />
      </div>

      <div style={field}>
        <label style={label}>Cliente vinculado</label>
        {clientesLoad ? (
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", padding: "8px 0" }}>Carregando clientes…</div>
        ) : (
          <select
            style={{ ...inp, cursor: "pointer" }}
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
          >
            <option value="">— Sem cliente (acesso público pelo link) —</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}{c.email ? ` — ${c.email}` : ""}
              </option>
            ))}
          </select>
        )}
        {!clienteId && (
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 5 }}>
            ℹ️ Sem cliente vinculado, qualquer pessoa com o link pode acessar a galeria sem senha.
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
        <div>
          <label style={label}>Data do evento</label>
          <input style={inp} type="date" value={dataEvento} onChange={(e) => setDataEvento(e.target.value)} />
        </div>
        <div>
          <label style={label}>Prazo de seleção</label>
          <input style={inp} type="date" value={expiraEm} onChange={(e) => setExpiraEm(e.target.value)} />
        </div>
      </div>

      <div style={field}>
        <label style={label}>Regra de seleção</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {[
            { val: true,  label: "Livre (sem limite)" },
            { val: false, label: "Com limites" },
          ].map((op) => (
            <button
              key={String(op.val)}
              onClick={() => setSelecaoLivre(op.val)}
              style={{
                padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: "0.5px solid",
                borderColor: selecaoLivre === op.val ? "var(--color-text-primary)" : "var(--color-border-secondary)",
                background: selecaoLivre === op.val ? "var(--color-text-primary)" : "transparent",
                color: selecaoLivre === op.val ? "var(--color-background-primary)" : "var(--color-text-secondary)",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {op.label}
            </button>
          ))}
        </div>
        {!selecaoLivre && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ ...label, textTransform: "none", letterSpacing: 0, fontSize: 12 }}>Mínimo de fotos</label>
              <input style={inp} type="number" min={1} value={limiteMin} onChange={(e) => setLimiteMin(e.target.value)} placeholder="Sem mínimo" />
            </div>
            <div>
              <label style={{ ...label, textTransform: "none", letterSpacing: 0, fontSize: 12 }}>Máximo de fotos</label>
              <input style={inp} type="number" min={1} value={limiteMax} onChange={(e) => setLimiteMax(e.target.value)} placeholder="Sem máximo" />
            </div>
          </div>
        )}
      </div>

      {/* Toggle: mostrar rating para o cliente */}
      <div style={{ ...field, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "var(--color-background-secondary)", borderRadius: 8, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>Mostrar classificação (estrelas) para o cliente</div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>O cliente verá a classificação que você atribuiu a cada foto</div>
        </div>
        <button
          onClick={() => setMostrarRating((v) => !v)}
          style={{
            width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer",
            background: mostrarRating ? "#2563EB" : "var(--color-border-tertiary)",
            position: "relative", flexShrink: 0, transition: "background 0.2s",
          }}
        >
          <span style={{
            position: "absolute", top: 3, left: mostrarRating ? 20 : 3,
            width: 16, height: 16, borderRadius: "50%", background: "#fff",
            transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            display: "block",
          }} />
        </button>
      </div>

      {/* Toggle: marca d'água */}
      <div style={{ ...field, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "var(--color-background-secondary)", borderRadius: 8, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>Aplicar marca d'água nas fotos</div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>A marca d'água configurada na sua conta será aplicada ao exibir as fotos</div>
        </div>
        <button
          onClick={() => setMarcaDagua((v) => !v)}
          style={{
            width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer",
            background: marcaDagua ? "#2563EB" : "var(--color-border-tertiary)",
            position: "relative", flexShrink: 0, transition: "background 0.2s",
          }}
        >
          <span style={{
            position: "absolute", top: 3, left: marcaDagua ? 20 : 3,
            width: 16, height: 16, borderRadius: "50%", background: "#fff",
            transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            display: "block",
          }} />
        </button>
      </div>

      {/* Info somente leitura */}
      <div style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 20 }}>
        Resolução: <strong>{galeria.resolucao_exibicao === "fullhd" ? "Full HD" : galeria.resolucao_exibicao.toUpperCase()}</strong>
        {categorias.length > 0 && <> · Categorias: <strong>{categorias.map((c) => c.nome).join(", ")}</strong></>}
        {" · "}Criada em <strong>{new Date(galeria.created_at).toLocaleDateString("pt-BR")}</strong>
      </div>

      {erro && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#DC2626", marginBottom: 14 }}>
          ⚠️ {erro}
        </div>
      )}

      <button
        onClick={salvar}
        disabled={salvando}
        style={{
          padding: "10px 28px", borderRadius: 9,
          background: salvo ? "rgba(5,150,105,0.1)" : "var(--color-text-primary)",
          color: salvo ? "#059669" : "var(--color-background-primary)",
          border: salvo ? "0.5px solid rgba(5,150,105,0.4)" : "none",
          fontSize: 13, fontWeight: 700, cursor: salvando ? "not-allowed" : "pointer",
          transition: "all 0.2s",
        }}
      >
        {salvando ? "Salvando…" : salvo ? "✓ Salvo!" : "Salvar alterações"}
      </button>
    </div>
  );
}
