"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Cliente } from "@/lib/supabase/types";

function initials(nome: string) {
  return nome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function avatarColor(nome: string) {
  const colors = ["#2563EB","#7C3AED","#DB2777","#059669","#D97706","#DC2626","#0891B2"];
  return colors[nome.charCodeAt(0) % colors.length];
}

export default function ClientesPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading]   = useState(true);
  const [busca, setBusca]       = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("nome");
      if (!error) setClientes(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const filtrados = clientes.filter((c) =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (c.email ?? "").toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div style={{ padding: "26px 30px", maxWidth: 900 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 3px", letterSpacing: "-0.02em" }}>
            Clientes
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
            {loading ? "Carregando…" : `${clientes.length} cliente${clientes.length !== 1 ? "s" : ""} cadastrado${clientes.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link
          href="/clientes/novo"
          style={{
            padding: "9px 18px", borderRadius: 8,
            background: "var(--color-text-primary)",
            color: "var(--color-background-primary)",
            fontSize: 13, fontWeight: 600,
            textDecoration: "none",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          + Novo cliente
        </Link>
      </div>

      {/* Busca */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: 9, padding: "8px 12px", marginBottom: 16,
      }}>
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.4, flexShrink: 0 }}>
          <circle cx="6" cy="6" r="4" stroke="var(--color-text-primary)" strokeWidth="1.3"/>
          <path d="M9.5 9.5L12 12" stroke="var(--color-text-primary)" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou email…"
          style={{ flex: 1, border: "none", background: "transparent", fontSize: 13, color: "var(--color-text-primary)", outline: "none" }}
        />
        {busca && (
          <button onClick={() => setBusca("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : filtrados.length === 0 ? (
        <div style={{
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: 12, padding: "52px 24px", textAlign: "center",
        }}>
          {clientes.length === 0 ? (
            <>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>Nenhum cliente ainda</div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 22 }}>Cadastre seu primeiro cliente para começar a criar galerias.</div>
              <Link href="/clientes/novo" style={{ padding: "10px 22px", borderRadius: 8, background: "#2563EB", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                + Cadastrar cliente
              </Link>
            </>
          ) : (
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
              Nenhum resultado para "<strong>{busca}</strong>"
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
          {/* Cabeçalho */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 200px 150px 60px",
            padding: "8px 18px",
            borderBottom: "0.5px solid var(--color-border-tertiary)",
            background: "var(--color-background-secondary)",
          }}>
            {["Cliente", "Email", "Telefone", ""].map((h) => (
              <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</span>
            ))}
          </div>

          {filtrados.map((c, i) => (
            <div
              key={c.id}
              onClick={() => router.push(`/clientes/${c.id}`)}
              style={{
                display: "grid", gridTemplateColumns: "1fr 200px 150px 60px",
                padding: "12px 18px",
                borderBottom: i < filtrados.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none",
                cursor: "pointer", transition: "background 0.1s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-background-secondary)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: avatarColor(c.nome),
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0,
                }}>
                  {initials(c.nome)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{c.nome}</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 1 }}>
                    desde {new Date(c.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.email ?? "—"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{c.telefone ?? "—"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                <span style={{ fontSize: 12, color: "#2563EB", fontWeight: 500 }}>Ver →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
