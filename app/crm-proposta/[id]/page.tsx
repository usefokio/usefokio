"use client";

// PROPOSTA EM PDF — espelho do /crm-contrato/{id}: página formatada para papel com
// botão Imprimir → "Salvar como PDF" do navegador. Dados via /api/crm-proposta
// (service role), sem depender de sessão.
import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import { formatBRL } from "@/lib/utils/format";
import type { CrmProposta, CrmPropostaOpcao } from "@/lib/supabase/types";

type Fotografo = {
  nome_empresa: string | null; nome_completo: string | null; logo_url: string | null;
  whatsapp: string | null; telefone: string | null; email: string | null;
  cidade: string | null; estado: string | null;
};

function PropostaConteudo() {
  const { id } = useParams<{ id: string }>();
  const [proposta, setProposta] = useState<CrmProposta | null | undefined>(undefined);
  const [opcoes, setOpcoes] = useState<CrmPropostaOpcao[]>([]);
  const [fotografo, setFotografo] = useState<Fotografo | null>(null);

  useEffect(() => {
    if (!id) { setProposta(null); return; }
    fetch(`/api/crm-proposta?id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((json: { proposta?: CrmProposta | null; opcoes?: CrmPropostaOpcao[]; fotografo?: Fotografo | null }) => {
        setProposta(json.proposta ?? null);
        setOpcoes(json.opcoes ?? []);
        setFotografo(json.fotografo ?? null);
      })
      .catch(() => setProposta(null));
  }, [id]);

  if (proposta === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ fontSize: 14, color: "#6B7280" }}>Carregando proposta…</div>
      </div>
    );
  }
  if (proposta === null) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>Proposta não encontrada</div>
        </div>
      </div>
    );
  }

  const nomeEmpresa = fotografo?.nome_empresa ?? fotografo?.nome_completo ?? "";
  const pacotes = opcoes.filter((o) => o.tipo === "pacote");
  const adicionais = opcoes.filter((o) => o.tipo === "adicional");
  const contato = [fotografo?.whatsapp ?? fotografo?.telefone, fotografo?.email].filter(Boolean).join(" · ");
  const cidade = [fotografo?.cidade, fotografo?.estado].filter(Boolean).join(" – ");

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .proposta-card { box-shadow: none !important; border-radius: 0 !important; }
        }
      `}</style>
      <div style={{ minHeight: "100vh", background: "#F3F4F6", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 16px", fontFamily: "system-ui, -apple-system, sans-serif" }}>

        <div className="no-print" style={{ marginBottom: 20, display: "flex", gap: 10 }}>
          <button onClick={() => window.print()}
            style={{ padding: "10px 20px", borderRadius: 8, background: "#111827", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            🖨 Imprimir / Salvar em PDF
          </button>
          <button onClick={() => window.close()}
            style={{ padding: "10px 16px", borderRadius: 8, background: "transparent", color: "#6B7280", border: "1px solid #D1D5DB", fontSize: 14, cursor: "pointer" }}>
            Fechar
          </button>
        </div>

        <div className="proposta-card" style={{ width: "100%", maxWidth: 800, background: "#fff", borderRadius: 12, boxShadow: "0 4px 32px rgba(0,0,0,0.1)", overflow: "hidden" }}>
          {/* Cabeçalho */}
          <div style={{ background: "#111827", padding: "26px 40px", color: "#fff", display: "flex", alignItems: "center", gap: 16 }}>
            {fotografo?.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fotografo.logo_url} alt={nomeEmpresa} style={{ height: 44, width: "auto", objectFit: "contain" }} />
            )}
            <div>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.75 }}>Proposta</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{proposta.titulo}</div>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right", fontSize: 12, opacity: 0.8 }}>{nomeEmpresa}</div>
          </div>

          <div style={{ padding: "32px 40px" }}>
            {proposta.descricao_html && (
              <div style={{ fontSize: 14, lineHeight: 1.7, color: "#374151", marginBottom: 26 }}
                dangerouslySetInnerHTML={{ __html: proposta.descricao_html }} />
            )}

            {pacotes.map((o) => (
              <div key={o.id} style={{ border: "1px solid #E5E7EB", borderRadius: 10, padding: "18px 22px", marginBottom: 14, breakInside: "avoid" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", flex: 1 }}>{o.nome}</div>
                  {o.valor != null && <div style={{ fontSize: 17, fontWeight: 800, color: "#111827", whiteSpace: "nowrap" }}>{formatBRL(o.valor)}</div>}
                </div>
                {o.itens.length > 0 && (
                  <ul style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: 13.5, lineHeight: 1.8, color: "#374151" }}>
                    {o.itens.map((it, i) => <li key={i}>{it}</li>)}
                  </ul>
                )}
              </div>
            ))}

            {adicionais.length > 0 && (
              <div style={{ marginTop: 22, breakInside: "avoid" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Adicionais</div>
                {adicionais.map((o) => (
                  <div key={o.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, color: "#374151", padding: "6px 0", borderBottom: "1px solid #F3F4F6" }}>
                    <span>{o.nome}{o.itens.length > 0 ? ` — ${o.itens.join(", ")}` : ""}</span>
                    {o.valor != null && <strong>{formatBRL(o.valor)}</strong>}
                  </div>
                ))}
              </div>
            )}

            {proposta.validade_dias != null && (
              <div style={{ marginTop: 26, fontSize: 12.5, color: "#6B7280" }}>
                Proposta válida por {proposta.validade_dias} dias a partir do envio.
              </div>
            )}
          </div>

          <div style={{ borderTop: "1px solid #E5E7EB", padding: "18px 40px", fontSize: 12, color: "#6B7280", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span>{nomeEmpresa}{cidade ? ` · ${cidade}` : ""}</span>
            <span>{contato}</span>
          </div>
        </div>
      </div>
    </>
  );
}

export default function PropostaPdfPage() {
  return (
    <Suspense fallback={null}>
      <PropostaConteudo />
    </Suspense>
  );
}
