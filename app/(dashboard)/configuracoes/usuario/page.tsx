"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { Avatar } from "@/components/ui/Avatar";

// Configurações › Usuário › Meus dados — a PESSOA que acessa o sistema. Os dados do estúdio (nome da
// empresa, contato, endereço, redes, logo) ficam em Configurações › Empresa.

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", padding: "11px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
      <span style={{ fontSize: 13, color: "var(--color-text-secondary)", width: 160, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
      <div style={{ padding: "10px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

export default function MeusDadosPage() {
  const { fotografo, loading } = useFotografo();
  const [emailAcesso, setEmailAcesso] = useState<string | null>(null);

  // E-mail de acesso = o do login (Supabase Auth). Em dev não há login → mostra o da conta.
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setEmailAcesso(data.user?.email ?? null));
  }, []);

  if (loading) return <div style={{ padding: "40px 30px", color: "var(--color-text-secondary)", fontSize: 13 }}>Carregando…</div>;
  if (!fotografo) return <div style={{ padding: "40px 30px", color: "var(--color-text-secondary)", fontSize: 13 }}>Perfil não encontrado.</div>;

  const initials = fotografo.nome_completo.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  const email = emailAcesso ?? fotografo.email;

  return (
    <div style={{ padding: "26px 30px", maxWidth: 680 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 3px", letterSpacing: "-0.02em" }}>Meus dados</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>Quem acessa o sistema</p>
        </div>
        <Link href="/configuracoes/usuario/editar"
          style={{ padding: "8px 18px", borderRadius: 8, background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
          ✏️ Editar dados
        </Link>
      </div>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "20px 22px", marginBottom: 12, display: "flex", alignItems: "center", gap: 16 }}>
        <Avatar initials={initials} size={54} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.01em" }}>{fotografo.nome_completo}</div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>{email}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: fotografo.plano === "gratuito" ? "rgba(107,114,128,0.1)" : "rgba(37,99,235,0.08)", fontSize: 11, fontWeight: 700, color: fotografo.plano === "gratuito" ? "var(--color-text-secondary)" : "#2563EB", textTransform: "capitalize" }}>
            {fotografo.plano === "gratuito" ? "🆓" : "⭐"} Plano {fotografo.plano}
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 6 }}>
            Desde {new Date(fotografo.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </div>
        </div>
      </div>

      <Section title="Acesso">
        <Row label="Nome completo" value={fotografo.nome_completo} />
        <Row label="E-mail de acesso" value={email} />
      </Section>

      <Section title="Preferências">
        <div style={{ padding: "11px 20px" }}>
          <span style={{ fontSize: 13, color: fotografo.aceita_emails ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>
            {fotografo.aceita_emails ? "✅ Recebe novidades e ofertas por email" : "❌ Não recebe emails de marketing"}
          </span>
        </div>
      </Section>

      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
        Nome da empresa, contato, endereço, redes sociais e logo ficam em{" "}
        <Link href="/configuracoes/empresa" style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>Configurações › Empresa</Link>.
      </div>
    </div>
  );
}
