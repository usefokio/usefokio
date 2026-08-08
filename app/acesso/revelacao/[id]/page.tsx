"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import type { RevelacaoPedido, CrmRevelacaoTamanho, GaleriaEntregaFoto, RevelacaoPedidoItem, RevelacaoProdutoExtra, RevelacaoPedidoExtra } from "@/lib/supabase/types";
import { linkWhatsApp } from "@/lib/site/whatsapp";

type Pagamento = { status: string; invoice_url: string | null; gateway: string | null } | null;
type Passo = "tamanho" | "fotos" | "resumo";

function fmt(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

function RevelacaoConteudo() {
  const { id } = useParams<{ id: string }>();

  const [pedido, setPedido] = useState<RevelacaoPedido | null | undefined>(undefined);
  const [tamanhos, setTamanhos] = useState<CrmRevelacaoTamanho[]>([]);
  const [fotos, setFotos] = useState<GaleriaEntregaFoto[]>([]);
  const [itens, setItens] = useState<RevelacaoPedidoItem[]>([]);
  const [extrasAtivo, setExtrasAtivo] = useState(false);
  const [extrasTitulo, setExtrasTitulo] = useState("Quer aproveitar e levar mais alguma coisa?");
  const [extrasSubtitulo, setExtrasSubtitulo] = useState("Porta-retratos, quadros e álbuns para montar com estas fotos.");
  const [produtosExtras, setProdutosExtras] = useState<RevelacaoProdutoExtra[]>([]);
  const [extrasSelecionados, setExtrasSelecionados] = useState<RevelacaoPedidoExtra[]>([]);
  const [fotoAtualExtra, setFotoAtualExtra] = useState<Record<string, number>>({});
  const [pagamento, setPagamento] = useState<Pagamento>(null);
  const [minimoFotos, setMinimoFotos] = useState<number | null>(null);
  const [valorMinimo, setValorMinimo] = useState<number | null>(null);
  const [clienteNome, setClienteNome] = useState<string | null>(null);
  const [fotografoWhatsapp, setFotografoWhatsapp] = useState<string | null>(null);
  const [galeriaTitulo, setGaleriaTitulo] = useState<string | null>(null);
  const [avisoPagamentoEnviado, setAvisoPagamentoEnviado] = useState(false);
  const [avisandoPagamento, setAvisandoPagamento] = useState(false);

  const [autenticado, setAutenticado] = useState(false);
  const [senhaInput, setSenhaInput] = useState("");
  const [erroSenha, setErroSenha] = useState("");
  const [verificandoSenha, setVerificandoSenha] = useState(false);

  const [colunas, setColunas] = useState(4);
  const [ordenacao, setOrdenacao] = useState<"ordem" | "nome">("ordem");
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
      setExtrasAtivo(!!json.extrasAtivo);
      if (json.extrasTitulo) setExtrasTitulo(json.extrasTitulo);
      if (json.extrasSubtitulo !== undefined) setExtrasSubtitulo(json.extrasSubtitulo ?? "");
      setProdutosExtras(json.produtosExtras ?? []);
      setExtrasSelecionados(json.extrasSelecionados ?? []);
      setPagamento(json.pagamento ?? null);
      setMinimoFotos(json.minimoFotos ?? null);
      setValorMinimo(json.valorMinimo ?? null);
      setClienteNome(json.clienteNome ?? null);
      setFotografoWhatsapp(json.fotografoWhatsapp ?? null);
      setGaleriaTitulo(json.galeriaTitulo ?? null);
      setAvisoPagamentoEnviado(!!json.pedido?.cliente_avisou_pagamento_em);
    }).catch(() => setPedido(null));
  };

  const avisarPagamento = async () => {
    if (avisoPagamentoEnviado || avisandoPagamento) return;
    setAvisandoPagamento(true);
    try {
      await fetch(`/api/email/revelacao-aviso-pagamento`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidoId: id }),
      });
      setAvisoPagamentoEnviado(true);
    } catch {
      // silencioso — o botão continua disponível pra tentar de novo
    } finally {
      setAvisandoPagamento(false);
    }
  };

  const BlocoAvisoPagamento = ({ valor }: { valor: number }) => {
    const msgWhats = `Olá! Acabei de pagar o pedido de revelação de fotos${galeriaTitulo ? ` (${galeriaTitulo})` : ""}, valor ${fmt(valor)}. Pode confirmar o recebimento?`;
    const whatsUrl = linkWhatsApp(fotografoWhatsapp, msgWhats);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
        <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Já pagou? Avise o fotógrafo:</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {whatsUrl && (
            <a href={whatsUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-block", padding: "10px 18px", borderRadius: 8, background: "#25D366", color: "#fff", fontWeight: 600, fontSize: 13, textDecoration: "none" }}>
              💬 Avisar por WhatsApp
            </a>
          )}
          <button onClick={avisarPagamento} disabled={avisoPagamentoEnviado || avisandoPagamento}
            style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid #D1D5DB", background: avisoPagamentoEnviado ? "#ECFDF5" : "#fff", color: avisoPagamentoEnviado ? "#059669" : "#111827", fontWeight: 600, fontSize: 13, cursor: avisoPagamentoEnviado || avisandoPagamento ? "default" : "pointer" }}>
            {avisoPagamentoEnviado ? "✓ Fotógrafo avisado" : avisandoPagamento ? "Avisando…" : "✓ Já paguei, avisar o fotógrafo"}
          </button>
        </div>
      </div>
    );
  };

  useEffect(() => { carregar(); }, [id]);

  const verificarSenha = async () => {
    if (!senhaInput.trim() || verificandoSenha) return;
    setVerificandoSenha(true);
    setErroSenha("");
    try {
      const res = await fetch(`/api/revelacao/pedidos/${id}/verificar-senha`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha: senhaInput }),
      });
      const json = await res.json();
      if (!json.ok) { setErroSenha(json.erro ?? "Senha incorreta. Tente novamente."); return; }
      setAutenticado(true);
      if (json.email) setPagadorEmail(json.email);
      if (json.nome) setPagadorNome(json.nome);
      if (json.cpf) setPagadorCpf(json.cpf);
    } catch {
      setErroSenha("Não foi possível verificar a senha. Verifique sua conexão.");
    } finally {
      setVerificandoSenha(false);
    }
  };

  if (pedido === undefined) {
    return <div style={estiloTela}><div style={{ fontSize: 14, color: "#6B7280" }}>Carregando…</div></div>;
  }
  if (pedido === null) {
    return <div style={estiloTela}><div style={{ textAlign: "center" }}><div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div><div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>Pedido não encontrado</div></div></div>;
  }

  if (!autenticado) {
    return (
      <div style={estiloTela}>
        <div style={{ width: "100%", maxWidth: 340, background: "#fff", borderRadius: 12, boxShadow: "0 4px 32px rgba(0,0,0,0.1)", padding: "32px 28px", textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Pedido de revelação</div>
          <div style={{ fontSize: 14, color: "#6B7280", marginBottom: 20 }}>
            {clienteNome ? `Olá, ${clienteNome}! ` : ""}Informe sua senha para continuar.
          </div>
          <form onSubmit={e => { e.preventDefault(); verificarSenha(); }}>
            <input
              type="password" value={senhaInput} onChange={e => { setSenhaInput(e.target.value); setErroSenha(""); }}
              autoFocus placeholder="Senha"
              style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 16, textAlign: "center", letterSpacing: "0.08em", marginBottom: 10 }}
            />
            {erroSenha && <div style={{ color: "#DC2626", fontSize: 12, marginBottom: 10 }}>{erroSenha}</div>}
            <button type="submit" disabled={verificandoSenha || !senhaInput.trim()}
              style={{ width: "100%", padding: "12px", borderRadius: 8, background: "#111827", color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: verificandoSenha ? "default" : "pointer", opacity: verificandoSenha || !senhaInput.trim() ? 0.6 : 1 }}>
              {verificandoSenha ? "Verificando…" : "Entrar"}
            </button>
          </form>
          <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 16 }}>É a mesma senha das suas galerias. Em caso de dúvida, fale com o fotógrafo.</div>
        </div>
      </div>
    );
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
              style={{ display: "inline-block", padding: "12px 24px", borderRadius: 8, background: "#111827", color: "#fff", fontWeight: 600, fontSize: 14, textDecoration: "none", marginBottom: 16 }}>
              Abrir pagamento
            </a>
          )}
          <BlocoAvisoPagamento valor={pedido.valor_total} />
        </div>
      </div>
    );
  }

  const fotosOrdenadas = ordenacao === "nome"
    ? [...fotos].sort((a, b) => (a.nome_arquivo ?? "").localeCompare(b.nome_arquivo ?? "", "pt-BR"))
    : fotos;

  const cesta: Record<string, RevelacaoPedidoItem[]> = {};
  for (const it of itens) (cesta[it.tamanho_id] ??= []).push(it);
  const temAlgoNaCesta = Object.values(cesta).some(arr => arr.length > 0);
  const totalFotos = itens.length;
  const totalFotosValor = Object.values(cesta).reduce((s, arr) => s + arr.reduce((s2, i) => s2 + Number(i.valor_unit), 0), 0);
  const totalExtrasValor = extrasSelecionados.reduce((s, e) => s + Number(e.valor_unit) * e.quantidade, 0);
  const total = totalFotosValor + totalExtrasValor;
  const faltamFotos = minimoFotos ? Math.max(0, minimoFotos - totalFotos) : 0;
  const faltamValor = valorMinimo ? Math.max(0, valorMinimo - total) : 0;
  const podeFinalizar = temAlgoNaCesta && faltamFotos === 0 && faltamValor === 0;

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

  const alterarExtra = async (produto: RevelacaoProdutoExtra, quantidade: number) => {
    const qtd = Math.max(0, quantidade);
    setExtrasSelecionados(prev => {
      const outros = prev.filter(e => e.produto_id !== produto.id);
      return qtd <= 0 ? outros : [...outros, { id: "tmp", pedido_id: id, produto_id: produto.id, titulo: produto.titulo, valor_unit: produto.valor, quantidade: qtd, created_at: "" }];
    });
    await fetch(`/api/revelacao/pedidos/${id}/extras`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ produto_id: produto.id, quantidade: qtd }),
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

  const notificarFotografo = () => {
    fetch(`/api/email/revelacao-selecao`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pedidoId: id }),
    }).catch(() => {});
  };

  const irParaResumo = () => {
    confirmarRodada();
    notificarFotografo();
    setPasso("resumo");
  };

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
            <a href={`/acesso/entrega/${pedido.galeria_entrega_id}`}
              style={{ display: "inline-block", fontSize: 13, color: "#6B7280", textDecoration: "none", marginBottom: 16 }}>
              ← Voltar para a galeria
            </a>
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
              <>
                {faltamFotos > 0 && (
                  <div style={{ fontSize: 13, color: "#D97706", marginBottom: 10 }}>
                    Faltam {faltamFotos} foto{faltamFotos !== 1 ? "s" : ""} para atingir o mínimo de {minimoFotos} do pedido.
                  </div>
                )}
                {faltamValor > 0 && (
                  <div style={{ fontSize: 13, color: "#D97706", marginBottom: 10 }}>
                    Faltam {fmt(faltamValor)} para atingir o valor mínimo do pedido ({fmt(valorMinimo!)}).
                  </div>
                )}
                <button onClick={irParaResumo} disabled={!podeFinalizar}
                  style={{ padding: "12px 24px", borderRadius: 8, background: podeFinalizar ? "#111827" : "#D1D5DB", color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: podeFinalizar ? "pointer" : "not-allowed" }}>
                  Finalizar pedido →
                </button>
              </>
            )}
          </>
        )}

        {passo === "fotos" && tamanhoAtual && (
          <>
            <button onClick={() => setPasso("tamanho")}
              style={{ background: "none", border: "none", color: "#6B7280", fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 16 }}>
              ← Voltar
            </button>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
              <div>
                <p style={{ fontSize: 12, color: "#6B7280", margin: 0 }}>Tamanho selecionado</p>
                <p style={{ fontSize: 15, fontWeight: 700, margin: "2px 0 0" }}>{tamanhoAtual.nome} — {fmt(tamanhoAtual.valor)}/un</p>
              </div>
              <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>{(cesta[tamanhoAtual.id] ?? []).length} foto(s) marcada(s)</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 14, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, color: "#9CA3AF" }}>Tamanho das fotos</span>
                <input type="range" min={2} max={6} step={1} value={8 - colunas} onChange={e => setColunas(8 - Number(e.target.value))}
                  style={{ flex: 1, maxWidth: 200 }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "#9CA3AF" }}>Ordenar por</span>
                <select value={ordenacao} onChange={e => setOrdenacao(e.target.value as "ordem" | "nome")}
                  style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid #D1D5DB", fontSize: 12, background: "#fff" }}>
                  <option value="ordem">Ordem do álbum</option>
                  <option value="nome">Nome do arquivo</option>
                </select>
              </div>
            </div>
            <style>{`
              .revelacao-grid { column-gap: 10px; }
              .revelacao-grid .revelacao-foto { break-inside: avoid; margin: 0 0 10px; }
              @media (max-width: 560px) { .revelacao-grid { column-count: 2 !important; } }
            `}</style>
            <div className="revelacao-grid" style={{ columnCount: colunas, marginBottom: 20 }}>
              {fotosOrdenadas.map(foto => {
                const on = (cesta[tamanhoAtual.id] ?? []).some(i => i.foto_id === foto.id);
                return (
                  <div key={foto.id} className="revelacao-foto" onClick={() => toggleFoto(foto)}
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
              <button onClick={irParaResumo} disabled={!podeFinalizar}
                title={faltamFotos > 0 ? `Faltam ${faltamFotos} foto(s) para o mínimo de ${minimoFotos}` : faltamValor > 0 ? `Faltam ${fmt(faltamValor)} para o valor mínimo` : undefined}
                style={{ padding: "11px 18px", borderRadius: 8, background: podeFinalizar ? "#111827" : "#D1D5DB", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: podeFinalizar ? "pointer" : "not-allowed" }}>
                Finalizar pedido →
              </button>
            </div>
            {faltamFotos > 0 && (
              <div style={{ fontSize: 12, color: "#D97706", marginTop: 10 }}>
                Faltam {faltamFotos} foto{faltamFotos !== 1 ? "s" : ""} no total para atingir o mínimo de {minimoFotos} do pedido.
              </div>
            )}
            {faltamValor > 0 && (
              <div style={{ fontSize: 12, color: "#D97706", marginTop: 10 }}>
                Faltam {fmt(faltamValor)} para atingir o valor mínimo do pedido ({fmt(valorMinimo!)}).
              </div>
            )}
          </>
        )}

        {passo === "resumo" && (
          <>
            <button onClick={() => setPasso("tamanho")}
              style={{ background: "none", border: "none", color: "#6B7280", fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 16 }}>
              ← Voltar
            </button>
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
            {extrasAtivo && produtosExtras.length > 0 && !resultadoPagamento && (
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>{extrasTitulo}</h3>
                {extrasSubtitulo && <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 12px" }}>{extrasSubtitulo}</p>}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                  {produtosExtras.map(produto => {
                    const qtd = extrasSelecionados.find(e => e.produto_id === produto.id)?.quantidade ?? 0;
                    const fotosProduto = produto.imagens?.length ? produto.imagens.map(im => im.url_publica) : (produto.imagem_url ? [produto.imagem_url] : []);
                    const idx = fotoAtualExtra[produto.id] ?? 0;
                    const trocarFoto = (delta: number) => setFotoAtualExtra(prev => ({ ...prev, [produto.id]: (idx + delta + fotosProduto.length) % fotosProduto.length }));
                    return (
                      <div key={produto.id} style={{ border: "1px solid #E5E7EB", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                        {fotosProduto.length > 0 && (
                          <div style={{ position: "relative" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={fotosProduto[idx]} alt="" style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} />
                            {fotosProduto.length > 1 && (
                              <>
                                <button onClick={() => trocarFoto(-1)} aria-label="Foto anterior"
                                  style={{ position: "absolute", top: "50%", left: 6, transform: "translateY(-50%)", width: 24, height: 24, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
                                <button onClick={() => trocarFoto(1)} aria-label="Próxima foto"
                                  style={{ position: "absolute", top: "50%", right: 6, transform: "translateY(-50%)", width: 24, height: 24, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
                                <div style={{ position: "absolute", bottom: 6, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 4 }}>
                                  {fotosProduto.map((_, i) => (
                                    <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: i === idx ? "#fff" : "rgba(255,255,255,0.5)" }} />
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                        <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{produto.titulo}</div>
                          {produto.descricao && <div style={{ fontSize: 12, color: "#6B7280" }}>{produto.descricao}</div>}
                          <div style={{ fontSize: 13, color: "#111827", fontWeight: 600 }}>{fmt(produto.valor)}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "auto" }}>
                            <button onClick={() => alterarExtra(produto, qtd - 1)} disabled={qtd === 0}
                              style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #D1D5DB", background: "#fff", cursor: qtd === 0 ? "default" : "pointer", fontSize: 15, opacity: qtd === 0 ? 0.4 : 1 }}>−</button>
                            <span style={{ fontSize: 14, fontWeight: 700, minWidth: 18, textAlign: "center" }}>{qtd}</span>
                            <button onClick={() => alterarExtra(produto, qtd + 1)}
                              style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #D1D5DB", background: "#fff", cursor: "pointer", fontSize: 15 }}>+</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {totalExtrasValor > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, color: "#6B7280" }}>
                <span>Produtos extras</span>
                <span>{fmt(totalExtrasValor)}</span>
              </div>
            )}
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
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(16,185,129,0.2)" }}>
                  <BlocoAvisoPagamento valor={total} />
                </div>
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
