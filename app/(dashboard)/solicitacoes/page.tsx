"use client";

// Solicitar pagamento por cartão de crédito (Asaas): o fotógrafo cria a solicitação (valor, descrição, parcelas
// máximas, repassar ou não a taxa) e envia o link /pagar/<id>. Confirmação automática pelo webhook do Asaas.
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { useFotografo } from "@/lib/context/FotografoContext";
import { mascaraMoeda, parseMoeda } from "@/lib/moeda";
import { ClienteSelect } from "@/components/ui/ClienteSelect";
import { ClienteLink } from "@/components/ui/ClienteLink";
import type { Cliente } from "@/lib/supabase/types";
import { simularParcelas, brl } from "@/lib/pagamentos/simularParcelas";
import type { TaxasCartao } from "@/lib/asaas";

type Solicitacao = {
  id: string; descricao: string; detalhes: string | null; valor: number; max_parcelas: number;
  repassar_taxa: boolean; status: "aberta" | "paga" | "cancelada"; pagador_nome: string | null;
  parcelas: number | null; valor_cobrado: number | null; pago_em: string | null; created_at: string;
  clientes: { id: string; nome: string; email: string | null; whatsapp: string | null; telefone: string | null } | null;
};

const soDigitos = (v: string) => v.replace(/\D/g, "");
function mascaraCpf(v: string) {
  const d = soDigitos(v).slice(0, 14);
  if (d.length <= 11) return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
}

const STATUS: Record<Solicitacao["status"], { label: string; bg: string; cor: string }> = {
  aberta:    { label: "Aguardando", bg: "rgba(245,158,11,0.12)", cor: "#B45309" },
  paga:      { label: "Paga",       bg: "rgba(16,185,129,0.12)", cor: "#059669" },
  cancelada: { label: "Cancelada",  bg: "rgba(107,114,128,0.12)", cor: "#6B7280" },
};

const btn: React.CSSProperties = {
  padding: "6px 10px", borderRadius: 8, border: "1px solid var(--color-border-secondary)",
  background: "var(--color-background-primary)", fontSize: 12, cursor: "pointer", color: "var(--color-text-primary)",
};
const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8, background: "var(--color-background-secondary)",
  border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-primary)", fontSize: 13,
  outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};
const lbl: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase",
  letterSpacing: "0.05em", marginBottom: 6, display: "block",
};

