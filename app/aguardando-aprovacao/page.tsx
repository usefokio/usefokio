"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AguardandoAprovacaoPage() {
  const router = useRouter();

  async function sair() {
    await createClient().auth.signOut();
    router.push("/login");
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "var(--color-background-tertiary)",
      fontFamily: "var(--font-sans)", padding: "32px 24px",
    }}>
      {/* Logo */}
      <img src="/usefokio-logo.svg" alt="UseFokio" style={{ height: 28, marginBottom: 40 }} />

      {/* Card */}
      <div style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: 16, padding: "40px 48px",
        maxWidth: 460, width: "100%",
        textAlign: "center",
        boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
      }}>
        {/* Ícone */}
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: "rgba(245,158,11,0.1)",
          border: "1.5px solid rgba(245,158,11,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28, margin: "0 auto 24px",
        }}>
          ⏳
        </div>

        <h1 style={{
          fontSize: 20, fontWeight: 700,
          color: "var(--color-text-primary)",
          margin: "0 0 12px", letterSpacing: "-0.02em",
        }}>
          Cadastro recebido!
        </h1>

        <p style={{
          fontSize: 14, color: "var(--color-text-secondary)",
          lineHeight: 1.7, margin: "0 0 8px",
        }}>
          Seu acesso ao <strong>UseFokio</strong> está sendo analisado.
        </p>

        <p style={{
          fontSize: 14, color: "var(--color-text-secondary)",
          lineHeight: 1.7, margin: "0 0 32px",
        }}>
          Você receberá um e-mail assim que sua conta for aprovada. O processo normalmente leva até <strong>24 horas</strong>.
        </p>

        {/* Info box */}
        <div style={{
          background: "rgba(37,99,235,0.05)",
          border: "0.5px solid rgba(37,99,235,0.15)",
          borderRadius: 10, padding: "14px 18px",
          fontSize: 13, color: "var(--color-text-secondary)",
          lineHeight: 1.6, marginBottom: 32, textAlign: "left",
        }}>
          🧪 <strong>Sistema em fase beta</strong> — o acesso é liberado manualmente para garantir a qualidade da experiência para todos os fotógrafos.
        </div>

        <button
          onClick={sair}
          style={{
            width: "100%", padding: "11px",
            borderRadius: 9, background: "var(--color-text-primary)",
            color: "var(--color-background-primary)", border: "none",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          Sair da conta
        </button>

        <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 16 }}>
          Dúvidas?{" "}
          <a href="mailto:suporte@usefokio.com.br" style={{ color: "#2563EB", textDecoration: "none", fontWeight: 500 }}>
            suporte@usefokio.com.br
          </a>
        </p>
      </div>
    </div>
  );
}
