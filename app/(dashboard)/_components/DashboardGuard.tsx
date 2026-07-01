"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useFotografo } from "@/lib/context/FotografoContext";
import { createClient } from "@/lib/supabase/client";
import { DoacaoDev } from "./DoacaoDev";

const WEBMASTER_ID    = process.env.NEXT_PUBLIC_WEBMASTER_ID ?? "";
const WEBMASTER_EMAIL = "usefokio@gmail.com";
const TERMOS_VERSAO   = "beta-v1";

function ModalAceiteTermos({ onAceito }: { onAceito: () => void }) {
  const [loading, setLoading] = useState(false);

  async function aceitar() {
    setLoading(true);
    await fetch("/api/termos/aceitar", { method: "POST" });
    onAceito();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, fontFamily: "var(--font-sans)" }}>
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 16, padding: "32px 36px", width: 480, maxWidth: "calc(100vw - 32px)", boxShadow: "0 12px 48px rgba(0,0,0,0.22)" }}>
        <div style={{ fontSize: 22, marginBottom: 8 }}>📋</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--color-text-primary)", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
          Termos de Uso atualizados
        </h2>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.6, margin: "0 0 20px" }}>
          Para continuar usando o UseFokio, você precisa aceitar nossos Termos de Uso e Política de Privacidade.
        </p>

        <div style={{ background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: 10, padding: "16px 18px", marginBottom: 20, fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--color-text-primary)", display: "block", marginBottom: 8 }}>Resumo do que você está aceitando:</strong>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>Você é responsável pelo conteúdo que envia (fotos e dados de clientes)</li>
            <li>O sistema está em fase Beta e pode sofrer alterações</li>
            <li>Seus dados são tratados conforme a LGPD</li>
            <li>Não compartilhamos seus dados para fins comerciais</li>
          </ul>
        </div>

        <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 24 }}>
          Leia na íntegra:{" "}
          <a href="/termos" target="_blank" rel="noopener noreferrer" style={{ color: "#2563EB", fontWeight: 600, textDecoration: "none" }}>Termos de Uso</a>
          {" "}e{" "}
          <a href="/privacidade" target="_blank" rel="noopener noreferrer" style={{ color: "#2563EB", fontWeight: 600, textDecoration: "none" }}>Política de Privacidade</a>
        </div>

        <button
          onClick={aceitar}
          disabled={loading}
          style={{ width: "100%", padding: "13px", borderRadius: 9, background: loading ? "#93C5FD" : "#2563EB", color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? "Registrando…" : "Li e aceito os termos →"}
        </button>
      </div>
    </div>
  );
}

