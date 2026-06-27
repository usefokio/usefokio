"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { RichTextEditor } from "@/app/(dashboard)/crm/_components/RichTextEditor";
import type { CrmContractTemplate } from "@/lib/supabase/types";

type Props = { fotografoId: string };

const VARIAVEIS: { grupo: string; vars: { key: string; label: string }[] }[] = [
  { grupo: "Cliente", vars: [
    { key: "{{NOME_CLIENTE}}", label: "Nome" },
    { key: "{{CPF_CLIENTE}}", label: "CPF" },
    { key: "{{RG_CLIENTE}}", label: "RG" },
    { key: "{{EMAIL_CLIENTE}}", label: "E-mail" },
    { key: "{{TELEFONE_CLIENTE}}", label: "Telefone" },
    { key: "{{WHATSAPP_CLIENTE}}", label: "WhatsApp" },
    { key: "{{ENDERECO_CLIENTE}}", label: "Endereço" },
    { key: "{{BAIRRO_CLIENTE}}", label: "Bairro" },
    { key: "{{CIDADE_CLIENTE}}", label: "Cidade" },
    { key: "{{ESTADO_CLIENTE}}", label: "Estado" },
    { key: "{{CEP_CLIENTE}}", label: "CEP" },
  ]},
  { grupo: "Pedido", vars: [
    { key: "{{NUMERO_PEDIDO}}", label: "Número do pedido" },
    { key: "{{DATA_EVENTO}}", label: "Data do evento" },
    { key: "{{HORA_EVENTO}}", label: "Hora do evento" },
    { key: "{{LOCAL_EVENTO}}", label: "Local do evento" },
    { key: "{{CIDADE_EVENTO}}", label: "Cidade do evento" },
    { key: "{{ESTADO_EVENTO}}", label: "Estado do evento" },
    { key: "{{CONVIDADOS}}", label: "Nº de convidados" },
    { key: "{{LOCAL_CERIMONIA}}", label: "Local da cerimônia" },
    { key: "{{LOCAL_RECEPCAO}}", label: "Local da recepção" },
    { key: "{{VALOR_TOTAL}}", label: "Valor total" },
    { key: "{{QTD_PARCELAS}}", label: "Qtd. parcelas" },
    { key: "{{ITENS_CONTRATO}}", label: "Itens contratados" },
    { key: "{{CRONOGRAMA_PAGAMENTO}}", label: "Cronograma de pagamento" },
  ]},
  { grupo: "Empresa", vars: [
    { key: "{{NOME_EMPRESA}}", label: "Nome da empresa" },
    { key: "{{CIDADE_EMPRESA}}", label: "Cidade da empresa" },
    { key: "{{ESTADO_EMPRESA}}", label: "Estado da empresa" },
    { key: "{{DATA_ATUAL}}", label: "Data atual" },
  ]},
];

const inputSt: React.CSSProperties = {
  padding: "7px 10px", borderRadius: 7,
  border: "0.5px solid var(--color-border-secondary)",
  background: "var(--color-background-primary)",
  fontSize: 13, color: "var(--color-text-primary)", outline: "none", width: "100%", boxSizing: "border-box",
};

