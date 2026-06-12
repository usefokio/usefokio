"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import type { GaleriaEntrega, GaleriaEntregaFoto } from "@/lib/supabase/types";

const SESSION_KEY = "usefokio_entrega_identificado";
type Identificacao = { nome: string; email: string };
type Tela = "carregando" | "nao_encontrada" | "identificacao" | "capa" | "galeria" | "expirada" | "suspensa";

function diasRestantes(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.round((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({ fotos, indexInicial, onFechar, apenaZip, galeriaId }: {
  fotos: GaleriaEntregaFoto[];
  indexInicial: number;
  onFechar: () => void;
  apenaZip?: boolean;
  galeriaId: string;
}) {
  const [idx, setIdx] = useState(indexInicial);
  const foto = fotos[idx];

  async function handleDownload() {
    try { await fetch(`/api/entrega/${galeriaId}/download`, { method: "POST" }); } catch {}
    const a = document.createElement("a");
    a.href = urlDownload(foto.url_publica, foto.nome_arquivo);
    a.download = foto.nome_arquivo ?? "foto.jpg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape")     onFechar();
      if (e.key === "ArrowRight") setIdx((i) => Math.min(i + 1, fotos.length - 1));
      if (e.key === "ArrowLeft")  setIdx((i) => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fotos.length]);

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.96)", display: "flex", flexDirection: "column" }}
      onClick={(e) => e.target === e.currentTarget && onFechar()}
    >
      {/* Topo */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", flexShrink: 0 }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
          {idx + 1} / {fotos.length}
          {foto.nome_arquivo && <span style={{ marginLeft: 10, fontFamily: "monospace" }}>{foto.nome_arquivo}</span>}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {!apenaZip && (
            <button
              onClick={handleDownload}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8, background: "#2563EB", color: "#fff", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer" }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Baixar
            </button>
          )}
          <button onClick={onFechar} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "50%", width: 36, height: 36, fontSize: 18, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
      </div>

      {/* Foto central */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <button
          onClick={() => setIdx((i) => Math.max(i - 1, 0))} disabled={idx === 0}
          style={{ width: 56, background: "none", border: "none", color: idx === 0 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.5)", fontSize: 28, cursor: idx === 0 ? "default" : "pointer", flexShrink: 0 }}
        >‹</button>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          <img src={foto.url_publica} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 4 }} />
        </div>
        <button
          onClick={() => setIdx((i) => Math.min(i + 1, fotos.length - 1))} disabled={idx === fotos.length - 1}
          style={{ width: 56, background: "none", border: "none", color: idx === fotos.length - 1 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.5)", fontSize: 28, cursor: idx === fotos.length - 1 ? "default" : "pointer", flexShrink: 0 }}
        >›</button>
      </div>

      {/* Miniaturas */}
      <div style={{ flexShrink: 0, padding: "8px 16px 12px", overflowX: "auto", display: "flex", gap: 4 }}>
        {fotos.map((f, i) => (
          <div
            key={f.id} onClick={() => setIdx(i)}
            style={{ width: 48, height: 48, flexShrink: 0, cursor: "pointer", borderRadius: 4, overflow: "hidden", outline: i === idx ? "2px solid #2563EB" : "2px solid transparent", outlineOffset: 1, opacity: i === idx ? 1 : 0.55, transition: "opacity 0.15s" }}
          >
            <img src={f.url_publica} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
          </div>
        ))}
      </div>
    </div>
  );
}

function urlDownload(urlPublica: string, nomeArquivo: string | null | undefined): string {
  const nome = (nomeArquivo && nomeArquivo.trim())
    ? nomeArquivo.trim()
    : (new URL(urlPublica).pathname.split("/").pop() ?? "foto.jpg");
  return `/api/foto-download?url=${encodeURIComponent(urlPublica)}&nome=${encodeURIComponent(nome)}`;
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function AcessoEntregaPage() {
  const { id } = useParams<{ id: string }>();

  const [tela,          setTela]          = useState<Tela>("carregando");
  const [galeria,       setGaleria]       = useState<any>(null);
  const [fotos,         setFotos]         = useState<GaleriaEntregaFoto[]>([]);
  const [identificacao, setIdentificacao] = useState<Identificacao | null>(null);
  const [lightboxIdx,   setLightboxIdx]   = useState<number | null>(null);

  // Seleção de fotos para download
  const [modoSelecao,   setModoSelecao]   = useState(false);
  const [selecionadas,  setSelecionadas]  = useState<Set<string>>(new Set());

  // Form identificação
  const [nome,     setNome]     = useState("");
  const [email,    setEmail]    = useState("");
  const [formErro, setFormErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Modal de identificação antes do download via Drive
  const [modalDrive, setModalDrive] = useState(false);

  // Renovação de acesso (pagamento via Asaas do fotógrafo)
  const [renovFormAberto,  setRenovFormAberto]  = useState(false);
  const [renovInvoiceUrl,  setRenovInvoiceUrl]  = useState<string | null>(null);
  const [renovGerando,     setRenovGerando]     = useState(false);
  const [renovVerificando, setRenovVerificando] = useState(false);
  const [renovMsg,         setRenovMsg]         = useState("");
  const [renovNome,        setRenovNome]        = useState("");
  const [renovEmail,       setRenovEmail]       = useState("");
  const [renovCpf,         setRenovCpf]         = useState("");
  const [modalCpf,         setModalCpf]         = useState(false);
  const [cpfTemp,          setCpfTemp]          = useState("");

  // Restaura sessão
  useEffect(() => {
    const salvo = sessionStorage.getItem(`${SESSION_KEY}:${id}`);
    if (salvo) { try { setIdentificacao(JSON.parse(salvo)); } catch {} }
  }, [id]);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("galerias_entrega").select("*, clientes(nome, email, cpf), fotografos(logo_url, nome_empresa, asaas_ativo)").eq("id", id).maybeSingle(),
      fetchAllRows<GaleriaEntregaFoto>((sb, from, to) => sb.from("galerias_entrega_fotos").select("*").eq("galeria_id", id).order("ordem").order("created_at").range(from, to), supabase),
    ]).then(([{ data: g }, f]) => {
      if (!g || g.rascunho) { setTela("nao_encontrada"); return; }
      setGaleria(g);
      // Aplica a ordenação configurada pelo fotógrafo
      const lista = [...((f as GaleriaEntregaFoto[]) ?? [])];
      if (g.ordenacao_fotos === "nome") {
        lista.sort((a, b) => (a.nome_arquivo ?? "").localeCompare(b.nome_arquivo ?? "", "pt-BR", { numeric: true }));
      } else if (g.ordenacao_fotos === "nome_desc") {
        lista.sort((a, b) => (b.nome_arquivo ?? "").localeCompare(a.nome_arquivo ?? "", "pt-BR", { numeric: true }));
      } else if (g.ordenacao_fotos === "data") {
        lista.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
      setFotos(lista);
      if (g.suspensa) { setTela("suspensa"); return; }
      const dias = diasRestantes(g.expires_at ?? null);
      if (dias !== null && dias < 0) { setTela("expirada"); return; }
      const salvo = sessionStorage.getItem(`${SESSION_KEY}:${id}`);
      const jaIdentificado = !!salvo;
      // Identificação só é exigida quando o fotógrafo marca a opção — caso contrário acesso livre
      if (g.identificacao_obrigatoria && !jaIdentificado) { setTela("identificacao"); return; }
      setTela("capa");
    });
  }, [id]);

  // Atualiza tela quando identificação muda (restaurada do session)
  useEffect(() => {
    if (!galeria) return;
    if (tela === "identificacao" && identificacao) setTela("capa");
  }, [identificacao, galeria]);

  async function handleIdentificar() {
    if (!nome.trim())  { setFormErro("Por favor, informe seu nome."); return; }
    if (!email.trim()) { setFormErro("Por favor, informe seu e-mail."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setFormErro("E-mail inválido."); return; }
    setSalvando(true);
    const dados = { nome: nome.trim(), email: email.trim() };
    sessionStorage.setItem(`${SESSION_KEY}:${id}`, JSON.stringify(dados));
    setIdentificacao(dados);
    const supabase = createClient();
    await supabase.from("galeria_acessos").insert({ galeria_id: id, nome: dados.nome, email: dados.email });
    setSalvando(false);
    setTela("capa");
  }

  // Identifica e abre o link do Drive (download de todas as fotos)
  async function handleIdentificarEBaixar() {
    if (!nome.trim())  { setFormErro("Por favor, informe seu nome."); return; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setFormErro("Informe um e-mail válido."); return; }
    setSalvando(true);
    const dados = { nome: nome.trim(), email: email.trim() };
    sessionStorage.setItem(`${SESSION_KEY}:${id}`, JSON.stringify(dados));
    setIdentificacao(dados);
    const supabase = createClient();
    await supabase.from("galeria_acessos").insert({ galeria_id: id, nome: dados.nome, email: dados.email });
    setSalvando(false);
    setModalDrive(false);
    setFormErro("");
    if (galeria?.drive_link) window.open(galeria.drive_link, "_blank", "noopener,noreferrer");
  }

  // ── Seleção e download ──────────────────────────────────────────────────────
  function toggleFoto(fotoId: string) {
    setSelecionadas((prev) => {
      const next = new Set(prev);
      next.has(fotoId) ? next.delete(fotoId) : next.add(fotoId);
      return next;
    });
  }

  function selecionarTodas() { setSelecionadas(new Set(fotos.map((f) => f.id))); }
  function desmarcarTodas()  { setSelecionadas(new Set()); }

  function baixarSelecionadas(ids?: string[]) {
    const fotosParaBaixar = fotos.filter((f) => ids ? ids.includes(f.id) : selecionadas.has(f.id));
    if (fotosParaBaixar.length === 0) return;

    // Dispara todos os cliques de uma vez — mesmo contexto de gesto, sem await entre eles
    fotosParaBaixar.forEach((foto) => {
      const a = document.createElement("a");
      a.href = urlDownload(foto.url_publica, foto.nome_arquivo);
      a.download = foto.nome_arquivo ?? "foto.jpg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }

  // ── Renovação de acesso ──────────────────────────────────────────────────────
  async function verificarRenovacao(silencioso: boolean) {
    setRenovVerificando(true);
    if (!silencioso) setRenovMsg("");
    try {
      const res = await fetch(`/api/entrega/${id}/renovar/verificar`, { method: "POST" });
      const json = await res.json();
      if (json.liberado) {
        window.location.reload();
        return;
      }
      if (!silencioso) setRenovMsg("Pagamento ainda não identificado. Se você acabou de pagar, aguarde alguns segundos e tente novamente.");
    } catch {
      if (!silencioso) setRenovMsg("Erro ao verificar. Tente novamente.");
    } finally {
      setRenovVerificando(false);
    }
  }

  // Verificação automática ao cair na tela expirada/suspensa (cliente voltando após pagar)
  useEffect(() => {
    if (tela === "expirada" || tela === "suspensa") verificarRenovacao(true);
  }, [tela]);

  async function gerarCobrancaRenovacao(cpfFornecido?: string) {
    const pagadorNome  = galeria?.clientes?.nome  || renovNome.trim();
    const pagadorEmail = galeria?.clientes?.email || renovEmail.trim();
    const pagadorCpf   = cpfFornecido ?? galeria?.clientes?.cpf ?? renovCpf.trim();

    if (!pagadorNome) { setRenovMsg("Informe seu nome."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pagadorEmail)) { setRenovMsg("Informe um e-mail válido."); return; }

    // CPF ausente → abre modal para coletar (pré-preenchido com dados disponíveis)
    if (!pagadorCpf) {
      setCpfTemp("");
      setModalCpf(true);
      return;
    }
    setRenovGerando(true);
    setRenovMsg("");
    try {
      const res = await fetch(`/api/entrega/${id}/renovar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: pagadorNome, email: pagadorEmail, cpf: pagadorCpf || undefined }),
      });
      const json = await res.json();
      if (!res.ok) { setRenovMsg(json.erro ?? "Erro ao gerar pagamento."); return; }
      setRenovInvoiceUrl(json.invoiceUrl);
      window.open(json.invoiceUrl, "_blank", "noopener,noreferrer");
    } catch {
      setRenovMsg("Erro de conexão. Tente novamente.");
    } finally {
      setRenovGerando(false);
    }
  }

  function renderModalCpf() {
    if (!modalCpf) return null;
    const nomeModal  = galeria?.clientes?.nome  || renovNome.trim();
    const emailModal = galeria?.clientes?.email || renovEmail.trim();
    return (
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 20 }}
        onClick={() => setModalCpf(false)}
      >
        <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, padding: "32px 28px", width: 400, maxWidth: "100%", boxShadow: "0 16px 60px rgba(0,0,0,0.35)" }}>
          <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800, color: "#111", letterSpacing: "-0.01em" }}>
            Complete seu cadastro
          </h3>
          <p style={{ margin: "0 0 24px", fontSize: 13, color: "#666", lineHeight: 1.6 }}>
            Para gerar a cobrança precisamos do seu CPF.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {/* Nome — pré-preenchido, somente leitura */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Nome</label>
              <input
                readOnly value={nomeModal}
                style={{ width: "100%", padding: "11px 14px", borderRadius: 9, border: "1px solid #e5e5e5", fontSize: 14, color: "#444", background: "#f9f9f9", boxSizing: "border-box" }}
              />
            </div>
            {/* E-mail — pré-preenchido, somente leitura */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>E-mail</label>
              <input
                readOnly value={emailModal}
                style={{ width: "100%", padding: "11px 14px", borderRadius: 9, border: "1px solid #e5e5e5", fontSize: 14, color: "#444", background: "#f9f9f9", boxSizing: "border-box" }}
              />
            </div>
            {/* CPF — campo a preencher */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#111", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>CPF <span style={{ color: "#EF4444" }}>*</span></label>
              <input
                autoFocus
                value={cpfTemp}
                onChange={(e) => setCpfTemp(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && cpfTemp.trim()) {
                    setModalCpf(false);
                    gerarCobrancaRenovacao(cpfTemp.trim());
                  }
                }}
                placeholder="000.000.000-00"
                style={{ width: "100%", padding: "11px 14px", borderRadius: 9, border: "1.5px solid #111", fontSize: 14, color: "#111", background: "#fff", boxSizing: "border-box", outline: "none" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setModalCpf(false)}
              style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid #ddd", background: "transparent", fontSize: 13, color: "#666", cursor: "pointer" }}
            >
              Cancelar
            </button>
            <button
              onClick={() => { setModalCpf(false); gerarCobrancaRenovacao(cpfTemp.trim()); }}
              disabled={!cpfTemp.trim()}
              style={{ flex: 1.5, padding: "12px", borderRadius: 10, border: "none", background: cpfTemp.trim() ? "#111" : "#ddd", color: cpfTemp.trim() ? "#fff" : "#999", fontSize: 13, fontWeight: 700, cursor: cpfTemp.trim() ? "pointer" : "default", transition: "all 0.15s" }}
            >
              Continuar para pagamento
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Bloco de pagamento de renovação — usado nas telas expirada e suspensa.
  // Chamado como função (não como <Componente/>) para não remontar os inputs a cada render.
  function renderBlocoRenovacao({ cor }: { cor: string }) {
    if (!galeria?.fotografos?.asaas_ativo) return (
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>
        Entre em contato com o fotógrafo para renovar o acesso.
      </div>
    );

    const temClienteVinculado = !!(galeria?.clientes?.nome && galeria?.clientes?.email);

    return (
      <div style={{ marginTop: 12 }}>
        {renovInvoiceUrl ? (
          <div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, marginBottom: 12 }}>
              Cobrança gerada! Conclua o pagamento na aba que abriu (Pix, boleto ou cartão) e depois clique abaixo.
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => verificarRenovacao(false)} disabled={renovVerificando} style={{ padding: "11px 20px", borderRadius: 9, border: "none", background: "#fff", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {renovVerificando ? "Verificando…" : "✓ Já paguei — liberar acesso"}
              </button>
              <a href={renovInvoiceUrl} target="_blank" rel="noopener noreferrer" style={{ padding: "11px 20px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.25)", background: "transparent", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                Reabrir pagamento
              </a>
            </div>
          </div>
        ) : (
          <div>
            {/* Formulário só aparece quando não há cliente vinculado */}
            {!temClienteVinculado && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                <input
                  value={renovNome} onChange={(e) => setRenovNome(e.target.value)}
                  placeholder="Seu nome"
                  style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 13, outline: "none" }}
                />
                <input
                  type="email" value={renovEmail} onChange={(e) => setRenovEmail(e.target.value)}
                  placeholder="Seu e-mail"
                  style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 13, outline: "none" }}
                />
                <input
                  value={renovCpf} onChange={(e) => setRenovCpf(e.target.value)}
                  placeholder="CPF (opcional)"
                  style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 13, outline: "none" }}
                />
              </div>
            )}
            <button
              onClick={() => gerarCobrancaRenovacao()}
              disabled={renovGerando}
              style={{ padding: "12px 24px", borderRadius: 9, border: "none", background: "#fff", color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
            >
              {renovGerando ? "Gerando pagamento…" : `💳 Renovar acesso — R$ ${galeria.renewal_fee.toFixed(2).replace(".", ",")}`}
            </button>
          </div>
        )}
        {renovMsg && <div style={{ fontSize: 12, color: cor, marginTop: 10, lineHeight: 1.5 }}>{renovMsg}</div>}
        {galeria.renovacao_dias > 0 && !renovInvoiceUrl && (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 8 }}>
            O pagamento libera o acesso por mais {galeria.renovacao_dias} dias.
          </div>
        )}
      </div>
    );
  }

  // ─── Tela: carregando ──────────────────────────────────────────────────────
  if (tela === "carregando") return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a" }}>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>Carregando…</div>
    </div>
  );

  // ─── Tela: não encontrada ──────────────────────────────────────────────────
  if (tela === "nao_encontrada") return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0a0a0a", gap: 12 }}>
      <div style={{ fontSize: 36 }}>📷</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Galeria não encontrada</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>O link pode estar incorreto ou a galeria foi removida.</div>
    </div>
  );

  const capaUrl    = galeria?.foto_capa_url ?? fotos[0]?.url_publica ?? null;
  const logoUrl    = galeria?.fotografos?.logo_url ?? null;
  const nomeEmpresa = galeria?.fotografos?.nome_empresa ?? "";
  const temCliente = !!galeria?.clientes?.nome;
  const nomeCliente = temCliente ? galeria.clientes.nome : identificacao?.nome ?? null;
  const dias        = diasRestantes(galeria?.expires_at ?? null);

  const bgCapa = capaUrl
    ? `linear-gradient(rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.85) 100%), url(${capaUrl}) center/cover`
    : "#0a0a0a";

  // ─── Tela: expirada ────────────────────────────────────────────────────────
  if (tela === "expirada") return (
    <>
    {renderModalCpf()}
    <div style={{ height: "100vh", position: "relative", overflow: "hidden", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {capaUrl && <img src={capaUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.3, filter: "blur(4px)", transform: "scale(1.05)" }} />}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)" }} />
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "0 24px", maxWidth: 460 }}>
        {logoUrl && <img src={logoUrl} alt="" style={{ maxHeight: 40, maxWidth: 160, objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.7, marginBottom: 28, display: "block", margin: "0 auto 28px" }} />}
        <div style={{ fontSize: 40, marginBottom: 16 }}>⏰</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8, letterSpacing: "-0.02em" }}>{galeria?.titulo}</div>
        {nomeCliente && <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 24 }}>Para {nomeCliente}</div>}
        <div style={{ padding: "20px 24px", borderRadius: 14, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", textAlign: "left" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#f87171", marginBottom: 6 }}>Download indisponível</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, marginBottom: galeria?.renewal_fee && galeria.renewal_fee > 0 ? 16 : 0 }}>
            O prazo de acesso expirou em {galeria?.expires_at ? new Date(galeria.expires_at).toLocaleDateString("pt-BR") : "—"}.
          </div>
          {galeria?.renewal_fee && galeria.renewal_fee > 0 && (
            <div style={{ borderTop: "1px solid rgba(239,68,68,0.2)", paddingTop: 14 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Taxa de renovação</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
                R$ {galeria.renewal_fee.toFixed(2).replace(".", ",")}
              </div>
              {renderBlocoRenovacao({ cor: "#f87171" })}
            </div>
          )}
          {!(galeria?.renewal_fee && galeria.renewal_fee > 0) && (
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 10 }}>
              Entre em contato com o fotógrafo para renovar o acesso.
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );

  // ─── Tela: suspensa ───────────────────────────────────────────────────────
  if (tela === "suspensa") return (
    <>
    {renderModalCpf()}
    <div style={{ height: "100vh", position: "relative", overflow: "hidden", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {capaUrl && <img src={capaUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.25, filter: "blur(4px)", transform: "scale(1.05)" }} />}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)" }} />
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "0 24px", maxWidth: 460 }}>
        {logoUrl && <img src={logoUrl} alt="" style={{ maxHeight: 40, maxWidth: 160, objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.7, marginBottom: 28, display: "block", margin: "0 auto 28px" }} />}
        <div style={{ fontSize: 36, marginBottom: 16 }}>🔒</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8, letterSpacing: "-0.02em" }}>{galeria?.titulo}</div>
        {nomeCliente && <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 24 }}>Para {nomeCliente}</div>}
        <div style={{ padding: "20px 24px", borderRadius: 14, background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.25)", textAlign: "left" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#fbbf24", marginBottom: 6 }}>Download indisponível</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, marginBottom: galeria?.renewal_fee && galeria.renewal_fee > 0 ? 16 : 0 }}>
            O acesso a esta galeria foi suspenso temporariamente.
          </div>
          {galeria?.renewal_fee && galeria.renewal_fee > 0 && (
            <div style={{ borderTop: "1px solid rgba(245,158,11,0.2)", paddingTop: 14 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Taxa de reativação</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
                R$ {galeria.renewal_fee.toFixed(2).replace(".", ",")}
              </div>
              {renderBlocoRenovacao({ cor: "#fbbf24" })}
            </div>
          )}
          {!(galeria?.renewal_fee && galeria.renewal_fee > 0) && (
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 10 }}>
              Entre em contato com o fotógrafo para reativar o acesso.
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );

  // ─── Tela: identificação ───────────────────────────────────────────────────
  if (tela === "identificacao") return (
    <div style={{ height: "100vh", position: "relative", overflow: "hidden", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {capaUrl && <img src={capaUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.45 }} />}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8))" }} />
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 380, padding: "0 20px" }}>
        {logoUrl && <div style={{ textAlign: "center", marginBottom: 24 }}><img src={logoUrl} alt="" style={{ maxHeight: 36, maxWidth: 150, objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.8 }} /></div>}
        <div style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", border: "0.5px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: "36px 32px" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 6 }}>{galeria?.titulo}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>Informe seus dados para acessar</div>
          </div>
          {formErro && (
            <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#f87171" }}>
              {formErro}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="text" value={nome} placeholder="Seu nome"
              onChange={(e) => { setNome(e.target.value); setFormErro(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleIdentificar()}
              style={{ width: "100%", padding: "12px 16px", borderRadius: 10, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
            />
            <input
              type="email" value={email} placeholder="Seu e-mail"
              onChange={(e) => { setEmail(e.target.value); setFormErro(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleIdentificar()}
              style={{ width: "100%", padding: "12px 16px", borderRadius: 10, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
            />
            <button
              onClick={handleIdentificar} disabled={salvando}
              style={{ width: "100%", padding: "14px", borderRadius: 40, background: salvando ? "rgba(255,255,255,0.3)" : "#fff", color: "#000", border: "none", fontSize: 14, fontWeight: 700, cursor: salvando ? "default" : "pointer", marginTop: 4, letterSpacing: "-0.01em", transition: "all 0.2s" }}
            >
              {salvando ? "Acessando…" : "Acessar galeria"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Tela: capa ────────────────────────────────────────────────────────────
  if (tela === "capa") return (
    <div style={{ height: "100vh", position: "relative", overflow: "hidden", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {capaUrl && (
        <img src={capaUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.55 }} />
      )}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.85) 100%)" }} />
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "0 24px", maxWidth: 600 }}>
        {logoUrl && (
          <img src={logoUrl} alt="" style={{ maxHeight: 44, maxWidth: 180, objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.85, marginBottom: 28, display: "block", margin: "0 auto 28px" }} />
        )}
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.2em", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 20 }}>
          Galeria de Entrega
        </div>
        <h1 style={{ fontSize: "clamp(26px,5vw,50px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.1, margin: "0 0 14px" }}>
          {galeria?.titulo}
        </h1>
        {galeria?.data_evento && (
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>
            {new Date(galeria.data_evento + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        )}
        {nomeCliente && (
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 36 }}>Para {nomeCliente}</div>
        )}
        {!nomeCliente && <div style={{ marginBottom: 36 }} />}

        <button
          onClick={() => setTela("galeria")}
          style={{ padding: "14px 40px", borderRadius: 40, background: "#fff", color: "#000", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: "-0.01em", boxShadow: "0 8px 32px rgba(0,0,0,0.3)", transition: "transform 0.15s, box-shadow 0.15s" }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.4)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.3)"; }}
        >
          Ver fotos
        </button>

        {dias !== null && dias >= 0 && dias <= 14 && (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 20 }}>
            {dias === 0 ? "Acesso expira hoje" : `Disponível por mais ${dias} dia${dias !== 1 ? "s" : ""}`}
          </div>
        )}
        {dias === null && galeria?.expires_at === null && (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 20 }}>
            {fotos.length} foto{fotos.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );

  // ─── Tela: galeria ─────────────────────────────────────────────────────────
  if (tela === "galeria") return (
    <div style={{ minHeight: "100vh", background: "#f4f4f4" }}>

      {/* Barra superior fixa */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(0,0,0,0.08)", padding: "0 20px", height: 56, display: "flex", alignItems: "center", gap: 14 }}>
        <button
          onClick={() => setTela("capa")}
          style={{ background: "none", border: "none", color: "#666", fontSize: 20, cursor: "pointer", padding: "0 4px", lineHeight: 1, flexShrink: 0 }}
          title="Voltar à capa"
        >‹</button>
        {logoUrl
          ? <img src={logoUrl} alt="" style={{ maxHeight: 24, maxWidth: 100, objectFit: "contain", flexShrink: 0 }} />
          : <div style={{ fontSize: 13, fontWeight: 700, color: "#333", flexShrink: 0 }}>{nomeEmpresa}</div>
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {galeria?.titulo}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 1, flexWrap: "wrap" }}>
            {nomeCliente && <span style={{ fontSize: 11, color: "#888" }}>Para {nomeCliente}</span>}
            {fotos.length > 0 && (
              <span style={{ fontSize: 11, color: "#888" }}>{fotos.length} foto{fotos.length !== 1 ? "s" : ""}</span>
            )}
            {dias !== null && (
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: dias <= 0 ? "#EF4444" : dias <= 7 ? "#B45309" : "#059669",
                background: dias <= 0 ? "rgba(239,68,68,0.10)" : dias <= 7 ? "rgba(245,158,11,0.12)" : "rgba(16,185,129,0.10)",
                padding: "1px 7px", borderRadius: 10,
              }}>
                {dias <= 0 ? "Expirado" : `${dias} dia${dias !== 1 ? "s" : ""} restante${dias !== 1 ? "s" : ""}`}
              </span>
            )}
            {dias === null && galeria?.expires_at === null && (
              <span style={{ fontSize: 11, color: "#aaa" }}>Sem prazo</span>
            )}
          </div>
        </div>
        {/* Drive link → botão "Baixar todas" padrão */}
        {galeria?.drive_link && (
          <a
            href={galeria.drive_link} target="_blank" rel="noopener noreferrer"
            onClick={(e) => {
              if (!galeria.drive_apenas_identificado || identificacao) return;
              if (temCliente) {
                const supabase = createClient();
                supabase.from("galeria_acessos").insert({
                  galeria_id: id,
                  nome: galeria.clientes.nome,
                  email: galeria.clientes.email ?? "",
                }).then(() => {});
                return;
              }
              e.preventDefault();
              setFormErro("");
              setModalDrive(true);
            }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: "#111", color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none", flexShrink: 0, cursor: "pointer" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Baixar todas
          </a>
        )}
        {/* Sem Drive link → Baixar todas + Selecionar */}
        {!galeria?.drive_link && fotos.length > 0 && !modoSelecao && (
          <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
            <button
              onClick={() => baixarSelecionadas(fotos.map((f) => f.id))}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: "#111", color: "#fff", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer" }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Baixar todas
            </button>
            <button
              onClick={() => { setModoSelecao(true); setSelecionadas(new Set()); }}
              style={{ padding: "8px 14px", borderRadius: 8, background: "transparent", border: "1px solid #ddd", color: "#444", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              Selecionar
            </button>
          </div>
        )}
        {/* Modo seleção ativo */}
        {!galeria?.drive_link && modoSelecao && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "#666" }}>
              {selecionadas.size} selecionada{selecionadas.size !== 1 ? "s" : ""}
            </span>
            <button
              onClick={selecionadas.size === fotos.length ? desmarcarTodas : selecionarTodas}
              style={{ padding: "6px 12px", borderRadius: 7, background: "transparent", border: "1px solid #ddd", color: "#444", fontSize: 12, cursor: "pointer" }}
            >
              {selecionadas.size === fotos.length ? "Desmarcar todas" : "Selecionar todas"}
            </button>
            {selecionadas.size > 0 && (
              <button
                onClick={() => baixarSelecionadas([...selecionadas])}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 7, background: "#111", color: "#fff", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Baixar {selecionadas.size}
              </button>
            )}
            <button
              onClick={() => { setModoSelecao(false); setSelecionadas(new Set()); }}
              style={{ padding: "6px 12px", borderRadius: 7, background: "transparent", border: "1px solid #ddd", color: "#666", fontSize: 12, cursor: "pointer" }}
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Grid de fotos */}
      <div style={{ paddingTop: 68, paddingBottom: 40 }}>
        {galeria?.mensagem && (
          <div style={{ padding: "14px 16px 4px", maxWidth: 1400, margin: "0 auto", fontSize: 12, color: "#bbb" }}>
            Clique para ampliar
          </div>
        )}

        {fotos.length === 0 ? (
          galeria?.drive_link ? (
            // Galeria só com Drive — sem fotos online
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: "40px 20px" }}>
              <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 20 }}>☁️</div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: "0 0 10px", letterSpacing: "-0.02em" }}>
                  Suas fotos estão no Google Drive
                </h2>
                <p style={{ fontSize: 14, color: "#666", lineHeight: 1.7, margin: "0 0 32px" }}>
                  O fotógrafo disponibilizou as imagens via Google Drive.<br />
                  Clique no botão abaixo para abrir e baixar todas as fotos.
                </p>

                <a
                  href={galeria.drive_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (!galeria.drive_apenas_identificado || identificacao) return;
                    if (temCliente) return;
                    e.preventDefault();
                    setFormErro("");
                    setModalDrive(true);
                  }}
                  style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "14px 32px", borderRadius: 40, background: "#111", color: "#fff", fontSize: 15, fontWeight: 700, textDecoration: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", transition: "transform 0.15s, box-shadow 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,0.22)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.15)"; }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Baixar fotos no Google Drive
                </a>

                <div style={{ marginTop: 32, background: "#f9f9f9", border: "1px solid #eee", borderRadius: 14, padding: "20px 24px", textAlign: "left" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
                    Como baixar
                  </div>
                  <ol style={{ margin: 0, padding: "0 0 0 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      "Clique em \"Baixar fotos no Google Drive\" acima",
                      "Na pasta do Google Drive, clique nos três pontos (⋮) ou selecione todas as fotos",
                      "Escolha \"Fazer download\" — as fotos serão salvas como um arquivo .zip",
                      "Extraia o arquivo .zip para acessar todas as imagens",
                    ].map((passo, i) => (
                      <li key={i} style={{ fontSize: 13, color: "#555", lineHeight: 1.5 }}>
                        {passo}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          ) : (
          <div style={{ textAlign: "center", padding: "80px 20px", color: "#aaa" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📷</div>
            <div style={{ fontSize: 14 }}>As fotos ainda não foram enviadas. Tente novamente em breve.</div>
          </div>
          )
        ) : (
          // Grade justificada — cada foto mantém a proporção original (verticais em pé)
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, padding: "0 3px", maxWidth: 1600, margin: "0 auto", alignItems: "stretch" }}>
            {fotos.map((foto, idx) => {
              const ratio = foto.largura && foto.altura ? foto.largura / foto.altura : 1.5;
              const sel = selecionadas.has(foto.id);
              return (
                <div
                  key={foto.id}
                  onClick={() => modoSelecao ? toggleFoto(foto.id) : setLightboxIdx(idx)}
                  style={{
                    position: "relative", overflow: "hidden", cursor: "pointer", background: "#ddd",
                    aspectRatio: String(ratio),
                    flexGrow: ratio,
                    flexBasis: ratio * 200,
                    maxWidth: "100%",
                    outline: sel ? "3px solid #2563EB" : "none",
                    outlineOffset: -3,
                  }}
                >
                  <img
                    src={foto.url_publica} alt=""
                    loading="lazy"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.2s", opacity: modoSelecao && !sel ? 0.65 : 1 }}
                    onMouseEnter={(e) => !modoSelecao && (e.currentTarget.style.transform = "scale(1.04)")}
                    onMouseLeave={(e) => !modoSelecao && (e.currentTarget.style.transform = "scale(1)")}
                  />
                  {modoSelecao && (
                    <div style={{
                      position: "absolute", top: 8, left: 8,
                      width: 22, height: 22, borderRadius: "50%",
                      background: sel ? "#2563EB" : "rgba(255,255,255,0.85)",
                      border: sel ? "2px solid #2563EB" : "2px solid rgba(0,0,0,0.25)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                      pointerEvents: "none",
                    }}>
                      {sel && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                  )}
                </div>
              );
            })}
            {/* Filler: impede que a última linha estique demais */}
            <div style={{ flexGrow: 1000, flexBasis: 0 }} />
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <Lightbox
          fotos={fotos}
          indexInicial={lightboxIdx}
          onFechar={() => setLightboxIdx(null)}
          apenaZip={galeria?.apenas_zip}
          galeriaId={id}
        />
      )}

      {/* Modal: identificação antes do download via Drive */}
      {modalDrive && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }} onClick={() => setModalDrive(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: "28px 28px", width: 380, maxWidth: "100%", boxShadow: "0 12px 48px rgba(0,0,0,0.3)" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800, color: "#111", letterSpacing: "-0.01em" }}>Quase lá!</h3>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#666", lineHeight: 1.6 }}>
              Para baixar todas as fotos, informe seu nome e e-mail.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome"
                autoFocus
                style={{ padding: "11px 14px", borderRadius: 9, border: "1px solid #ddd", fontSize: 14, color: "#111", background: "#fff" }}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleIdentificarEBaixar()}
                placeholder="seu@email.com"
                style={{ padding: "11px 14px", borderRadius: 9, border: "1px solid #ddd", fontSize: 14, color: "#111", background: "#fff" }}
              />
            </div>
            {formErro && <div style={{ fontSize: 12, color: "#EF4444", marginBottom: 12 }}>{formErro}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setModalDrive(false)} style={{ flex: 1, padding: "11px", borderRadius: 9, border: "1px solid #ddd", background: "transparent", fontSize: 13, color: "#666", cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={handleIdentificarEBaixar} disabled={salvando} style={{ flex: 1.4, padding: "11px", borderRadius: 9, border: "none", background: "#111", color: "#fff", fontSize: 13, fontWeight: 700, cursor: salvando ? "default" : "pointer" }}>
                {salvando ? "Aguarde…" : "Baixar fotos ↓"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return null;
}
