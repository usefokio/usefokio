"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import type { CrmContract } from "@/lib/supabase/types";

function CanvasAssinatura({ onTraco }: { onTraco: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);
  const temTraco = useRef(false);

  const ctx = () => canvasRef.current?.getContext("2d") ?? null;

  const posicao = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const iniciar = (e: React.PointerEvent<HTMLCanvasElement>) => {
    desenhando.current = true;
    const c = ctx(); if (!c) return;
    const { x, y } = posicao(e);
    c.beginPath();
    c.moveTo(x, y);
  };

  const desenhar = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!desenhando.current) return;
    const c = ctx(); if (!c) return;
    const { x, y } = posicao(e);
    c.lineWidth = 2.2;
    c.lineCap = "round";
    c.strokeStyle = "#111827";
    c.lineTo(x, y);
    c.stroke();
    temTraco.current = true;
  };

  const finalizar = () => {
    if (!desenhando.current) return;
    desenhando.current = false;
    if (temTraco.current && canvasRef.current) onTraco(canvasRef.current.toDataURL("image/png"));
  };

  const limpar = () => {
    const c = ctx(); const canvas = canvasRef.current;
    if (!c || !canvas) return;
    c.clearRect(0, 0, canvas.width, canvas.height);
    temTraco.current = false;
    onTraco(null);
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={600}
        height={180}
        onPointerDown={iniciar}
        onPointerMove={desenhar}
        onPointerUp={finalizar}
        onPointerLeave={finalizar}
        style={{ width: "100%", maxWidth: 600, height: 180, touchAction: "none", background: "#F9FAFB", border: "1.5px dashed #D1D5DB", borderRadius: 8, cursor: "crosshair" }}
      />
      <button type="button" onClick={limpar}
        style={{ marginTop: 8, padding: "6px 14px", borderRadius: 7, background: "transparent", color: "#6B7280", border: "1px solid #D1D5DB", fontSize: 12, cursor: "pointer" }}>
        Limpar assinatura
      </button>
    </div>
  );
}

function BlocoAssinatura({ contratoId, onAssinado }: { contratoId: string; onAssinado: (dados: { assinado_em: string; assinado_nome: string; assinatura_png: string }) => void }) {
  const [nome, setNome] = useState("");
  const [aceito, setAceito] = useState(false);
  const [assinaturaPng, setAssinaturaPng] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const podeAssinar = nome.trim().length > 2 && aceito && !!assinaturaPng && !enviando;

  const assinar = async () => {
    if (!podeAssinar || !assinaturaPng) return;
    setEnviando(true);
    setErro("");
    try {
      const res = await fetch("/api/crm-contrato/assinar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: contratoId, nome: nome.trim(), assinatura_png: assinaturaPng }),
      });
      const json = await res.json();
      if (!res.ok) { setErro(json.error ?? "Não foi possível assinar."); setEnviando(false); return; }
      onAssinado({ assinado_em: new Date().toISOString(), assinado_nome: nome.trim(), assinatura_png: assinaturaPng });
    } catch {
      setErro("Não foi possível assinar. Verifique sua conexão.");
      setEnviando(false);
    }
  };

  return (
    <div style={{ padding: "32px 48px 40px", borderTop: "1px solid #E5E7EB" }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 16 }}>Assinatura</div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", marginBottom: 6 }}>Nome completo</div>
        <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Digite seu nome completo"
          style={{ width: "100%", maxWidth: 600, padding: "9px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 14, boxSizing: "border-box" }} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", marginBottom: 6 }}>Desenhe sua assinatura</div>
        <CanvasAssinatura onTraco={setAssinaturaPng} />
      </div>

      <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 18, fontSize: 13, color: "#374151", cursor: "pointer" }}>
        <input type="checkbox" checked={aceito} onChange={e => setAceito(e.target.checked)} style={{ marginTop: 2 }} />
        Li e concordo com os termos do contrato acima.
      </label>

      {erro && <div style={{ fontSize: 13, color: "#DC2626", marginBottom: 12 }}>{erro}</div>}

      <button onClick={assinar} disabled={!podeAssinar}
        style={{ padding: "11px 24px", borderRadius: 8, background: podeAssinar ? "#111827" : "#D1D5DB", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: podeAssinar ? "pointer" : "not-allowed" }}>
        {enviando ? "Assinando…" : "Assinar contrato"}
      </button>
    </div>
  );
}

