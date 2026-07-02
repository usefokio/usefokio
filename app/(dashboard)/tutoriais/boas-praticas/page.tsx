"use client";

import { useEffect, useState } from "react";

type App = {
  id: string;
  nome: string;
  descricao: string | null;
  logo_url: string | null;
  link: string;
  categoria: string | null;
};

type Arquivo = {
  id: string;
  nome: string;
  descricao: string | null;
  arquivo_url: string;
  arquivo_nome: string | null;
};

export default function BoasPraticasPage() {
  const [apps,     setApps]     = useState<App[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);

  useEffect(() => {
    fetch("/api/apps-recomendados")
      .then((r) => r.json())
      .then((j) => setApps(j.apps ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
    fetch("/api/arquivos-download")
      .then((r) => r.json())
      .then((j) => setArquivos(j.arquivos ?? []))
      .catch(() => {});
  }, []);

  return (
    <div style={{ padding: "32px 32px 48px" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.02em", marginBottom: 4 }}>
          Boas Práticas
        </div>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
          Aplicativos e recursos que se encaixam no fluxo de trabalho do fotógrafo
        </div>
      </div>

      {/* Apps recomendados */}
      {loading ? (
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : apps.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Nenhum app recomendado ainda.</div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 16,
        }}>
          {apps.map((app) => (
            <a
              key={app.id}
              href={app.link}
              target="_blank"
              rel="noopener sponsored"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                padding: "18px 18px 16px",
                background: "var(--color-background-primary)",
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: 12,
                textDecoration: "none",
                transition: "border-color 0.15s, transform 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-border-secondary)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border-tertiary)"; e.currentTarget.style.transform = "none"; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {app.logo_url ? (
                  <img src={app.logo_url} alt={app.nome} width={44} height={44} style={{ borderRadius: 10, flexShrink: 0, display: "block" }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: "var(--color-background-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "var(--color-text-secondary)" }}>
                    {app.nome.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1.3 }}>
                    {app.nome}
                  </div>
                  {app.categoria && (
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 }}>
                      {app.categoria}
                    </div>
                  )}
                </div>
              </div>
              {app.descricao && (
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5, flex: 1 }}>
                  {app.descricao}
                </div>
              )}
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 12, fontWeight: 700, color: "#2563EB",
              }}>
                Acessar
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3h7v7M13 3L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Materiais para download */}
      <div style={{ marginTop: 40 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.01em", marginBottom: 4 }}>
          Materiais para download
        </div>
        <div style={{ fontSize: 12.5, color: "var(--color-text-secondary)", marginBottom: 16 }}>
          Presets, guias e outros arquivos para o seu fluxo de trabalho.
        </div>
        {arquivos.length === 0 ? (
          <div style={{
            display: "flex", alignItems: "center", gap: 14, padding: "18px 20px",
            background: "var(--color-background-primary)",
            border: "0.5px dashed var(--color-border-secondary)",
            borderRadius: 12,
          }}>
            <div style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>📎</div>
            <div style={{ flex: 1, fontSize: 12.5, color: "var(--color-text-secondary)" }}>
              Nenhum material disponível ainda — em breve.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {arquivos.map((a) => (
              <div key={a.id} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "16px 18px",
                background: "var(--color-background-primary)",
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: 12,
              }}>
                <div style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>📎</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--color-text-primary)" }}>{a.nome}</div>
                  {a.descricao && <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>{a.descricao}</div>}
                </div>
                <a
                  href={a.arquivo_url}
                  download={a.arquivo_nome ?? undefined}
                  target="_blank"
                  rel="noopener"
                  style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, padding: "8px 16px", borderRadius: 8, background: "#2563EB", color: "#fff", textDecoration: "none" }}
                >
                  Baixar
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
