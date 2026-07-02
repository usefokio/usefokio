"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Tutorial = {
  id: string;
  titulo: string;
  url_youtube: string;
  descricao: string | null;
  ordem: number;
  categoria: string;
};

function youtubeEmbedUrl(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

function TutoriaisConteudo() {
  const searchParams = useSearchParams();
  const cat = searchParams.get("cat") === "crm" ? "crm" : "usefokio";

  const [tutoriais, setTutoriais] = useState<Tutorial[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    fetch("/api/tutoriais")
      .then((r) => r.json())
      .then((j) => setTutoriais(j.tutoriais ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const lista = tutoriais.filter((t) => (t.categoria ?? "usefokio") === cat);
  const titulo = cat === "crm" ? "Tutoriais — CRM" : "Tutoriais — UseFokio";
  const subtitulo = cat === "crm"
    ? "Vídeos sobre o módulo de CRM (agenda, oportunidades, pedidos, financeiro)"
    : "Vídeos explicativos sobre como usar o UseFokio";

  return (
    <div style={{ padding: "32px 32px 48px" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.02em", marginBottom: 4 }}>
          {titulo}
        </div>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
          {subtitulo}
        </div>
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : lista.length === 0 ? (
        <div style={{
          padding: "48px 32px",
          textAlign: "center",
          background: "var(--color-background-primary)",
          borderRadius: 12,
          border: "0.5px solid var(--color-border-tertiary)",
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🎬</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>Nenhum tutorial disponível ainda</div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Em breve teremos vídeos explicativos aqui.</div>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
          gap: 24,
        }}>
          {lista.map((t) => {
            const embedUrl = youtubeEmbedUrl(t.url_youtube);
            return (
              <div key={t.id} style={{
                background: "var(--color-background-primary)",
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: 12,
                overflow: "hidden",
              }}>
                {embedUrl ? (
                  <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
                    <iframe
                      src={embedUrl}
                      title={t.titulo}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      style={{
                        position: "absolute",
                        top: 0, left: 0,
                        width: "100%", height: "100%",
                        border: "none",
                      }}
                    />
                  </div>
                ) : (
                  <div style={{
                    height: 200,
                    background: "var(--color-background-secondary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    color: "var(--color-text-secondary)",
                  }}>
                    URL inválida
                  </div>
                )}
                <div style={{ padding: "16px 18px" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: t.descricao ? 6 : 0, lineHeight: 1.4 }}>
                    {t.titulo}
                  </div>
                  {t.descricao && (
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                      {t.descricao}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TutoriaisPage() {
  return (
    <Suspense fallback={<div style={{ padding: 32, fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>}>
      <TutoriaisConteudo />
    </Suspense>
  );
}
