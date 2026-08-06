"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import type { RevelacaoPedido, CrmRevelacaoTamanho, GaleriaEntregaFoto, RevelacaoPedidoItem } from "@/lib/supabase/types";

type Pagamento = { status: string; invoice_url: string | null; gateway: string | null } | null;
type Passo = "tamanho" | "fotos" | "resumo";

function fmt(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

function RevelacaoConteudo() {
  const { id } = useParams<{ id: string }>();

  const [pedido, setPedido] = useState<RevelacaoPedido | null | undefined>(undefined);
  const [tamanhos, setTamanhos] = useState<CrmRevelacaoTamanho[]>([]);
  const [fotos, setFotos] = useState<GaleriaEntregaFoto[]>([]);
  const [itens, setItens] = useState<RevelacaoPedidoItem[]>([]);
  const [pagamento, setPagamento] = useState<Pagamento>(null);

  const [tamanhoGrid, setTamanhoGrid] = useState(150);
  const [passo, setPasso] = useState<Passo>("tamanho");
  const [tamanhoAtual, setTamanhoAtual] = useState<CrmRevelacaoTamanho | null>(null);
  const [confirmados, setConfirmados] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState("");

  const [pagadorNome, setPagadorNome] = useState("");
  const [pagadorEmail, setPagadorEmail] = useState("");
  const [pagadorCpf, setPagadorCpf] = useState("");
  const [gerando, setGerando] = useState(false);
  const [erroPagamento, setErroPagamento] = useState("");
  const [resultadoPagamento, setResultadoPagamento] = useState<{ gateway: string; invoiceUrl?: string; pixCopiaECola?: string | null; pixQrDataUrl?: string | null; pixChave?: string | null } | null>(null);

  const carregar = () => {
    if (!id) return;
    fetch(`/api/revelacao/pedidos/${id}`).then(r => r.json()).then(json => {
      setPedido(json.pedido ?? null);
      setTamanhos(json.tamanhos ?? []);
      setFotos(json.fotos ?? []);
      setItens(json.itens ?? []);
      setPagamento(json.pagamento ?? null);
    }).catch(() => setPedido(null));
  };

  useEffect(() => { carregar(); }, [id]);

  if (pedido === undefined) {
    return <div style={estiloTela}><div style={{ fontSize: 14, color: "#6B7280" }}>Carregando…</div></div>;
  }
  if (pedido === null) {
    return <div style={estiloTela}><div style={{ textAlign: "center" }}><div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div><div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>Pedido não encontrado</div></div></div>;
  }

  if (pedido.status === "pago") {
    return (
      <div style={estiloTela}>
        <div style={{ textAlign: "center", maxWidth: 380 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 6 }}>Pagamento confirmado</div>
          <div style={{ fontSize: 14, color: "#6B7280" }}>Seu pedido de revelação foi enviado ao fotógrafo. Valor total: {fmt(pedido.valor_total)}.</div>
        </div>
      </div>
    );
  }

  if (pedido.status === "aguardando_pagamento" && !resultadoPagamento) {
    return (
      <div style={estiloTela}>
        <div style={{ textAlign: "center", maxWidth: 380 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 6 }}>Aguardando pagamento</div>
          <div style={{ fontSize: 14, color: "#6B7280", marginBottom: 16 }}>Total: {fmt(pedido.valor_total)}</div>
          {pagamento?.invoice_url && (
            <a href={pagamento.invoice_url} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-block", padding: "12px 24px", borderRadius: 8, background: "#111827", color: "#fff", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
              Abrir pagamento
            </a>
          )}
        </div>
      </div>
    );
  }

  const cesta: Record<string, RevelacaoPedidoItem[]> = {};
  for (const it of itens) (cesta[it.tamanho_id] ??= []).push(it);
  const temAlgoNaCesta = Object.values(cesta).some(arr => arr.length > 0);

  const escolherTamanho = (t: CrmRevelacaoTamanho) => {
    setTamanhoAtual(t);
    setToast("");
    setPasso("fotos");
  };

  const toggleFoto = async (foto: GaleriaEntregaFoto) => {
    if (!tamanhoAtual) return;
    const jaMarcada = (cesta[tamanhoAtual.id] ?? []).some(i => i.foto_id === foto.id);
    const acao = jaMarcada ? "remove" : "add";
    // otimista
    setItens(prev => acao === "remove"
      ? prev.filter(i => !(i.tamanho_id === tamanhoAtual.id && i.foto_id === foto.id))
      : [...prev, { id: "tmp", pedido_id: id, tamanho_id: tamanhoAtual.id, foto_id: foto.id, nome_arquivo: foto.nome_arquivo ?? foto.id, valor_unit: tamanhoAtual.valor, created_at: "" }]);
    await fetch(`/api/revelacao/pedidos/${id}/itens`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tamanho_id: tamanhoAtual.id, foto_id: foto.id, acao }),
    }).catch(() => {});
  };

  const confirmarRodada = () => {
    if (!tamanhoAtual) return;
    const qtd = (cesta[tamanhoAtual.id] ?? []).length;
    setConfirmados(prev => new Set(prev).add(tamanhoAtual.id));
    setToast(`${qtd} foto(s) confirmada(s) em ${tamanhoAtual.nome}. Escolha outro tamanho ou finalize quando terminar.`);
  };

  const outroTamanho = () => {
    confirmarRodada();
    setPasso("tamanho");
  };

  const irParaResumo = () => {
    confirmarRodada();
    setPasso("resumo");
  };

  const total = Object.values(cesta).reduce((s, arr) => s + arr.reduce((s2, i) => s2 + Number(i.valor_unit), 0), 0);

  const gerarPagamento = async () => {
    if (!pagadorNome.trim() || !pagadorEmail.trim() || gerando) return;
    setGerando(true);
    setErroPagamento("");
    try {
      const res = await fetch(`/api/revelacao/pedidos/${id}/finalizar`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: pagadorNome, email: pagadorEmail, cpf: pagadorCpf }),
      });
      const json = await res.json();
      if (!res.ok) { setErroPagamento(json.erro ?? "Não foi possível gerar o pagamento."); setGerando(false); return; }
      setResultadoPagamento(json);
      if (json.gateway === "asaas" && json.invoiceUrl) window.open(json.invoiceUrl, "_blank", "noopener,noreferrer");
    } catch {
      setErroPagamento("Não foi possível gerar o pagamento. Verifique sua conexão.");
    } finally {
      setGerando(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F3F4F6", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 16px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 720, background: "#fff", borderRadius: 12, boxShadow: "0 4px 32px rgba(0,0,0,0.1)", padding: "32px 36px" }}>

        {passo === "tamanho" && (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 4px" }}>Escolha o tamanho</h2>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 20px" }}>Selecione um tamanho para começar a escolher as fotos.</p>
            {toast && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(16,185,129,0.1)", borderRadius: 8, marginBottom: 16, fontSize: 13, color: "#059669" }}>
                ✓ {toast}
              </div>
            )}
            {tamanhos.length === 0 ? (
              <div style={{ fontSize: 13, color: "#6B7280" }}>O fotógrafo ainda não cadastrou tamanhos de revelação.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
                {tamanhos.map(t => {
                  const qtd = (cesta[t.id] ?? []).length;
                  const conf = confirmados.has(t.id);
                  return (
                    <button key={t.id} onClick={() => escolherTamanho(t)}
                      style={{ textAlign: "left", padding: "14px 16px", borderRadius: 9, border: `1px solid ${conf ? "#10B981" : "#E5E7EB"}`, background: "#fff", cursor: "pointer" }}>
                      <div style={{ fontSize: 15, fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
                        {t.nome}{conf && <span style={{ color: "#10B981" }}>✓</span>}
                      </div>
                      <div style={{ fontSize: 13, color: "#6B7280" }}>{fmt(t.valor)} / un{qtd > 0 ? ` · ${qtd} ${conf ? "confirmada(s)" : "marcada(s)"}` : ""}</div>
                    </button>
                  );
                })}
              </div>
            )}
            {temAlgoNaCesta && (
              <button onClick={() => setPasso("resumo")}
                style={{ padding: "12px 24px", borderRadius: 8, background: "#111827", color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                Finalizar pedido →
              </button>
            )}
          </>
        )}

        {passo === "fotos" && tamanhoAtual && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
              <div>
                <p style={{ fontSize: 12, color: "#6B7280", margin: 0 }}>Tamanho selecionado</p>
                <p style={{ fontSize: 15, fontWeight: 700, margin: "2px 0 0" }}>{tamanhoAtual.nome} — {fmt(tamanhoAtual.valor)}/un</p>
              </div>
              <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>{(cesta[tamanhoAtual.id] ?? []).length} foto(s) marcada(s)</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 12, color: "#9CA3AF" }}>Tamanho da grade</span>
              <input type="range" min={90} max={260} step={10} value={tamanhoGrid} onChange={e => setTamanhoGrid(Number(e.target.value))}
                style={{ flex: 1, maxWidth: 200 }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${tamanhoGrid}px, 1fr))`, gap: 10, marginBottom: 20 }}>
              {fotos.map(foto => {
                const on = (cesta[tamanhoAtual.id] ?? []).some(i => i.foto_id === foto.id);
                return (
                  <div key={foto.id} onClick={() => toggleFoto(foto)}
                    style={{ position: "relative", borderRadius: 8, cursor: "pointer", overflow: "hidden", lineHeight: 0, outline: on ? "3px solid #2563EB" : "none", outlineOffset: -3 }}>
                    <img src={foto.url_publica} alt="" style={{ width: "100%", height: "auto", display: "block" }} />
                    {on && (
                      <span style={{ position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: "50%", background: "#2563EB", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>✓</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={outroTamanho}
                style={{ padding: "11px 18px", borderRadius: 8, border: "1px solid #D1D5DB", background: "transparent", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                ✓ Confirmar estas fotos e escolher outro tamanho
              </button>
              <button onClick={irParaResumo}
                style={{ padding: "11px 18px", borderRadius: 8, background: "#111827", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Finalizar pedido →
              </button>
            </div>
          </>
        )}

        {passo === "resumo" && (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 16px" }}>Resumo do pedido</h2>
            <div style={{ border: "1px solid #E5E7EB", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
              {Object.entries(cesta).filter(([, arr]) => arr.length > 0).map(([tid, arr], i, all) => {
                const t = tamanhos.find(x => x.id === tid);
                const sub = arr.reduce((s, it) => s + Number(it.valor_unit), 0);
                return (
                  <div key={tid} style={{ display: "flex", justifyContent: "space-between", padding: "11px 16px", borderBottom: i < all.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                    <span style={{ fontSize: 14 }}>{t?.nome} <span style={{ color: "#9CA3AF" }}>× {arr.length}</span></span>
                    <span style={{ fontSize: 14, color: "#6B7280" }}>{fmt(sub)}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
              <span style={{ fontSize: 14, color: "#6B7280" }}>Total</span>
              <span style={{ fontSize: 24, fontWeight: 800 }}>{fmt(total)}</span>
            </div>

            {!resultadoPagamento ? (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                  <input value={pagadorNome} onChange={e => setPagadorNome(e.target.value)} placeholder="Seu nome completo"
                    style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 14 }} />
                  <input value={pagadorEmail} onChange={e => setPagadorEmail(e.target.value)} placeholder="Seu e-mail" type="email"
                    style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 14 }} />
                  <input value={pagadorCpf} onChange={e => setPagadorCpf(e.target.value)} placeholder="CPF (opcional)"
                    style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 14 }} />
                </div>
                {erroPagamento && <div style={{ fontSize: 13, color: "#DC2626", marginBottom: 12 }}>{erroPagamento}</div>}
                <button onClick={gerarPagamento} disabled={gerando || !pagadorNome.trim() || !pagadorEmail.trim()}
                  style={{ padding: "12px 24px", borderRadius: 8, background: "#111827", color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: gerando ? "default" : "pointer", opacity: gerando ? 0.6 : 1 }}>
                  {gerando ? "Gerando…" : "Gerar pagamento"}
                </button>
              </>
            ) : (
              <div style={{ padding: "16px 20px", background: "rgba(16,185,129,0.08)", borderRadius: 10 }}>
                {resultadoPagamento.gateway === "pix_manual" ? (
                  <>
                    <p style={{ fontSize: 13, color: "#065F46", margin: "0 0 12px" }}>Escaneie o QR code ou use o PIX copia-e-cola para pagar.</p>
                    {resultadoPagamento.pixQrDataUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={resultadoPagamento.pixQrDataUrl} alt="QR PIX" style={{ display: "block", margin: "0 auto 12px", width: 180, height: 180 }} />
                    )}
                    {resultadoPagamento.pixCopiaECola && (
                      <textarea readOnly value={resultadoPagamento.pixCopiaECola} style={{ width: "100%", fontSize: 11, fontFamily: "monospace", height: 60 }} />
                    )}
                  </>
                ) : (
                  <p style={{ fontSize: 13, color: "#065F46", margin: 0 }}>Cobrança gerada — se a aba de pagamento não abriu, <a href={resultadoPagamento.invoiceUrl}>clique aqui</a>.</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const estiloTela: React.CSSProperties = { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" };

export default function RevelacaoPage() {
  return (
    <Suspense fallback={<div style={estiloTela}><div style={{ fontSize: 14, color: "#6B7280" }}>Carregando…</div></div>}>
      <RevelacaoConteudo />
    </Suspense>
  );
}
