"use client";

import Link from "next/link";
import { useFotografo } from "@/lib/context/FotografoContext";
import { Avatar } from "@/components/ui/Avatar";

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", padding: "11px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
      <span style={{ fontSize: 13, color: "var(--color-text-secondary)", width: 140, flexShrink: 0 }}>{label}</span>
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

export default function ContaPage() {
  const { fotografo, loading } = useFotografo();

  if (loading) return (
    <div style={{ padding: "40px 30px", color: "var(--color-text-secondary)", fontSize: 13 }}>Carregando…</div>
  );

  if (!fotografo) return (
    <div style={{ padding: "40px 30px", color: "var(--color-text-secondary)", fontSize: 13 }}>Perfil não encontrado.</div>
  );

  const initials = fotografo.nome_completo
    .split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  const endereco = [
    fotografo.rua && `${fotografo.rua}${fotografo.numero ? `, ${fotografo.numero}` : ""}${fotografo.complemento ? ` – ${fotografo.complemento}` : ""}`,
    fotografo.bairro,
    fotografo.cidade && fotografo.estado ? `${fotografo.cidade} – ${fotografo.estado}` : (fotografo.cidade || fotografo.estado),
    fotografo.cep,
  ].filter(Boolean).join("\n");

  return (
    <div style={{ padding: "26px 30px", maxWidth: 680 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 3px", letterSpacing: "-0.02em" }}>Minha conta</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>Seus dados cadastrais</p>
        </div>
        <Link
          href="/conta/editar"
          style={{ padding: "8px 18px", borderRadius: 8, background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}
        >
          ✏️ Editar dados
        </Link>
      </div>

      {/* Perfil card */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "20px 22px", marginBottom: 12, display: "flex", alignItems: "center", gap: 16 }}>
        <Avatar initials={initials} size={54} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.01em" }}>{fotografo.nome_completo}</div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>{fotografo.nome_empresa}</div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>{fotografo.email}</div>
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

      {/* Contato */}
      <Section title="Contato">
        <Row label="Telefone"   value={fotografo.telefone} />
        <Row label="WhatsApp"   value={fotografo.whatsapp} />
        <Row label="E-mail"     value={fotografo.email} />
      </Section>

      {/* Endereço — só mostra se tiver algum dado */}
      {(fotografo.rua || fotografo.cidade || fotografo.cep) && (
        <Section title="Endereço">
          {fotografo.cep   && <Row label="CEP"         value={fotografo.cep} />}
          {fotografo.rua   && (
            <Row
              label="Rua"
              value={[fotografo.rua, fotografo.numero, fotografo.complemento].filter(Boolean).join(", ")}
            />
          )}
          {fotografo.bairro && <Row label="Bairro"      value={fotografo.bairro} />}
          {(fotografo.cidade || fotografo.estado) && (
            <Row label="Cidade / UF" value={[fotografo.cidade, fotografo.estado].filter(Boolean).join(" – ")} />
          )}
        </Section>
      )}

      {/* Redes sociais — só mostra se tiver algum */}
      {(fotografo.instagram || fotografo.facebook || fotografo.tiktok || fotografo.youtube || fotografo.site) && (
        <Section title="Redes sociais">
          {fotografo.instagram && <Row label="Instagram" value={`@${fotografo.instagram}`} />}
          {fotografo.facebook  && <Row label="Facebook"  value={`@${fotografo.facebook}`}  />}
          {fotografo.tiktok    && <Row label="TikTok"    value={`@${fotografo.tiktok}`}    />}
          {fotografo.youtube   && <Row label="YouTube"   value={`@${fotografo.youtube}`}   />}
          {fotografo.site      && <Row label="Site"      value={fotografo.site}             />}
        </Section>
      )}

      {/* Preferências */}
      <Section title="Preferências">
        <div style={{ padding: "11px 20px" }}>
          <span style={{ fontSize: 13, color: fotografo.aceita_emails ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>
            {fotografo.aceita_emails ? "✅ Recebe novidades e ofertas por email" : "❌ Não recebe emails de marketing"}
          </span>
        </div>
      </Section>

    </div>
  );
}
