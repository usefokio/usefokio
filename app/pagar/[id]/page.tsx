"use client";

// Página pública da solicitação de pagamento: o cliente só escolhe as parcelas e é levado à página de cartão do
// Asaas — os dados do pagador vêm do contato vinculado. Valores calculados no servidor (/api/pagar/<id>).
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { brl, type OpcaoParcela } from "@/lib/pagamentos/simularParcelas";

type Dados = {
  descricao: string; detalhes: string | null; valor: number; status: "aberta" | "paga" | "cancelada";
  fotografo: { nome: string; logo_url: string | null };
  cliente_primeiro_nome?: string | null;
  opcoes?: OpcaoParcela[]; erro?: string;
};

export default function PagarPage() {
  const { id } = useParams<{ id: string }>();
  const [dados, setDados] = useState<Dados | null>(null);
  const [naoEncontrada, setNaoEncontrada] = useState(false);
  const [parcelas, setParcelas] = useState(1);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch(`/api/pagar/${id}`).then(async (r) => {
      if (!r.ok) { setNaoEncontrada(true); return; }
      setDados(await r.json());
    }).catch(() => setNaoEncontrada(true));
  }, [id]);

  async function pagar() {
    setErro("");
    setEnviando(true);
    try {
      const r = await fetch(`/api/pagar/${id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parcelas }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.invoiceUrl) { setErro(j.erro ?? "Não foi possível gerar o pagamento."); setEnviando(false); return; }
      window.location.href = j.invoiceUrl;
    } catch {
      setErro("Erro de conexão. Tente novamente.");
      setEnviando(false);
    }
  }

  const caixa: React.CSSProperties = { maxWidth: 460, margin: "0 auto", background: "#fff", borderRadius: 16, padding: "28px 24px", boxShadow: "0 6px 30px rgba(0,0,0,0.08)" };

  return (
    <div style={{ minHeight: "100vh", background: "#f4f4f5", padding: "32px 16px", fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif", color: "#111" }}>
      {naoEncontrada ? (
        <div style={{ ...caixa, textAlign: "center", color: "#666" }}>Solicitação de pagamento não encontrada.</div>
      ) : !dados ? (
        <div style={{ ...caixa, textAlign: "center", color: "#666" }}>Carregando…</div>
      ) : (
        <div style={caixa}>
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            {dados.fotografo.logo_url
              ? <img src={dados.fotografo.logo_url} alt={dados.fotografo.nome} style={{ maxHeight: 56, maxWidth: 200, objectFit: "contain" }} />
              : <div style={{ fontSize: 14, fontWeight: 700, color: "#555" }}>{dados.fotografo.nome}</div>}
          </div>
          {dados.cliente_primeiro_nome && (
            <div style={{ fontSize: 14, color: "#666", textAlign: "center", marginBottom: 4 }}>Olá, {dados.cliente_primeiro_nome}!</div>
          )}
          <div style={{ fontSize: 19, fontWeight: 800, textAlign: "center", letterSpacing: "-0.01em" }}>{dados.descricao}</div>
          {dados.detalhes && <div style={{ fontSize: 13, color: "#666", textAlign: "center", marginTop: 6, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{dados.detalhes}</div>}
          <div style={{ fontSize: 28, fontWeight: 800, textAlign: "center", margin: "14px 0 20px" }}>{brl(dados.valor)}</div>

          {dados.status === "paga" ? (
            <div style={{ textAlign: "center", padding: 16, borderRadius: 10, background: "rgba(16,185,129,0.1)", color: "#059669", fontWeight: 700 }}>✓ Pagamento confirmado. Obrigado!</div>
          ) : dados.status === "cancelada" ? (
            <div style={{ textAlign: "center", padding: 16, borderRadius: 10, background: "#f3f4f6", color: "#6B7280", fontWeight: 600 }}>Esta solicitação de pagamento foi cancelada.</div>
          ) : dados.erro || !dados.opcoes ? (
            <div style={{ textAlign: "center", color: "#B45309", fontSize: 13 }}>{dados.erro ?? "Pagamento indisponível no momento."}</div>
          ) : (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>💳 Cartão de crédito</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
                {dados.opcoes.map((o) => (
                  <label key={o.parcelas} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 10, cursor: "pointer",
                    border: `1.5px solid ${parcelas === o.parcelas ? "#111" : "#e5e5e5"}`, background: parcelas === o.parcelas ? "#fafafa" : "#fff" }}>
                    <input type="radio" name="parcelas" checked={parcelas === o.parcelas} onChange={() => setParcelas(o.parcelas)} />
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{o.parcelas}x de {brl(o.parcela)}</span>
                    <span style={{ fontSize: 12, color: "#888" }}>{o.total === dados.valor ? "sem juros" : `total ${brl(o.total)}`}</span>
                  </label>
                ))}
              </div>
              {erro && <div style={{ fontSize: 13, color: "#DC2626", marginBottom: 10 }}>{erro}</div>}
              <button onClick={pagar} disabled={enviando}
                style={{ width: "100%", padding: 14, borderRadius: 10, border: "none", background: "#111", color: "#fff", fontSize: 15, fontWeight: 700, cursor: enviando ? "default" : "pointer" }}>
                {enviando ? "Gerando pagamento…" : "Pagar com cartão →"}
              </button>
              <div style={{ fontSize: 11, color: "#999", textAlign: "center", marginTop: 10 }}>Você será levado ao ambiente seguro do Asaas para digitar o cartão.</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
