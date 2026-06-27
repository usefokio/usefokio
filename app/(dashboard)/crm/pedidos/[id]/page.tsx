"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import FormPedido from "../_components/FormPedido";
import { PEDIDO_STATUS_MAP, FIN_STATUS_MAP } from "@/lib/constants/statusMaps";
import { formatBRL, formatData } from "@/lib/utils/format";
import type { CrmOrder, CrmFinancialEntry, CrmContractTemplate, CrmContract } from "@/lib/supabase/types";
import { RichTextEditor } from "@/app/(dashboard)/crm/_components/RichTextEditor";

type OrderWithCliente = CrmOrder & { clientes?: { id: string; nome: string; email?: string | null } | null };

type OrderItem = {
  id: string;
  produto_id: string | null;
  descricao: string;
  quantidade: number;
  preco_unit: number;
  total: number;
  crm_products?: { nome: string } | null;
};

const STATUS_MAP = PEDIDO_STATUS_MAP;
const STATUS_FIN = FIN_STATUS_MAP;

export default function PedidoDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();

  const [pedido,     setPedido]     = useState<OrderWithCliente | null>(null);
  const [financeiro, setFinanceiro] = useState<CrmFinancialEntry[]>([]);
  const [itens,      setItens]      = useState<OrderItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [editing,    setEditing]    = useState(false);
  const [confirmDel,    setConfirmDel]    = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [agendaMsg,     setAgendaMsg]     = useState("");
  const [modalTaxa,     setModalTaxa]     = useState<{ receita: CrmFinancialEntry; taxa: string } | null>(null);
  const [salvandoTaxa,  setSalvandoTaxa]  = useState(false);

  // Contratos
  const [contratos,           setContratos]           = useState<CrmContract[]>([]);
  const [modalContrato,       setModalContrato]       = useState(false);
  const [templates,           setTemplates]           = useState<CrmContractTemplate[]>([]);
  const [templateId,          setTemplateId]          = useState("");
  const [horaEvento,          setHoraEvento]          = useState("");
  const [localEvento,         setLocalEvento]         = useState("");
  const [cidadeEvento,        setCidadeEvento]        = useState("");
  const [estadoEvento,        setEstadoEvento]        = useState("");
  const [convidados,          setConvidados]          = useState("");
  const [gerandoContrato,     setGerandoContrato]     = useState(false);
  // Editar contrato
  const [modalEditarContrato, setModalEditarContrato] = useState<CrmContract | null>(null);
  const [corpoEditado,        setCorpoEditado]        = useState("");
  const [salvandoContrato,    setSalvandoContrato]    = useState(false);
  // Email contrato
  const [modalEmailContrato,  setModalEmailContrato]  = useState<CrmContract | null>(null);
  const [emailPara,           setEmailPara]           = useState("");
  const [emailAssunto,        setEmailAssunto]        = useState("");
  const [emailMensagem,       setEmailMensagem]       = useState("");
  const [enviandoEmail,       setEnviandoEmail]       = useState(false);
  const [emailEnviado,        setEmailEnviado]        = useState(false);
  // Excluir contrato
  const [confirmExcluirContrato, setConfirmExcluirContrato] = useState<CrmContract | null>(null);
  const [excluindoContrato,      setExcluindoContrato]      = useState(false);

  const carregar = () => {
    const sb = createClient();
    Promise.all([
      sb.from("crm_orders").select("*, clientes(id, nome, email)").eq("id", id).single(),
      sb.from("crm_financial_entries").select("*").eq("pedido_id", id).order("vencimento"),
      sb.from("crm_order_items").select("*, crm_products(nome)").eq("pedido_id", id).order("descricao"),
      sb.from("crm_contracts").select("*").eq("pedido_id", id).order("created_at"),
    ]).then(([{ data: p }, { data: f }, { data: oi }, { data: ct }]) => {
      setPedido(p as OrderWithCliente | null);
      setFinanceiro((f ?? []) as CrmFinancialEntry[]);
      setItens((oi ?? []) as OrderItem[]);
      setContratos((ct ?? []) as CrmContract[]);
      setLoading(false);
    });
  };

  const abrirModalContrato = async () => {
    const sb = createClient();
    const fotografoId = pedido?.fotografo_id;
    if (!fotografoId) return;
    const { data } = await sb.from("crm_contract_templates").select("*").eq("fotografo_id", fotografoId).order("created_at");
    setTemplates((data ?? []) as CrmContractTemplate[]);
    setTemplateId((data ?? [])[0]?.id ?? "");
    // Pré-preencher com dados do pedido, complementar com localStorage para campos não salvos
    setHoraEvento(pedido.hora_evento ?? "");
    setLocalEvento(pedido.local_evento ?? "");
    setConvidados(pedido.convidados != null ? String(pedido.convidados) : "");
    try {
      const saved = JSON.parse(localStorage.getItem("contrato_evento_" + fotografoId) ?? "{}");
      if (!pedido.hora_evento)  setHoraEvento(saved.hora ?? "");
      if (!pedido.local_evento) setLocalEvento(saved.local ?? "");
      if (pedido.convidados == null) setConvidados(saved.convidados ?? "");
      setCidadeEvento(saved.cidade ?? "");
      setEstadoEvento(saved.estado ?? "");
    } catch { /* ignore */ }
    setModalContrato(true);
  };

  const gerarContrato = async () => {
    if (!pedido || !templateId) return;
    setGerandoContrato(true);
    const sb = createClient();
    const template = templates.find(t => t.id === templateId);
    if (!template) { setGerandoContrato(false); return; }

    // Buscar dados completos do cliente e fotógrafo
    const [{ data: cli }, { data: fot }] = await Promise.all([
      pedido.cliente_id ? sb.from("clientes").select("*").eq("id", pedido.cliente_id).single() : Promise.resolve({ data: null }),
      sb.from("fotografos").select("nome_completo, nome_empresa, cidade, estado").eq("id", pedido.fotografo_id).single(),
    ]);

    const c = cli as Record<string, string | null> | null;
    const f = fot as { nome_completo: string | null; nome_empresa: string | null; cidade: string | null; estado: string | null } | null;

    const receitas = financeiro.filter(fi => fi.tipo === "receita");
    const itensHtml = itens.length > 0
      ? "<ul>" + itens.map(i => `<li>${i.descricao || ""} — ${i.quantidade}× ${formatBRL(i.preco_unit)} = <strong>${formatBRL(i.total)}</strong></li>`).join("") + "</ul>"
      : "";
    const cronogramaHtml = receitas.length > 0
      ? "<ul>" + receitas.map(fi => `<li>Parcela ${fi.parcela ?? ""} — Vencimento: ${new Date(fi.vencimento + "T12:00:00").toLocaleDateString("pt-BR")} — <strong>${formatBRL(fi.valor)}</strong></li>`).join("") + "</ul>"
      : "";

    const enderecoCliente = [c?.logradouro, c?.numero].filter(Boolean).join(", ");
    const dataAtual = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    const dataEvento = pedido.data_evento ? new Date(pedido.data_evento + "T12:00:00").toLocaleDateString("pt-BR") : "";

    const vars: Record<string, string> = {
      NOME_CLIENTE:         c?.nome ?? "",
      CPF_CLIENTE:          c?.cpf ?? "",
      RG_CLIENTE:           c?.rg ?? "",
      EMAIL_CLIENTE:        c?.email ?? "",
      TELEFONE_CLIENTE:     c?.telefone ?? "",
      WHATSAPP_CLIENTE:     c?.whatsapp ?? "",
      ENDERECO_CLIENTE:     enderecoCliente,
      BAIRRO_CLIENTE:       c?.bairro ?? "",
      CIDADE_CLIENTE:       c?.cidade ?? "",
      ESTADO_CLIENTE:       c?.estado ?? "",
      CEP_CLIENTE:          c?.cep ?? "",
      NUMERO_PEDIDO:        pedido.numero ?? "",
      DATA_EVENTO:          dataEvento,
      HORA_EVENTO:          pedido.hora_evento ?? horaEvento,
      LOCAL_EVENTO:         (() => {
        const cat = (pedido.categoria ?? "").toLowerCase();
        const isCasamento = cat.includes("casamento") || cat === "bodas";
        if (isCasamento) {
          const parts = [pedido.local_cerimonia, pedido.local_recepcao].filter(Boolean);
          return parts.length > 0 ? parts.join(" / ") : localEvento;
        }
        return pedido.local_evento ?? localEvento;
      })(),
      CIDADE_EVENTO:        cidadeEvento,
      ESTADO_EVENTO:        estadoEvento,
      CONVIDADOS:           pedido.convidados != null ? String(pedido.convidados) : convidados,
      LOCAL_CERIMONIA:      pedido.local_cerimonia ?? "",
      LOCAL_RECEPCAO:       pedido.local_recepcao ?? "",
      VALOR_TOTAL:          formatBRL(pedido.total ?? 0),
      QTD_PARCELAS:         String(receitas.length),
      ITENS_CONTRATO:       itensHtml,
      CRONOGRAMA_PAGAMENTO: cronogramaHtml,
      NOME_EMPRESA:         f?.nome_empresa ?? f?.nome_completo ?? "",
      CIDADE_EMPRESA:       f?.cidade ?? "",
      ESTADO_EMPRESA:       f?.estado ?? "",
      DATA_ATUAL:           dataAtual,
    };

    let corpoGerado = template.corpo;
    for (const [key, val] of Object.entries(vars)) {
      corpoGerado = corpoGerado.replaceAll(`{{${key}}}`, val);
    }

    // Salvar dados do evento no localStorage para próxima vez
    try {
      localStorage.setItem("contrato_evento_" + pedido.fotografo_id, JSON.stringify({ hora: horaEvento, local: localEvento, cidade: cidadeEvento, estado: estadoEvento, convidados }));
    } catch { /* ignore */ }

    const { data: contrato } = await sb.from("crm_contracts").insert({
      fotografo_id: pedido.fotografo_id,
      pedido_id: pedido.id,
      template_id: templateId,
      nome_template: template.nome,
      corpo_gerado: corpoGerado,
    }).select("id").single();

    setGerandoContrato(false);
    setModalContrato(false);
    carregar();
    if (contrato?.id) window.open(`/crm-contrato/${contrato.id}`, "_blank");
  };

  const confirmarTaxa = async () => {
    if (!modalTaxa || !pedido) return;
    const taxa = parseFloat(modalTaxa.taxa.replace(",", ".")) || 0;
    if (taxa <= 0) return;
    setSalvandoTaxa(true);
    await createClient()
      .from("crm_financial_entries")
      .update({ valor: modalTaxa.receita.valor + taxa })
      .eq("id", modalTaxa.receita.id);
    setSalvandoTaxa(false);
    setModalTaxa(null);
    carregar();
  };

  useEffect(() => { carregar(); }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    const sb = createClient();
    if (pedido?.oportunidade_id) {
      await sb.from("crm_opportunities").update({ status: "em_aberto" }).eq("id", pedido.oportunidade_id);
    }
    await sb.from("crm_schedules").delete().eq("pedido_id", id);
    await sb.from("crm_financial_entries").delete().eq("pedido_id", id);
    await sb.from("crm_orders").delete().eq("id", id);
    router.push("/crm/pedidos");
  };

  if (loading) return <div style={{ padding: "40px 32px", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>;
  if (!pedido) return (
    <div style={{ padding: "40px 32px", fontSize: 13, color: "var(--color-text-secondary)" }}>
      Pedido não encontrado.{" "}
      <button onClick={() => router.push("/crm/pedidos")} style={{ color: "#2563EB", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>Voltar</button>
    </div>
  );

  const st  = STATUS_MAP[pedido.status] ?? STATUS_MAP.aguardando_sinal;
  const fmt = formatBRL;
  const fmtData = formatData;

  const liquido = (pedido.total ?? 0) - (pedido.discount ?? 0) + (pedido.other_expenses ?? 0);
  const totalPago = financeiro.filter(f => f.tipo === "receita" && f.status === "pago").reduce((s, f) => s + f.valor, 0);
  const totalPendente = financeiro.filter(f => f.tipo === "receita" && f.status === "pendente").reduce((s, f) => s + f.valor, 0);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 860, fontFamily: "var(--font-sans)" }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <button onClick={() => router.push("/crm/pedidos")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 13, padding: 0 }}>
          ← Pedidos
        </button>
        <span style={{ color: "var(--color-border-secondary)" }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300 }}>
          {pedido.nome ?? pedido.numero ?? "Pedido"}
        </span>
      </div>

      {/* Banner de agendamento atualizado */}
      {agendaMsg && (
        <div style={{ background: "rgba(16,185,129,0.08)", border: "0.5px solid rgba(16,185,129,0.3)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span style={{ fontSize: 13, color: "#059669" }}>✅ {agendaMsg}</span>
          <button onClick={() => setAgendaMsg("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#059669", fontSize: 16, lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* Card topo */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "18px 22px", marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.01em" }}>
              {pedido.nome ?? pedido.numero ?? "Pedido"}
            </h2>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 10, background: st.bg, color: st.color, whiteSpace: "nowrap" }}>{st.label}</span>
          </div>

          {/* Info row */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 10 }}>
            {pedido.clientes?.nome && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>👤 <Link href={`/clientes/${pedido.cliente_id}`} style={{ color: "inherit", textDecoration: "none" }} onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")} onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}>{pedido.clientes.nome}</Link></span>}
            {pedido.categoria      && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{pedido.categoria}</span>}
            {pedido.data_evento    && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>📅 Evento: {fmtData(pedido.data_evento)}</span>}
            {pedido.data_entrega   && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>🚚 Entrega: {fmtData(pedido.data_entrega)}</span>}
            {pedido.payment_method && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>💳 {pedido.payment_method}</span>}
          </div>

          {/* Valores */}
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>Valor líquido</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--color-text-primary)" }}>{fmt(liquido)}</div>
            </div>
            {totalPago > 0 && (
              <div>
                <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>Recebido</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#059669" }}>{fmt(totalPago)}</div>
              </div>
            )}
            {totalPendente > 0 && (
              <div>
                <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>Pendente</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#D97706" }}>{fmt(totalPendente)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Botões */}
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => setEditing(!editing)}
            style={{ padding: "8px 14px", borderRadius: 8, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 12, fontWeight: 500, cursor: "pointer", color: "var(--color-text-primary)" }}
          >
            {editing ? "Cancelar edição" : "✏️ Editar"}
          </button>
          <button
            onClick={() => setConfirmDel(true)}
            style={{ padding: "8px 14px", borderRadius: 8, background: "rgba(239,68,68,0.06)", border: "0.5px solid rgba(239,68,68,0.2)", fontSize: 12, cursor: "pointer", color: "#EF4444" }}
          >
            🗑
          </button>
        </div>
      </div>

      {/* Formulário de edição */}
      {editing ? (
        <FormPedido
          inicial={{
            id:             pedido.id,
            nome:           pedido.nome ?? "",
            cliente_id:     pedido.cliente_id ?? "",
            categoria:      pedido.categoria ?? "",
            status:         pedido.status,
            total:          pedido.total != null ? String(pedido.total) : "",
            discount:       pedido.discount != null ? String(pedido.discount) : "0",
            other_expenses: pedido.other_expenses != null ? String(pedido.other_expenses) : "0",
            data_evento:    pedido.data_evento ?? "",
            hora_evento:    pedido.hora_evento ?? "",
            local_evento:   pedido.local_evento ?? "",
            convidados:     pedido.convidados != null ? String(pedido.convidados) : "",
            local_cerimonia: pedido.local_cerimonia ?? "",
            local_recepcao:  pedido.local_recepcao ?? "",
            observacoes:    pedido.observacoes ?? "",
          }}
          onSalvo={(_, agendaAtualizado) => {
            createClient().from("crm_orders").select("*, clientes(id, nome)").eq("id", id).single()
              .then(({ data }) => {
                setPedido(data as OrderWithCliente | null);
                setEditing(false);
                if (agendaAtualizado) setAgendaMsg("O agendamento foi atualizado com a nova data do evento.");
              });
          }}
        />
      ) : (
        <>
          {/* Observações */}
          {pedido.observacoes && (
            <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
              <div style={{ padding: "9px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Observações</span>
              </div>
              <div style={{ padding: "14px 20px", fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{pedido.observacoes}</div>
            </div>
          )}

          {/* Produtos / Itens do pedido */}
          {itens.length > 0 && (
            <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
              <div style={{ padding: "9px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Produtos / Serviços</span>
                <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{itens.length} {itens.length === 1 ? "item" : "itens"}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 100px 100px", padding: "7px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
                {["Descrição", "Qtd", "Preço unit.", "Total"].map(h => (
                  <span key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</span>
                ))}
              </div>
              {itens.map((item, i) => (
                <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr 70px 100px 100px", padding: "11px 20px", borderBottom: i < itens.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{item.descricao || item.crm_products?.nome || "—"}</div>
                    {item.crm_products?.nome && item.descricao && item.descricao !== item.crm_products.nome && (
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{item.crm_products.nome}</div>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{item.quantidade}×</div>
                  <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{fmt(item.preco_unit)}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>{fmt(item.total)}</div>
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 100px 100px", padding: "10px 20px", borderTop: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
                <div style={{ gridColumn: "1 / 4", fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Total dos itens</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-text-primary)" }}>{fmt(itens.reduce((s, i) => s + i.total, 0))}</div>
              </div>
            </div>
          )}

          {/* Aviso de taxa de cartão */}
          {(() => {
            const receitasCartaoPagas = financeiro.filter(f =>
              f.tipo === "receita" && f.status === "pago" &&
              (f.forma_pagamento ?? "").toLowerCase().includes("cart")
            );
            const diferenca = liquido - totalPago;
            if (totalPendente === 0 && diferenca > 0.01 && receitasCartaoPagas.length > 0) {
              return (
                <div style={{ background: "rgba(217,119,6,0.08)", border: "0.5px solid rgba(217,119,6,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#D97706", marginBottom: 2 }}>
                      Diferença de {fmt(diferenca)} pode ser taxa de cartão
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                      Recebido {fmt(totalPago)} · Total do pedido {fmt(liquido)}
                    </div>
                  </div>
                  <button
                    onClick={() => setModalTaxa({ receita: receitasCartaoPagas[0], taxa: diferenca.toFixed(2) })}
                    style={{ padding: "7px 14px", borderRadius: 8, background: "#D97706", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                    Registrar taxa
                  </button>
                </div>
              );
            }
            return null;
          })()}

          {/* Lançamentos financeiros */}
          {financeiro.length > 0 && (
            <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
              <div style={{ padding: "9px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Lançamentos financeiros</span>
              </div>
              {financeiro.map((f, i) => {
                const stFin = STATUS_FIN[f.status] ?? STATUS_FIN.pendente;
                return (
                  <div key={f.id} style={{ display: "grid", gridTemplateColumns: "1fr 120px 100px 90px", padding: "11px 20px", borderBottom: i < financeiro.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{f.descricao}</div>
                      {f.parcela && <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Parcela {f.parcela}</div>}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                      {new Date(f.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: f.tipo === "receita" ? "#059669" : "#EF4444" }}>
                      {f.tipo === "receita" ? "+" : "-"}{fmt(f.valor)}
                    </div>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: stFin.color }}>{stFin.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Contratos */}
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "9px 20px", borderBottom: contratos.length > 0 ? "0.5px solid var(--color-border-tertiary)" : "none", background: "var(--color-background-secondary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Contratos</span>
              <button onClick={abrirModalContrato} style={{ padding: "5px 12px", borderRadius: 7, background: "#111", color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                + Gerar contrato
              </button>
            </div>
            {contratos.length === 0 ? (
              <div style={{ padding: "18px 20px", fontSize: 13, color: "var(--color-text-secondary)" }}>Nenhum contrato gerado para este pedido.</div>
            ) : (
              contratos.map((c, i) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 20px", borderBottom: i < contratos.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 20 }}>📄</span>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{c.nome_template ?? "Contrato"}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Gerado em {new Date(c.created_at).toLocaleDateString("pt-BR")}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button onClick={() => window.open(`/crm-contrato/${c.id}`, "_blank")}
                      style={{ padding: "5px 12px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer" }}>
                      Visualizar
                    </button>
                    <button onClick={() => { setCorpoEditado(c.corpo_gerado); setModalEditarContrato(c); }}
                      style={{ padding: "5px 12px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer" }}>
                      Editar
                    </button>
                    <button onClick={() => { setEmailPara(pedido.clientes?.email ?? ""); setEmailAssunto(`Contrato — ${c.nome_template ?? "Contrato"}`); setEmailMensagem(""); setEmailEnviado(false); setModalEmailContrato(c); }}
                      style={{ padding: "5px 12px", borderRadius: 7, border: "0.5px solid rgba(37,99,235,0.4)", background: "transparent", fontSize: 12, color: "#2563EB", cursor: "pointer" }}>
                      E-mail
                    </button>
                    <button onClick={() => setConfirmExcluirContrato(c)}
                      style={{ padding: "5px 12px", borderRadius: 7, border: "0.5px solid rgba(239,68,68,0.3)", background: "transparent", fontSize: 12, color: "#EF4444", cursor: "pointer" }}>
                      Excluir
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Modal taxa de cartão */}
      {modalTaxa && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => e.target === e.currentTarget && setModalTaxa(null)}>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 32px", width: 420, boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 6 }}>Registrar taxa de cartão</div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 20, lineHeight: 1.6 }}>
              A receita será ajustada para {fmt(modalTaxa.receita.valor + (parseFloat(modalTaxa.taxa.replace(",", ".")) || 0))} e uma despesa de Tarifa Bancária (5.6.4) será registrada.
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Valor da taxa (R$)</div>
              <input
                type="number" min="0" step="0.01"
                value={modalTaxa.taxa}
                onChange={e => setModalTaxa(m => m ? { ...m, taxa: e.target.value } : m)}
                style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 13, color: "var(--color-text-primary)", outline: "none" }}
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={confirmarTaxa} disabled={salvandoTaxa || !(parseFloat(modalTaxa.taxa.replace(",", ".")) > 0)}
                style={{ padding: "9px 22px", borderRadius: 8, background: "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: salvandoTaxa || !(parseFloat(modalTaxa.taxa.replace(",", ".")) > 0) ? 0.6 : 1 }}>
                {salvandoTaxa ? "Salvando…" : "Confirmar"}
              </button>
              <button onClick={() => setModalTaxa(null)}
                style={{ padding: "9px 16px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal gerar contrato */}
      {modalContrato && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => e.target === e.currentTarget && setModalContrato(false)}>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 32px", width: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 20 }}>Gerar contrato</div>

            {templates.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 20 }}>
                Nenhum modelo de contrato cadastrado. Acesse <a href="/crm/config" style={{ color: "#2563EB" }}>Configurações → Contratos</a> para criar um modelo.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Modelo */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Modelo de contrato *</div>
                  <select value={templateId} onChange={e => setTemplateId(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 13, color: "var(--color-text-primary)", outline: "none" }}>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>

                {/* Dados do evento */}
                {(() => {
                  const cat = (pedido.categoria ?? "").toLowerCase();
                  const isCasamento = cat.includes("casamento") || cat === "bodas";
                  const localSalvo = isCasamento
                    ? [pedido.local_cerimonia, pedido.local_recepcao].filter(Boolean).join(" / ")
                    : pedido.local_evento ?? "";
                  const horaSalva = pedido.hora_evento ?? "";
                  const convidadosSalvos = pedido.convidados != null ? String(pedido.convidados) : "";

                  const inpSt: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 13, color: "var(--color-text-primary)", outline: "none" };
                  const chipSt: React.CSSProperties = { padding: "7px 10px", borderRadius: 7, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", fontSize: 13, color: "var(--color-text-primary)" };
                  const labelSt: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 5 };

                  const temPendentes = !horaSalva || !localSalvo || !convidadosSalvos || !cidadeEvento || !estadoEvento;

                  return (
                    <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                      {/* Campos já preenchidos no pedido — exibição somente leitura */}
                      {(horaSalva || localSalvo || convidadosSalvos) && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Dados do pedido</div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            {horaSalva && <div><div style={labelSt}>Hora</div><div style={chipSt}>{horaSalva}</div></div>}
                            {localSalvo && <div style={!horaSalva && !convidadosSalvos ? { gridColumn: "1 / -1" } : {}}><div style={labelSt}>{isCasamento ? "Cerimônia / Recepção" : "Local"}</div><div style={chipSt}>{localSalvo}</div></div>}
                            {convidadosSalvos && <div><div style={labelSt}>Convidados</div><div style={chipSt}>{convidadosSalvos}</div></div>}
                          </div>
                        </div>
                      )}

                      {/* Campos pendentes — inputs */}
                      {temPendentes && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                            {horaSalva || localSalvo || convidadosSalvos ? "Complementar informações" : "Dados do evento"}
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            {!horaSalva && <div><div style={labelSt}>Hora do evento</div><input value={horaEvento} onChange={e => setHoraEvento(e.target.value)} placeholder="Ex: 16h" style={inpSt} /></div>}
                            {!localSalvo && <div><div style={labelSt}>Local / Espaço</div><input value={localEvento} onChange={e => setLocalEvento(e.target.value)} placeholder="Ex: Espaço Villa Lobos" style={inpSt} /></div>}
                            {!convidadosSalvos && <div><div style={labelSt}>Nº de convidados</div><input value={convidados} onChange={e => setConvidados(e.target.value)} placeholder="Ex: 200" style={inpSt} /></div>}
                            <div><div style={labelSt}>Cidade do evento</div><input value={cidadeEvento} onChange={e => setCidadeEvento(e.target.value)} placeholder="Ex: Ourinhos" style={inpSt} /></div>
                            <div><div style={labelSt}>Estado do evento</div><input value={estadoEvento} onChange={e => setEstadoEvento(e.target.value)} placeholder="Ex: SP" style={inpSt} /></div>
                          </div>
                        </div>
                      )}
                      {!temPendentes && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <div><div style={labelSt}>Cidade do evento</div><input value={cidadeEvento} onChange={e => setCidadeEvento(e.target.value)} placeholder="Ex: Ourinhos" style={inpSt} /></div>
                          <div><div style={labelSt}>Estado do evento</div><input value={estadoEvento} onChange={e => setEstadoEvento(e.target.value)} placeholder="Ex: SP" style={inpSt} /></div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button onClick={gerarContrato} disabled={gerandoContrato || !templateId}
                    style={{ padding: "9px 22px", borderRadius: 8, background: "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: gerandoContrato || !templateId ? 0.6 : 1 }}>
                    {gerandoContrato ? "Gerando…" : "Gerar e abrir contrato"}
                  </button>
                  <button onClick={() => setModalContrato(false)} style={{ padding: "9px 16px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer" }}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal editar contrato */}
      {modalEditarContrato && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={e => e.target === e.currentTarget && setModalEditarContrato(null)}>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 32px", width: "100%", maxWidth: 860, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 18 }}>Editar contrato</div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 14 }}>{modalEditarContrato.nome_template}</div>
            <RichTextEditor value={corpoEditado} onChange={(v: string) => setCorpoEditado(v)} minHeight={400} />
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button disabled={salvandoContrato} onClick={async () => {
                setSalvandoContrato(true);
                await createClient().from("crm_contracts").update({ corpo_gerado: corpoEditado }).eq("id", modalEditarContrato.id);
                setSalvandoContrato(false);
                setModalEditarContrato(null);
                carregar();
              }} style={{ padding: "9px 22px", borderRadius: 8, background: "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: salvandoContrato ? 0.6 : 1 }}>
                {salvandoContrato ? "Salvando…" : "Salvar contrato"}
              </button>
              <button onClick={() => setModalEditarContrato(null)} style={{ padding: "9px 16px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal enviar contrato por e-mail */}
      {modalEmailContrato && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={e => e.target === e.currentTarget && setModalEmailContrato(null)}>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 32px", width: "100%", maxWidth: 480, boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 20 }}>Enviar contrato por e-mail</div>
            {emailEnviado ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>E-mail enviado!</div>
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 20 }}>O contrato foi enviado para {emailPara}</div>
                <button onClick={() => setModalEmailContrato(null)} style={{ padding: "9px 22px", borderRadius: 8, background: "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Fechar</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { label: "Para *", val: emailPara, set: setEmailPara, ph: "email@cliente.com", type: "email" },
                  { label: "Assunto *", val: emailAssunto, set: setEmailAssunto, ph: "Contrato — Casamento", type: "text" },
                ].map(({ label, val, set, ph, type }) => (
                  <div key={label}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>{label}</div>
                    <input type={type} value={val} onChange={e => set(e.target.value)} placeholder={ph}
                      style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 13, color: "var(--color-text-primary)", outline: "none" }} />
                  </div>
                ))}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>Mensagem (opcional)</div>
                  <textarea value={emailMensagem} onChange={e => setEmailMensagem(e.target.value)} placeholder="Olá! Segue em anexo o contrato para sua aprovação…" rows={4}
                    style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 13, color: "var(--color-text-primary)", outline: "none", resize: "vertical" }} />
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button disabled={enviandoEmail || !emailPara || !emailAssunto} onClick={async () => {
                    setEnviandoEmail(true);
                    try {
                      const res = await fetch("/api/crm/contratos/enviar", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ fotografo_id: pedido.fotografo_id, contrato_id: modalEmailContrato.id, para: emailPara, assunto: emailAssunto, mensagem: emailMensagem }),
                      });
                      if (res.ok) setEmailEnviado(true);
                      else alert("Erro ao enviar e-mail. Verifique as configurações de SMTP em Configurações.");
                    } catch { alert("Erro ao enviar e-mail."); }
                    setEnviandoEmail(false);
                  }} style={{ padding: "9px 22px", borderRadius: 8, background: "#2563EB", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: enviandoEmail || !emailPara || !emailAssunto ? 0.6 : 1 }}>
                    {enviandoEmail ? "Enviando…" : "Enviar"}
                  </button>
                  <button onClick={() => setModalEmailContrato(null)} style={{ padding: "9px 16px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer" }}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal excluir contrato */}
      {confirmExcluirContrato && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => e.target === e.currentTarget && setConfirmExcluirContrato(null)}>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 32px", width: 400, boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 10 }}>Excluir contrato?</div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 22 }}>
              O contrato <strong>{confirmExcluirContrato.nome_template ?? "Contrato"}</strong> será excluído permanentemente.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button disabled={excluindoContrato} onClick={async () => {
                setExcluindoContrato(true);
                await createClient().from("crm_contracts").delete().eq("id", confirmExcluirContrato.id);
                setExcluindoContrato(false);
                setConfirmExcluirContrato(null);
                carregar();
              }} style={{ padding: "9px 20px", borderRadius: 8, background: "#EF4444", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: excluindoContrato ? 0.6 : 1 }}>
                {excluindoContrato ? "Excluindo…" : "Excluir"}
              </button>
              <button onClick={() => setConfirmExcluirContrato(null)} style={{ padding: "9px 16px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal exclusão */}
      {confirmDel && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 32px", maxWidth: 400, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 10 }}>Excluir pedido?</div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 24, lineHeight: 1.6 }}>
              Esta ação é irreversível. <strong>{pedido.nome}</strong> será removido permanentemente.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleDelete} disabled={deleting} style={{ padding: "9px 20px", borderRadius: 8, background: "#EF4444", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: deleting ? "not-allowed" : "pointer" }}>
                {deleting ? "Excluindo…" : "Sim, excluir"}
              </button>
              <button onClick={() => setConfirmDel(false)} style={{ padding: "9px 18px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
