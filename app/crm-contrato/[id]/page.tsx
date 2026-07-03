"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CrmContract } from "@/lib/supabase/types";

function ContratoConteudo() {
  const { id } = useParams<{ id: string }>();
  const [contrato, setContrato] = useState<CrmContract | null | undefined>(undefined);
  const [nomeFotografo, setNomeFotografo] = useState("");

  useEffect(() => {
    const sb = createClient();
    sb.from("crm_contracts").select("*").eq("id", id).single()
      .then(({ data }) => {
        const c = data as CrmContract | null;
        setContrato(c);
        if (c?.fotografo_id) {
          sb.from("fotografos_nomes").select("nome_empresa, nome_completo").eq("id", c.fotografo_id).single()
            .then(({ data: f }) => {
              if (f) setNomeFotografo((f as { nome_empresa: string | null; nome_completo: string | null }).nome_empresa ?? (f as { nome_completo: string | null }).nome_completo ?? "");
            });
        }
      });
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
