"use client";

// Widget de avaliações do Google (reproduz o do Alboom): faixa "Google Rating" + nota + total +
// botão "Escrever avaliação" + cards (avatar, nome, estrelas, texto com "Ler mais").
import { useState } from "react";
import type { GoogleReviewsResumo } from "@/lib/supabase/types";
import { urlEscreverAvaliacao } from "@/lib/google/places";

function Estrelas({ nota, tamanho = 15 }: { nota: number; tamanho?: number }) {
  const cheias = Math.round(nota);
  return (
    <span style={{ color: "#f5b400", fontSize: tamanho, letterSpacing: "1px" }} aria-label={`${nota} de 5`}>
      {"★".repeat(cheias)}<span style={{ color: "#d9d4cc" }}>{"★".repeat(5 - cheias)}</span>
    </span>
  );
}

function CardReview({ autor, foto, nota, texto }: { autor: string; foto: string | null; nota: number; texto: string }) {
  const [aberto, setAberto] = useState(false);
  const longo = texto.length > 160;
  const exibido = aberto || !longo ? texto : texto.slice(0, 160).trimEnd() + "…";
  const inicial = autor.trim().charAt(0).toUpperCase();
  return (
    <div className="lp-review" style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
      {foto
        ? <img src={foto} alt={autor} width={54} height={54} style={{ width: 54, height: 54, borderRadius: "50%", objectFit: "cover", marginBottom: 10 }} referrerPolicy="no-referrer" />
        : <div style={{ width: 54, height: 54, borderRadius: "50%", background: "#5E6E5F", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 10 }}>{inicial}</div>}
      <div style={{ fontWeight: 700, fontSize: 15, color: "var(--site-titulo)", marginBottom: 4 }}>{autor}</div>
      <Estrelas nota={nota} />
      <div className="lp-review-texto" style={{ marginTop: 10 }}>{exibido}</div>
      {longo && (
        <button onClick={() => setAberto((v) => !v)} style={{ marginTop: 8, border: "none", background: "transparent", color: "#5E6E5F", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
          {aberto ? "Ler menos" : "Ler mais"}
        </button>
      )}
    </div>
  );
}

export function GoogleReviews({ dados }: { dados: GoogleReviewsResumo }) {
  const { rating, total, place_id, reviews } = dados;
  const escrever = place_id ? urlEscreverAvaliacao(place_id) : null;

  return (
    <div>
      {/* Faixa Google Rating */}
      <div className="gr-faixa">
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>
            <span style={{ color: "#4285F4" }}>G</span><span style={{ color: "#EA4335" }}>o</span><span style={{ color: "#FBBC05" }}>o</span><span style={{ color: "#4285F4" }}>g</span><span style={{ color: "#34A853" }}>l</span><span style={{ color: "#EA4335" }}>e</span>
            <span style={{ color: "var(--site-suave)", fontWeight: 500, marginLeft: 8 }}>Rating</span>
          </span>
          {rating != null && (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <strong style={{ fontSize: 18, color: "var(--site-titulo)" }}>{rating.toFixed(1).replace(".", ",")}</strong>
              <Estrelas nota={rating} tamanho={17} />
              {total != null && <span style={{ fontSize: 14, color: "var(--site-suave)" }}>{total} avaliações</span>}
            </span>
          )}
        </div>
        {escrever && (
          <a href={escrever} target="_blank" rel="noopener noreferrer" className="gr-botao">Escrever avaliação</a>
        )}
      </div>

      {/* Cards */}
      {reviews.length > 0 && (
        <div className="lp-reviews" style={{ marginTop: 20 }}>
          {reviews.slice(0, 5).map((r, i) => (
            <CardReview key={i} autor={r.autor} foto={r.foto} nota={r.nota} texto={r.texto} />
          ))}
        </div>
      )}
    </div>
  );
}