function ContratoConteudo() {
  const { id } = useParams<{ id: string }>();
  const [contrato, setContrato] = useState<CrmContract | null | undefined>(undefined);
  const [nomeFotografo, setNomeFotografo] = useState("");

  useEffect(() => {
    // Página pública: dados por /api/crm-contrato (service role) — o client anônimo esbarra
    // no RLS de crm_contracts e voltava vazio → "Contrato não encontrado".
    if (!id) { setContrato(null); return; }
    fetch(`/api/crm-contrato?id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((json: { contrato?: CrmContract | null; nomeFotografo?: string }) => {
        setContrato(json.contrato ?? null);
        if (json.nomeFotografo) setNomeFotografo(json.nomeFotografo);
      })
      .catch(() => setContrato(null));
  }, [id]);

  if (contrato === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ fontSize: 14, color: "#6B7280" }}>Carregando contrato…</div>
      </div>
    );
  }

  if (contrato === null) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 6 }}>Contrato não encontrado</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; }
          .contrato-card { box-shadow: none !important; border: none !important; max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
          .contrato-body { padding: 24px 40px !important; }
        }
        .contrato-body p { margin: 0 0 0.8em; }
        .contrato-body ul, .contrato-body ol { margin: 0.4em 0 0.8em 1.5em; padding: 0; }
        .contrato-body li { margin-bottom: 0.3em; }
        .contrato-body strong { font-weight: 700; }
        .contrato-body em { font-style: italic; }
        .contrato-body u { text-decoration: underline; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#F3F4F6", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 16px", fontFamily: "system-ui, -apple-system, sans-serif" }}>

        {/* Toolbar */}
        <div className="no-print" style={{ marginBottom: 20, display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => window.print()}
            style={{ padding: "10px 20px", borderRadius: 8, background: "#111827", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            🖨️ Imprimir / Salvar PDF
          </button>
          <button onClick={() => window.close()}
            style={{ padding: "10px 16px", borderRadius: 8, background: "transparent", color: "#6B7280", border: "1px solid #D1D5DB", fontSize: 14, cursor: "pointer" }}>
            ← Fechar
          </button>
        </div>

        {/* Card do contrato */}
        <div className="contrato-card" style={{ width: "100%", maxWidth: 800, background: "#fff", borderRadius: 12, boxShadow: "0 4px 32px rgba(0,0,0,0.1)", overflow: "hidden" }}>

          {/* Cabeçalho */}
          <div style={{ background: "#111827", padding: "20px 40px", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 4 }}>Contrato</div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>{nomeFotografo || "Fotógrafo"}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 2 }}>{contrato.nome_template}</div>
              <div style={{ fontSize: 10, color: "#6B7280", fontFamily: "monospace" }}>{new Date(contrato.created_at).toLocaleDateString("pt-BR")}</div>
            </div>
          </div>

          {/* Corpo do contrato */}
          <div className="contrato-body" style={{ padding: "40px 48px", fontSize: 14, lineHeight: 1.8, color: "#1F2937" }}
            dangerouslySetInnerHTML={{ __html: contrato.corpo_gerado ?? "" }} />

          {contrato.assinado_em ? (
            <div className="no-print" style={{ padding: "24px 48px 40px", borderTop: "1px solid #E5E7EB" }}>
              <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 10, padding: "16px 20px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#059669", marginBottom: 4 }}>✓ Assinado eletronicamente</div>
                <div style={{ fontSize: 13, color: "#065F46" }}>
                  Por <strong>{contrato.assinado_nome}</strong> em {new Date(contrato.assinado_em).toLocaleString("pt-BR")}
                </div>
                {contrato.assinatura_png && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={contrato.assinatura_png} alt="Assinatura" style={{ marginTop: 10, height: 70, background: "#fff", borderRadius: 6, border: "1px solid #D1FAE5" }} />
                )}
              </div>
            </div>
          ) : (
            <div className="no-print">
              <BlocoAssinatura
                contratoId={id}
                onAssinado={dados => setContrato(c => c ? { ...c, ...dados } : c)}
              />
            </div>
          )}

          {/* Rodapé */}
          <div style={{ background: "#F9FAFB", borderTop: "1px solid #E5E7EB", padding: "14px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 11, color: "#9CA3AF" }}>Documento gerado por UseFokio</div>
            <div style={{ fontSize: 10, color: "#D1D5DB", fontFamily: "monospace" }}>{id}</div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function ContratoPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#6B7280" }}>Carregando…</div>}>
      <ContratoConteudo />
    </Suspense>
  );
}
