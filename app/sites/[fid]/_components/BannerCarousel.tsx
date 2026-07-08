"use client";

// Carrossel de banners da home: rotaciona sozinho; slide clicável quando o banner tem link.
import { useEffect, useState } from "react";

type Banner = { id: string; imagem_url: string; titulo: string | null; link: string | null };

export function BannerCarousel({ banners, basePath }: { banners: Banner[]; basePath: string }) {
  const [atual, setAtual] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => setAtual((a) => (a + 1) % banners.length), 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) return null;

  const resolverLink = (link: string) => (link.startsWith("/") ? `${basePath}${link}` : link);

  return (
    <section data-site-hero style={{ position: "relative", height: "56vh", maxHeight: 560, overflow: "hidden", background: "#111" }}>
      {banners.map((b, i) => {
        const img = (
          <img
            src={b.imagem_url}
            alt={b.titulo ?? ""}
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
              opacity: i === atual ? 1 : 0, transition: "opacity 0.9s ease",
              pointerEvents: i === atual ? "auto" : "none",
            }}
          />
        );
        return b.link ? (
          <a key={b.id} href={resolverLink(b.link)} aria-label={b.titulo ?? "Ver trabalho"} style={{ cursor: "pointer" }}>
            {img}
          </a>
        ) : (
          <div key={b.id}>{img}</div>
        );
      })}
      {banners.length > 1 && (
        <div style={{ position: "absolute", bottom: 14, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 7, zIndex: 2 }}>
          {banners.map((b, i) => (
            <button
              key={b.id}
              onClick={() => setAtual(i)}
              aria-label={`Banner ${i + 1}`}
              style={{
                width: 9, height: 9, borderRadius: "50%", border: "none", cursor: "pointer", padding: 0,
                background: i === atual ? "#fff" : "rgba(255,255,255,0.45)",
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