export function AbaContratos({ fotografoId }: Props) {
  const sb = createClient();
  const [templates, setTemplates] = useState<CrmContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<CrmContractTemplate | null | "novo">(null);
  const [nome, setNome] = useState("");
  const [corpo, setCorpo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState<CrmContractTemplate | null>(null);
  const [copiado, setCopiado] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await sb.from("crm_contract_templates").select("*").eq("fotografo_id", fotografoId).order("created_at");
    setTemplates((data ?? []) as CrmContractTemplate[]);
    setLoading(false);
  }, [fotografoId]);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirNovo = () => {
    setEditando("novo");
    setNome("");
    setCorpo("<p></p>");
  };

  const abrirEditar = (t: CrmContractTemplate) => {
    setEditando(t);
    setNome(t.nome);
    setCorpo(t.corpo);
  };

  const salvar = async () => {
    if (!nome.trim() || !corpo.trim()) return;
    setSalvando(true);
    if (editando === "novo") {
      await sb.from("crm_contract_templates").insert({ fotografo_id: fotografoId, nome: nome.trim(), corpo });
    } else if (editando) {
      await sb.from("crm_contract_templates").update({ nome: nome.trim(), corpo, updated_at: new Date().toISOString() }).eq("id", editando.id);
    }
    setSalvando(false);
    setEditando(null);
    carregar();
  };

  const excluir = async () => {
    if (!excluindo) return;
    await sb.from("crm_contract_templates").delete().eq("id", excluindo.id);
    setExcluindo(null);
    carregar();
  };

  const copiarVar = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiado(key);
    setTimeout(() => setCopiado(""), 1500);
  };

  const fmtData = (s: string) => new Date(s).toLocaleDateString("pt-BR");

  if (editando !== null) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 20, alignItems: "start" }}>
        {/* Editor */}
        <div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Nome do modelo *</div>
            <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Contrato Casamento" style={inputSt} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Corpo do contrato *</div>
            <RichTextEditor value={corpo} onChange={setCorpo} minHeight={500} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={salvar} disabled={salvando || !nome.trim()} style={{ padding: "9px 22px", borderRadius: 8, background: "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: salvando || !nome.trim() ? 0.6 : 1 }}>
              {salvando ? "Salvando…" : "Salvar modelo"}
            </button>
            <button onClick={() => setEditando(null)} style={{ padding: "9px 16px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer" }}>
              Cancelar
            </button>
          </div>
        </div>

        {/* Painel de variáveis */}
        <div style={{ position: "sticky", top: 24, border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Variáveis disponíveis
          </div>
          <div style={{ padding: "10px 0", maxHeight: 560, overflowY: "auto" }}>
            {VARIAVEIS.map(grupo => (
              <div key={grupo.grupo}>
                <div style={{ padding: "6px 14px 3px", fontSize: 10, fontWeight: 800, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{grupo.grupo}</div>
                {grupo.vars.map(v => (
                  <button key={v.key} onClick={() => copiarVar(v.key)}
                    style={{ display: "flex", width: "100%", padding: "5px 14px", background: copiado === v.key ? "rgba(16,185,129,0.08)" : "transparent", border: "none", cursor: "pointer", textAlign: "left", gap: 8, alignItems: "center" }}>
                    <code style={{ fontSize: 10, color: copiado === v.key ? "#059669" : "#2563EB", background: "rgba(37,99,235,0.07)", borderRadius: 4, padding: "1px 4px", flexShrink: 0 }}>
                      {copiado === v.key ? "✓ copiado" : v.key}
                    </code>
                    <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{v.label}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div style={{ padding: "10px 14px", borderTop: "0.5px solid var(--color-border-tertiary)", fontSize: 11, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
            Clique para copiar e cole no contrato onde desejar.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
          Modelos de contrato gerados com os dados do pedido e do cliente.
        </p>
        <button onClick={abrirNovo} style={{ padding: "8px 18px", borderRadius: 8, background: "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + Novo modelo
        </button>
      </div>

      {loading ? (
        <div style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>Carregando…</div>
      ) : templates.length === 0 ? (
        <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "52px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>Nenhum modelo cadastrado</div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 20 }}>Crie um modelo de contrato para usar nos pedidos.</div>
          <button onClick={abrirNovo} style={{ padding: "9px 22px", borderRadius: 8, background: "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            + Novo modelo
          </button>
        </div>
      ) : (
        <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, overflow: "hidden" }}>
          {templates.map((t, i) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: i < templates.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none", background: "var(--color-background-primary)" }}>
              <div style={{ fontSize: 22, flexShrink: 0 }}>📄</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>{t.nome}</div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Criado em {fmtData(t.created_at)}</div>
              </div>
              <button onClick={() => abrirEditar(t)} style={{ padding: "6px 14px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer" }}>
                Editar
              </button>
              <button onClick={() => setExcluindo(t)} style={{ padding: "6px 14px", borderRadius: 7, border: "0.5px solid rgba(239,68,68,0.3)", background: "transparent", fontSize: 12, color: "#EF4444", cursor: "pointer" }}>
                Excluir
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal excluir */}
      {excluindo && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => e.target === e.currentTarget && setExcluindo(null)}>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 32px", width: 400 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 10 }}>Excluir modelo?</div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 22 }}>
              O modelo <strong>{excluindo.nome}</strong> será removido. Contratos já gerados não serão afetados.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={excluir} style={{ padding: "9px 20px", borderRadius: 8, background: "#EF4444", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Excluir</button>
              <button onClick={() => setExcluindo(null)} style={{ padding: "9px 16px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
