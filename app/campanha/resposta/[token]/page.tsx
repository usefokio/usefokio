"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type DadosCampanha = {
  titulo:       string;
  nomeCliente:  string | null;
  nomeEmpresa:  string;
  galeriaId:    string;
  asaasAtivo:   boolean;
  renewalFee:   number;
  resposta:     "renovar" | "tem_arquivos" | null;
  respondidoEm: string | null;
};

type Tela = "carregando" | "nao_encontrado" | "ja_respondeu" | "opcoes" | "confirmando" | "confirmado";

export default function RespostaCampanhaPage() {
  const { token } = useParams() as { token: string };
  const router = useRouter();

  const [tela,   setTela]   = useState<Tela>("carregando");
  const [dados,  setDados]  = useState<DadosCampanha | null>(null);
  const [nome,   setNome]   = useState("");
  const [email,  setEmail]  = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro,   setErro]   = useState("");

  useEffect(() => {
    fetch(`/api/campanha/resposta/${token}`)
      .then((r) => r.json())
      .then((d: DadosCampanha & { erro?: string }) => {
        if (d.erro) { setTela("nao_encontrado"); return; }
        setDados(d);
        if (d.resposta !== null) setTela("ja_respondeu");
        else setTela("opcoes");
      })
      .catch(() => setTela("nao_encontrado"));
  }, [token]);

  async function responder(resposta: "renovar" | "tem_arquivos") {
    if (!dados) return;
    setSalvando(true);
    setErro("");

    const res = await fetch(`/api/campanha/resposta/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resposta, nome: nome.trim() || null, email: email.trim() || null }),
    });
    const json = await res.json();
    setSalvando(false);

    if (!res.ok) { setErro(json.erro ?? "Erro ao registrar resposta."); return; }

    if (resposta === "renovar") {
      router.push(`/acesso/entrega/${dados.galeriaId}`);
    } else {
      setTela("confirmado");
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    padding: "10px 14px", borderRadius: 8, border: "1.5px solid #e5e5e5",
    fontSize: 14, color: "#111", background: "#fff",
    outline: "none",
  };

  // ── Telas ─────────────────────────────────────────────────────────────────
  if (tela === "carregando") {
    return (
      <Wrap>
        <div style={{ textAlign: "center", padding: "40px 0", color: "#999", fontSize: 14 }}>Carregando…</div>
      </Wrap>
    );
  }

  if (tela === "nao_encontrado") {
    return (
      <Wrap>
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔗</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 8 }}>Link inválido</div>
          <div style={{ fontSize: 14, color: "#666" }}>Este link não existe ou já foi removido.</div>
        </div>
      </Wrap>
    );
  }

  if (tela === "ja_respondeu" && dados) {
    const respostaTexto = dados.resposta === "tem_arquivos"
      ? "Já tenho meus arquivos"
      : "Quero renovar meu acesso";
    return (
      <Wrap>
        <div style={{ textAlign: "center", padding: "20px 0 10px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 8 }}>Já recebemos sua resposta</div>
          <div style={{ fontSize: 14, color: "#555", marginBottom: 16 }}>
            Você respondeu: <strong>{respostaTexto}</strong>
          </div>
          {dados.respondidoEm && (
            <div style={{ fontSize: 12, color: "#999" }}>
              Registrado em {new Date(dados.respondidoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
            </div>
          )}
        </div>
      </Wrap>
    );
  }

  if (tela === "confirmado") {
    return (
      <Wrap>
        <div style={{ textAlign: "center", padding: "20px 0 10px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 8 }}>Confirmação registrada!</div>
          <div style={{ fontSize: 14, color: "#555", lineHeight: 1.6 }}>
            Obrigado por confirmar. O fotógrafo foi notificado e tomará as decisões necessárias sobre o armazenamento.
          </div>
        </div>
      </Wrap>
    );
  }

  if ((tela === "opcoes" || tela === "confirmando") && dados) {
    return (
      <Wrap>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: "#999", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {dados.nomeEmpresa}
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
            {dados.titulo}
          </h1>
          {dados.nomeCliente && (
            <div style={{ fontSize: 14, color: "#666" }}>
              Olá, <strong>{dados.nomeCliente}</strong>!
            </div>
          )}
        </div>

        {/* Mensagem */}
        <div style={{ background: "#f9f9f9", borderRadius: 10, padding: "16px 20px", marginBottom: 24, fontSize: 14, color: "#555", lineHeight: 1.7 }}>
          <p style={{ margin: "0 0 10px" }}>
            Entramos em contato sobre as fotos desta galeria. Com o aumento nos custos de armazenamento, precisamos atualizar o status dos arquivos.
          </p>
          <p style={{ margin: 0 }}>
            Por favor, nos diga qual é a sua situação:
          </p>
        </div>

        {tela === "opcoes" ? (
          <>
            {/* Opção 1: Renovar */}
            <button
              onClick={() => setTela("confirmando")}
              style={{
                width: "100%", padding: "16px 20px", borderRadius: 12, marginBottom: 12,
                border: "2px solid #2563EB", background: "#EFF6FF", cursor: "pointer",
                textAlign: "left", display: "flex", alignItems: "center", gap: 14,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#DBEAFE")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#EFF6FF")}
            >
              <span style={{ fontSize: 28 }}>🔄</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#1D4ED8" }}>Quero renovar meu acesso</div>
                <div style={{ fontSize: 13, color: "#3B82F6", marginTop: 2 }}>
                  {dados.asaasAtivo && dados.renewalFee > 0
                    ? `Taxa de renovação: R$ ${dados.renewalFee.toFixed(2).replace(".", ",")}`
                    : "Entre em contato com o fotógrafo"}
                </div>
              </div>
            </button>

            {/* Opção 2: Já tenho */}
            <button
              onClick={() => responder("tem_arquivos")}
              disabled={salvando}
              style={{
                width: "100%", padding: "16px 20px", borderRadius: 12,
                border: "2px solid #D1D5DB", background: "#F9FAFB", cursor: salvando ? "default" : "pointer",
                textAlign: "left", display: "flex", alignItems: "center", gap: 14,
              }}
              onMouseEnter={(e) => { if (!salvando) e.currentTarget.style.background = "#F3F4F6"; }}
              onMouseLeave={(e) => { if (!salvando) e.currentTarget.style.background = "#F9FAFB"; }}
            >
              <span style={{ fontSize: 28 }}>✅</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#374151" }}>Já tenho meus arquivos</div>
                <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>Já fiz o download de todas as fotos</div>
              </div>
            </button>
          </>
        ) : (
          /* Tela de confirmação: dados opcionais antes de renovar */
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#111", marginBottom: 16 }}>
              🔄 Renovar acesso — confirme seus dados
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Nome (opcional)
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                E-mail (opcional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                style={inputStyle}
              />
            </div>

            {erro && (
              <div style={{ fontSize: 13, color: "#EF4444", marginBottom: 14, padding: "10px 14px", background: "rgba(239,68,68,0.07)", borderRadius: 8 }}>
                {erro}
              </div>
            )}

            <button
              onClick={() => responder("renovar")}
              disabled={salvando}
              style={{
                width: "100%", padding: "13px 20px", borderRadius: 10, border: "none",
                background: salvando ? "#9CA3AF" : "#1D4ED8", color: "#fff",
                fontSize: 15, fontWeight: 700, cursor: salvando ? "default" : "pointer",
                marginBottom: 10,
              }}
            >
              {salvando ? "Aguarde…" : "Continuar para o pagamento →"}
            </button>

            <button
              onClick={() => setTela("opcoes")}
              disabled={salvando}
              style={{
                width: "100%", padding: "11px 20px", borderRadius: 10,
                border: "1.5px solid #E5E7EB", background: "transparent",
                fontSize: 14, color: "#6B7280", cursor: "pointer",
              }}
            >
              ← Voltar
            </button>
          </div>
        )}
      </Wrap>
    );
  }

  return null;
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#F5F5F5", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px" }}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: "32px 28px",
        width: "100%", maxWidth: 480,
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
      }}>
        {children}
        <div style={{ marginTop: 28, textAlign: "center", fontSize: 12, color: "#bbb" }}>
          Powered by <strong style={{ color: "#999" }}>UseFokio</strong>
        </div>
      </div>
    </div>
  );
}