export function DashboardGuard({ children }: { children: React.ReactNode }) {
  const { fotografo, loading } = useFotografo();
  const router   = useRouter();
  const pathname = usePathname();
  const [termosVerificados, setTermosVerificados] = useState(() => {
    if (process.env.NODE_ENV === "development") return true;
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(`termos_${TERMOS_VERSAO}`) === "1";
  });
  const [precisaAceitar, setPrecisaAceitar] = useState(false);
  const [pagamentosDoacao, setPagamentosDoacao] = useState<string[]>([]);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") return;
    if (loading) return;

    if (!fotografo) {
      // Não chamar criar_perfil_fotografo aqui — o perfil é criado apenas no auth/callback
      // Chamar a RPC aqui sobrescrevia dados reais com fallbacks do user_metadata
      createClient().auth.getUser().then(({ data }) => {
        if (!data.user) { router.replace("/login"); return; }
        router.replace("/aguardando-aprovacao");
      });
      return;
    }

    const isWebmaster =
      (WEBMASTER_ID    && fotografo.id    === WEBMASTER_ID) ||
      (WEBMASTER_EMAIL && fotografo.email === WEBMASTER_EMAIL);
    if (isWebmaster) { router.replace("/webmaster"); return; }
    if (!fotografo.aprovado) { router.replace("/aguardando-aprovacao"); return; }

    // Redireciona para onboarding se ainda não concluiu a configuração inicial
    if (!fotografo.onboarding_concluido && pathname !== "/configurar") {
      router.replace("/configurar");
      return;
    }

    const sb = createClient();

    // Verifica se já aceitou a versão atual dos termos
    sb.from("aceites_termos")
      .select("id")
      .eq("usuario_id", fotografo.id)
      .eq("versao_termos", TERMOS_VERSAO)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) setPrecisaAceitar(true);
        sessionStorage.setItem(`termos_${TERMOS_VERSAO}`, "1");
        setTermosVerificados(true);
      });

    // Verifica pagamentos recebidos ainda não celebrados → popup de doação
    sb.from("pagamentos")
      .select("id")
      .eq("fotografo_id", fotografo.id)
      .eq("status", "pago")
      .eq("doacao_sugerida", false)
      .neq("tipo", "doacao")
      .then(({ data }) => {
        if (data && data.length > 0) setPagamentosDoacao(data.map((p) => p.id));
      });
  }, [fotografo, loading, router, pathname]);

  const spinStyle = { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background-tertiary)", fontFamily: "var(--font-sans)" } as const;

  if (loading || !termosVerificados) {
    return <div style={spinStyle}><div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div></div>;
  }

  const isWebmaster = (WEBMASTER_ID && fotografo?.id === WEBMASTER_ID) || (WEBMASTER_EMAIL && fotografo?.email === WEBMASTER_EMAIL);
  if (!fotografo || !fotografo.aprovado || isWebmaster) {
    return <div style={spinStyle}><div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Redirecionando…</div></div>;
  }

  async function fecharDoacao() {
    if (pagamentosDoacao.length > 0) {
      await fetch("/api/doacao/sugerida", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: pagamentosDoacao }),
      }).catch(() => {});
    }
    setPagamentosDoacao([]);
  }

  // Banner de vencimento do plano
  const agora = new Date();
  const planoExpirado = fotografo.plano !== "gratuito" && fotografo.plano !== "estudio" &&
    fotografo.plano_expira_em && new Date(fotografo.plano_expira_em) < agora;
  const diasParaExpirar = fotografo.plano !== "gratuito" && fotografo.plano !== "estudio" &&
    fotografo.plano_expira_em
    ? Math.ceil((new Date(fotografo.plano_expira_em).getTime() - agora.getTime()) / 86400000)
    : null;
  const vencendoEmBreve = diasParaExpirar !== null && diasParaExpirar > 0 && diasParaExpirar <= 7;

  return (
    <>
      {(planoExpirado || vencendoEmBreve) && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 150,
          background: planoExpirado ? "#EF4444" : "#F59E0B",
          color: "#fff", textAlign: "center", padding: "7px 16px",
          fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        }}>
          {planoExpirado
            ? "Seu plano expirou — uploads bloqueados."
            : `Seu plano vence em ${diasParaExpirar} dia${diasParaExpirar !== 1 ? "s" : ""}.`
          }
          <a href="/conta/plano" style={{ color: "#fff", textDecoration: "underline", fontWeight: 700 }}>
            {planoExpirado ? "Renovar agora" : "Renovar"}
          </a>
        </div>
      )}
      {children}
      {precisaAceitar && (
        <ModalAceiteTermos onAceito={() => setPrecisaAceitar(false)} />
      )}
      {pagamentosDoacao.length > 0 && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }} onClick={fecharDoacao}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 16, padding: "30px 30px", width: 440, maxWidth: "100%", boxShadow: "0 12px 48px rgba(0,0,0,0.25)" }}>
            <div style={{ fontSize: 36, marginBottom: 10, textAlign: "center" }}>🎉</div>
            <h3 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 800, color: "var(--color-text-primary)", textAlign: "center", letterSpacing: "-0.01em" }}>
              Você recebeu um novo pagamento!
            </h3>
            <p style={{ margin: "0 0 6px", fontSize: 12, color: "#7C3AED", textAlign: "center", fontWeight: 600 }}>
              Beta v0 · Desenvolvedor solo
            </p>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--color-text-secondary)", textAlign: "center", lineHeight: 1.6 }}>
              O UseFokio é feito por uma pessoa só, em fase beta. Cada doação mantém o projeto vivo e ajuda a lançar novas funcionalidades mais rápido.
            </p>
            <DoacaoDev compacto />
            <button onClick={fecharDoacao} style={{ display: "block", margin: "16px auto 0", background: "none", border: "none", fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer", textDecoration: "underline" }}>
              Agora não
            </button>
          </div>
        </div>
      )}
    </>
  );
}
