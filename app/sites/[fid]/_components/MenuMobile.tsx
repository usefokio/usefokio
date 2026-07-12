"use client";

// Menu "hambúrguer" do header no mobile (aberto por container-query no header).
import { useState } from "react";
import Link from "next/link";

type Item = { id: string; label: string; href: string };

export function MenuMobile({ base, itens, cor }: { base: string; itens: Item[]; cor: string }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button aria-label="Menu" onClick={() => setAberto((a) => !a)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 8, color: cor, fontSize: 24, lineHeight: 1 }}>☰</button>
      {aberto && (
        <>
          <div onClick={() => setAberto(false)} style={{ position: "fixed", inset: 0, zIndex: 60 }} />
          <nav style={{ position: "absolute", right: 0, top: "100%", zIndex: 61, background: "var(--site-fundo)", border: "1px solid var(--site-borda)", borderRadius: 8, boxShadow: "0 12px 40px rgba(0,0,0,0.18)", minWidth: 210, padding: "6px 0", display: "flex", flexDirection: "column" }}>
            {itens.map((it) => (
              <Link key={it.id} href={it.href === "/" ? (base || "/") : `${base}${it.href}`} onClick={() => setAberto(false)}
                style={{ padding: "11px 18px", fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase", color: cor, textDecoration: "none" }}>
                {it.label}
              </Link>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}