export default function SolicitacoesPage() {
  const { fotografo } = useFotografo();
  const [lista, setLista] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [conectado, setConectado] = useState<boolean | null>(null);
  const [taxas, setTaxas] = useState<TaxasCartao | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  // Modal "nova solicitação"
  const [novo, setNovo] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [detalhes, setDetalhes] = useState("");
  const [valorTxt, setValorTxt] = useState("");
  const [maxParcelas, setMaxParcelas] = useState(1);
  const [repassar, setRepassar] = useState(false);
  const [clienteId, setClienteId] = useState("");
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [cpfTxt, setCpfTxt] = useState(""); // só quando o contato não tem CPF (o Asaas exige no cartão)
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null); // null = nova solicitação
  const [excluir, setExcluir] = useState<Solicitacao | null>(null);
  const [emailDe, setEmailDe] = useState<Solicitacao | null>(null);
  const [emailAssunto, setEmailAssunto] = useState("");
  const [emailCorpo, setEmailCorpo] = useState("");
  const [enviandoEmail, setEnviandoEmail] = useState(false);

  const carregar = useCallback(async () => {
    if (!fotografo) return;
    const rows = await fetchAllRows<Solicitacao>(
      (c, from, to) => c.from("solicitacoes_pagamento")
        .select("id, descricao, detalhes, valor, max_parcelas, repassar_taxa, status, pagador_nome, parcelas, valor_cobrado, pago_em, created_at, clientes(id, nome, email, whatsapp, telefone)")
        .eq("fotografo_id", fotografo.id).order("created_at", { ascending: false }).range(from, to),
      createClient(),
    );
    setLista(rows);
    setLoading(false);
  }, [fotografo]);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => {
    fetch("/api/solicitacoes/taxas").then((r) => r.json())
      .then((j) => { setConectado(!!j.conectado); setTaxas(j.taxas ?? null); })
      .catch(() => setConectado(false));
  }, []);

  const valor = parseMoeda(valorTxt) ?? 0;
  const previa = useMemo(() => (valor > 0 ? simularParcelas(valor, maxParcelas, repassar, taxas) : []), [valor, maxParcelas, repassar, taxas]);

  function aviso(t: string) { setMsg(t); setTimeout(() => setMsg(null), 2500); }
  const link = (id: string) => `${window.location.origin}/pagar/${id}`;

  function limparForm() {
    setDescricao(""); setDetalhes(""); setValorTxt(""); setMaxParcelas(1); setRepassar(false);
    setClienteId(""); setCliente(null); setCpfTxt(""); setErro("");
  }

  function abrirNova() { limparForm(); setEditandoId(null); setNovo(true); }

  async function abrirEdicao(s: Solicitacao) {
    limparForm();
    setEditandoId(s.id);
    setDescricao(s.descricao); setDetalhes(s.detalhes ?? "");
    setValorTxt(mascaraMoeda(Number(s.valor).toFixed(2).replace(".", "")));
    setMaxParcelas(s.max_parcelas); setRepassar(s.repassar_taxa);
    if (s.clientes) {
      setClienteId(s.clientes.id);
      const { data } = await createClient().from("clientes").select("*").eq("id", s.clientes.id).maybeSingle();
      setCliente((data as Cliente) ?? null);
    }
    setNovo(true);
  }

  async function criar() {
    if (!fotografo) return;
    if (!clienteId || !cliente) { setErro("Selecione o cliente."); return; }
    const cpfContato = soDigitos(cliente.cpf ?? "");
    const cpfNovo = soDigitos(cpfTxt);
    const precisaCpf = cpfContato.length !== 11 && cpfContato.length !== 14;
    if (precisaCpf && cpfNovo.length !== 11 && cpfNovo.length !== 14) { setErro("Informe o CPF do cliente (o Asaas exige no cartão)."); return; }
    if (!descricao.trim()) { setErro("Informe a descrição."); return; }
    if (!(valor > 0)) { setErro("Informe o valor."); return; }
    setSalvando(true); setErro("");
    const sb = createClient();
    // CPF completado aqui fica salvo no contato (cadastro único).
    if (precisaCpf) {
      const { error: eCpf } = await sb.from("clientes").update({ cpf: cpfNovo }).eq("id", clienteId);
      if (eCpf) { setSalvando(false); setErro("Erro ao salvar o CPF no contato: " + eCpf.message); return; }
    }
    if (editandoId) {
      const r = await fetch(`/api/solicitacoes/${editandoId}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "editar", campos: { descricao, detalhes, valor, max_parcelas: maxParcelas, repassar_taxa: repassar, cliente_id: clienteId } }),
      });
      const j = await r.json().catch(() => ({}));
      setSalvando(false);
      if (!r.ok) { setErro(j.erro ?? "Erro ao salvar."); return; }
      setNovo(false); limparForm(); setEditandoId(null);
      await carregar();
      aviso("Solicitação atualizada — o link continua o mesmo.");
      return;
    }
    const { data, error } = await sb.from("solicitacoes_pagamento").insert({
      fotografo_id: fotografo.id, cliente_id: clienteId, descricao: descricao.trim(), detalhes: detalhes.trim() || null,
      valor, max_parcelas: maxParcelas, repassar_taxa: repassar,
    }).select("id").single();
    setSalvando(false);
    if (error || !data) { setErro("Erro ao salvar: " + (error?.message ?? "")); return; }
    setNovo(false); setDescricao(""); setDetalhes(""); setValorTxt(""); setMaxParcelas(1); setRepassar(false);
    setClienteId(""); setCliente(null); setCpfTxt("");
    await carregar();
    navigator.clipboard.writeText(link((data as { id: string }).id)).catch(() => {});
    aviso("Solicitação criada — link copiado!");
  }

  async function acao(s: Solicitacao, tipo: "verificar" | "cancelar") {
    setOcupado(s.id);
    const r = await fetch(`/api/solicitacoes/${s.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao: tipo }) });
    const j = await r.json().catch(() => ({}));
    setOcupado(null);
    if (!r.ok) { aviso(j.erro ?? "Erro."); return; }
    if (tipo === "verificar") aviso(j.status === "paga" ? "Pagamento confirmado!" : "Ainda não foi pago.");
    carregar();
  }

  async function confirmarExcluir() {
    if (!excluir) return;
    setOcupado(excluir.id);
    const r = await fetch(`/api/solicitacoes/${excluir.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao: "excluir" }) });
    const j = await r.json().catch(() => ({}));
    setOcupado(null);
    if (!r.ok) { aviso(j.erro ?? "Erro ao excluir."); return; }
    setExcluir(null);
    carregar();
    aviso("Solicitação excluída.");
  }

  // E-mail com o link e tudo o que o cliente precisa para pagar (texto editável antes de enviar).
  function abrirEmail(s: Solicitacao) {
    const primeiro = s.clientes?.nome?.trim().split(/\s+/)[0];
    const empresa = fotografo?.nome_empresa || fotografo?.nome_completo || "";
    const opcoes = simularParcelas(Number(s.valor), s.max_parcelas, s.repassar_taxa, taxas);
    const linhasParcelas = opcoes.map((o) => `• ${o.parcelas}x de ${brl(o.parcela)}${o.total === Number(s.valor) ? " (sem juros)" : ` — total ${brl(o.total)}`}`).join("\n");
    setEmailAssunto(`Pagamento: ${s.descricao}`);
    setEmailCorpo([
      `Olá${primeiro ? `, ${primeiro}` : ""}!`,
      "",
      `Segue o link para o pagamento de ${s.descricao}, no valor de ${brl(Number(s.valor))}, no cartão de crédito.`,
      ...(s.detalhes ? ["", s.detalhes] : []),
      "",
      s.max_parcelas > 1 ? `Você pode parcelar em até ${s.max_parcelas}x:` : "Pagamento à vista no cartão:",
      linhasParcelas,
      "",
      "Para pagar, acesse:",
      link(s.id),
      "",
      "É só escolher o número de parcelas e clicar em \"Pagar com cartão\". Você será levado ao ambiente seguro do Asaas para digitar os dados do cartão. Assim que o pagamento for aprovado, ele é confirmado automaticamente.",
      "",
      "Qualquer dúvida, é só responder este e-mail.",
      ...(empresa ? ["", empresa] : []),
    ].join("\n"));
    setEmailDe(s);
  }

  async function enviarEmail() {
    if (!emailDe?.clientes?.email) return;
    setEnviandoEmail(true);
    const r = await fetch("/api/email/enviar", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: emailDe.clientes.email, subject: emailAssunto, body: emailCorpo }),
    });
    const j = await r.json().catch(() => ({}));
    setEnviandoEmail(false);
    if (!r.ok) { aviso(j.erro ?? "Erro ao enviar o e-mail."); return; }
    setEmailDe(null);
    aviso(`E-mail enviado para ${emailDe.clientes.email}.`);
  }

  function whatsapp(s: Solicitacao) {
    const primeiro = s.clientes?.nome?.trim().split(/\s+/)[0];
    const texto = `Olá${primeiro ? `, ${primeiro}` : ""}! Segue o link para pagamento de *${s.descricao}* (${brl(Number(s.valor))}) no cartão de crédito${s.max_parcelas > 1 ? `, em até ${s.max_parcelas}x` : ""}:\n${link(s.id)}`;
    // Abre direto na conversa do contato vinculado (WhatsApp ou telefone do cadastro).
    let num = (s.clientes?.whatsapp || s.clientes?.telefone || "").replace(/\D/g, "");
    if (num && num.length <= 11) num = "55" + num;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>Solicitar pagamento</h1>
        <button onClick={abrirNova} disabled={conectado === false}
          style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 700, cursor: conectado === false ? "default" : "pointer", opacity: conectado === false ? 0.5 : 1 }}>
          + Nova solicitação
        </button>
      </div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 16px" }}>
        Cobranças no cartão de crédito pelo Asaas. Envie o link: o cliente escolhe as parcelas e paga; a confirmação é automática.
      </p>

      {conectado === false && (
        <div style={{ background: "rgba(245,158,11,0.08)", border: "0.5px solid rgba(245,158,11,0.3)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#92400E", marginBottom: 14 }}>
          Conecte sua conta Asaas para solicitar pagamentos. <Link href="/config" style={{ color: "#92400E", fontWeight: 700 }}>Configurar →</Link>
        </div>
      )}
      {msg && <div style={{ fontSize: 12, color: "#059669", marginBottom: 12, fontWeight: 600 }}>{msg}</div>}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : lista.length === 0 ? (
        <div style={{ padding: "40px 20px", borderRadius: 12, border: "1px dashed var(--color-border-secondary)", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)", background: "var(--color-background-secondary)" }}>
          Nenhuma solicitação ainda.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {lista.map((s) => {
            const st = STATUS[s.status];
            return (
              <div key={s.id} style={{ border: "1px solid var(--color-border-tertiary)", borderRadius: 10, padding: "13px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>
                    {s.descricao}
                    {s.clientes && <span style={{ fontWeight: 500, fontSize: 13 }}> · <ClienteLink id={s.clientes.id} nome={s.clientes.nome} /></span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                    {brl(Number(s.valor))} · até {s.max_parcelas}x · {s.repassar_taxa ? "taxa repassada ao cliente" : "sem juros"} · {new Date(s.created_at).toLocaleDateString("pt-BR")}
                    {s.status === "paga" && s.parcelas && <> · pago em {s.parcelas}x ({brl(Number(s.valor_cobrado ?? s.valor))}){s.pagador_nome ? ` por ${s.pagador_nome}` : ""}</>}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 10, background: st.bg, color: st.cor }}>{st.label}</span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {s.status === "aberta" && (
                    <>
                      <button style={btn} onClick={() => { navigator.clipboard.writeText(link(s.id)).then(() => aviso("Link copiado!")).catch(() => {}); }}>🔗 Copiar link</button>
                      <button style={btn} onClick={() => whatsapp(s)}>💬 WhatsApp</button>
                      <button style={btn} onClick={() => abrirEmail(s)}>✉️ E-mail</button>
                      <button style={btn} disabled={ocupado === s.id} onClick={() => acao(s, "verificar")}>{ocupado === s.id ? "…" : "✓ Verificar"}</button>
                      <button style={btn} title="Editar" onClick={() => abrirEdicao(s)}>✏️</button>
                      <button style={{ ...btn, color: "#DC2626" }} disabled={ocupado === s.id} onClick={() => acao(s, "cancelar")}>Cancelar</button>
                    </>
                  )}
                  <button style={{ ...btn, color: "#DC2626" }} title="Excluir" disabled={ocupado === s.id} onClick={() => setExcluir(s)}>🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {novo && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }} onClick={() => setNovo(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", borderRadius: 14, padding: 24, maxWidth: 520, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 16 }}>💳 {editandoId ? "Editar solicitação de pagamento" : "Nova solicitação de pagamento"}</div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Cliente</label>
              <ClienteSelect value={clienteId} onChange={(id, c) => { setClienteId(id); setCliente(c); setCpfTxt(""); }} />
              {cliente && !/^\d{11}$|^\d{14}$/.test(soDigitos(cliente.cpf ?? "")) && (
                <div style={{ marginTop: 8 }}>
                  <input style={inp} inputMode="numeric" value={cpfTxt} onChange={(e) => setCpfTxt(mascaraCpf(e.target.value))} placeholder="CPF do cliente (obrigatório no cartão)" />
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>Este contato ainda não tem CPF — fica salvo no cadastro dele.</div>
                </div>
              )}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Descrição</label>
              <input style={inp} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Sinal do casamento Ana e Gustavo" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Detalhes (opcional)</label>
              <textarea style={{ ...inp, resize: "vertical" }} rows={2} value={detalhes} onChange={(e) => setDetalhes(e.target.value)} placeholder="Aparece para o cliente na página de pagamento" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={lbl}>Valor</label>
                <input style={inp} inputMode="numeric" value={valorTxt} onChange={(e) => setValorTxt(mascaraMoeda(e.target.value))} placeholder="R$ 0,00" />
              </div>
              <div>
                <label style={lbl}>Parcelar em até</label>
                <select style={inp} value={maxParcelas} onChange={(e) => setMaxParcelas(Number(e.target.value))}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n === 1 ? "1x (à vista)" : `${n}x`}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Juros</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {([[false, "Sem juros (a taxa é minha)"], [true, "Repassar a taxa do Asaas ao cliente"]] as const).map(([v, t]) => (
                  <button key={String(v)} onClick={() => setRepassar(v)}
                    style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "0.5px solid", cursor: "pointer",
                      borderColor: repassar === v ? "var(--color-text-primary)" : "var(--color-border-secondary)",
                      background: repassar === v ? "var(--color-text-primary)" : "transparent",
                      color: repassar === v ? "var(--color-background-primary)" : "var(--color-text-secondary)" }}>
                    {t}
                  </button>
                ))}
              </div>
              {repassar && !taxas && <div style={{ fontSize: 11, color: "#B45309", marginTop: 6 }}>Não foi possível ler as taxas da sua conta Asaas — a prévia sai sem a taxa.</div>}
            </div>

            {previa.length > 0 && (
              <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, padding: "10px 12px", marginBottom: 14, background: "var(--color-background-secondary)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 6, textTransform: "uppercase" }}>O cliente verá</div>
                {previa.map((o) => (
                  <div key={o.parcelas} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "3px 0", color: "var(--color-text-primary)" }}>
                    <span>{o.parcelas}x de {brl(o.parcela)}</span>
                    <span style={{ color: "var(--color-text-secondary)" }}>total {brl(o.total)}</span>
                  </div>
                ))}
              </div>
            )}

            {erro && <div style={{ fontSize: 12, color: "#DC2626", marginBottom: 10 }}>{erro}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setNovo(false)} style={{ ...btn, flex: 1, padding: 10 }}>Cancelar</button>
              <button onClick={criar} disabled={salvando}
                style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 700, cursor: salvando ? "default" : "pointer" }}>
                {salvando ? "Salvando…" : editandoId ? "Salvar alterações" : "Criar e copiar link"}
              </button>
            </div>
          </div>
        </div>
      )}
      {excluir && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }} onClick={() => setExcluir(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", borderRadius: 14, padding: 24, maxWidth: 420, width: "100%", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#DC2626", marginBottom: 8 }}>🗑 Excluir solicitação</div>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 20px", lineHeight: 1.6 }}>
              Excluir <strong style={{ color: "var(--color-text-primary)" }}>{excluir.descricao}</strong>{excluir.clientes ? ` (${excluir.clientes.nome})` : ""}? O link deixa de funcionar.
              {excluir.status === "aberta" && <><br />A cobrança pendente no Asaas também é removida.</>}
              {excluir.status === "paga" && <><br />Ela já foi <strong>paga</strong>: o pagamento continua registrado no Asaas, só some desta lista.</>}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setExcluir(null)} style={{ ...btn, flex: 1, padding: 10 }}>Cancelar</button>
              <button onClick={confirmarExcluir} disabled={ocupado === excluir.id}
                style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: "#DC2626", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {ocupado === excluir.id ? "Excluindo…" : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {emailDe && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }} onClick={() => setEmailDe(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", borderRadius: 14, padding: 24, maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 14 }}>✉️ Enviar por e-mail</div>
            {!emailDe.clientes?.email ? (
              <div style={{ fontSize: 13, color: "#B45309", marginBottom: 16, lineHeight: 1.6 }}>
                O contato <strong>{emailDe.clientes?.nome ?? ""}</strong> não tem e-mail cadastrado. Cadastre o e-mail no contato
                {emailDe.clientes && <> (<ClienteLink id={emailDe.clientes.id} nome="abrir cadastro" />)</>} ou envie pelo WhatsApp.
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label style={lbl}>Para</label>
                  <div style={{ fontSize: 13, color: "var(--color-text-primary)" }}>{emailDe.clientes.nome} &lt;{emailDe.clientes.email}&gt;</div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={lbl}>Assunto</label>
                  <input style={inp} value={emailAssunto} onChange={(e) => setEmailAssunto(e.target.value)} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={lbl}>Mensagem</label>
                  <textarea style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} rows={14} value={emailCorpo} onChange={(e) => setEmailCorpo(e.target.value)} />
                </div>
              </>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setEmailDe(null)} style={{ ...btn, flex: 1, padding: 10 }}>Fechar</button>
              {emailDe.clientes?.email && (
                <button onClick={enviarEmail} disabled={enviandoEmail || !emailAssunto.trim() || !emailCorpo.trim()}
                  style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {enviandoEmail ? "Enviando…" : "Enviar e-mail"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
