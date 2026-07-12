"use client";

// Bloco "Depoimentos" — 3 layouts:
//  • lista_vertical: empilhado, com botão "Ver mais depoimentos" (revela os demais).
//  • horizontal: um por vez com setas laterais (sem barra de rolagem).
//  • grade: pagina de acordo com o nº de colunas, com setas (desabilitam nas pontas).
// Toggles independentes: foto, nome, depoimento.
import { useState } from "react";
import type { HomeBloco } from "@/lib/site/design";
import { gradPlaceholder } from "./placeholder";
import type { SiteDepoimento } from "@/lib/supabase/types";

function Card({ d, foto, nome, texto }: { d: SiteDepoimento; foto: boolean; nome: boolean; texto: boolean }) {
  return (
    <figure style={{ margin: 0, textAlign: "center", padding: "8px 16px" }}>
      {foto && (d.foto_url
        ? <img src={d.foto_url} alt={d.nome} style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", margin: "0 auto 16px", display: "block" }} />
        : <div style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto 16px", background: gradPlaceholder(d.id) }} />)}
      {texto && <blockquote style={{ margin: "0 0 16px", fontSize: 17, lineHeight: 1.7, color: "var(--site-texto)", fontStyle: "italic", fontFamily: "var(--site-fonte-corpo), Georgia, serif" }}>“{d.texto.length > 240 ? d.texto.slice(0, 240) + "…" : d.texto}”</blockquote>}
      {nome && <figcaption style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--site-suave)" }}>{d.nome}</figcaption>}
    </figure>
  );
}

export function BlocoDepoimentos({ config, depoimentos }: { config: HomeBloco; depoimentos: SiteDepoimento[] }) {
  const layout = (config.layout as string) ?? "lista_vertical";
  const foto = config.mostrar_foto !== false;
  const nome = config.mostrar_nome !== false;
  const texto = config.mostrar_texto !== false;
  if (depoimentos.length === 0) return null;

  return (
    <section style={{ background: "var(--site-superficie)", padding: "60px 24px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <h2 className="site-secao-titulo" style={{ fontSize: 30, textAlign: "center", margin: "0 0 40px" }}>Depoimentos</h2>
        {layout === "lista_vertical"
          ? <ListaVertical depoimentos={depoimentos} foto={foto} nome={nome} texto={texto} />
          : <Carrossel depoimentos={depoimentos} perPage={layout === "grade" ? (config.colunas ?? 3) : 1} grade={layout === "grade"} foto={foto} nome={nome} texto={texto} />}
      </div>
    </section>
  );
}

function ListaVertical({ depoimentos, foto, nome, texto }: { depoimentos: SiteDepoimento[]; foto: boolean; nome: boolean; texto: boolean }) {
  const [todos, setTodos] = useState(false);
  const LIM = 3;
  const lista = todos ? depoimentos : depoimentos.slice(0, LIM);
  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {lista.map((d) => <Card key={d.id} d={d} foto={foto} nome={nome} texto={texto} />)}
      </div>
      {depoimentos.length > LIM && !todos && (
        <div style={{ textAlign: "center", marginTop: 26 }}>
          <button onClick={() => setTodos(true)} style={{ background: "transparent", border: "1px solid var(--site-titulo)", color: "var(--site-titulo)", padding: "11px 32px", fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer" }}>Ver mais depoimentos</button>
        </div>
      )}
    </>
  );
}

function Carrossel({ depoimentos, perPage, grade, foto, nome, texto }: { depoimentos: SiteDepoimento[]; perPage: number; grade: boolean; foto: boolean; nome: boolean; texto: boolean }) {
  const [pg, setPg] = useState(0);
  const totalPg = Math.max(1, Math.ceil(depoimentos.length / perPage));
  const ini = pg * perPage;
  const janela = depoimentos.slice(ini, ini + perPage);
  const seta = (desab: boolean): React.CSSProperties => ({ width: 42, height: 42, borderRadius: "50%", border: "1px solid var(--site-borda)", background: "var(--site-fundo)", color: "var(--site-titulo)", fontSize: 20, cursor: desab ? "default" : "pointer", opacity: desab ? 0.3 : 1, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button aria-label="Anterior" onClick={() => setPg((p) => Math.max(0, p - 1))} disabled={pg === 0} style={seta(pg === 0)}>‹</button>
      <div style={{ flex: 1, minWidth: 0, display: "grid", gridTemplateColumns: grade ? `repeat(${perPage}, minmax(0, 1fr))` : "1fr", gap: 20 }}>
        {janela.map((d) => <Card key={d.id} d={d} foto={foto} nome={nome} texto={texto} />)}
      </div>
      <button aria-label="Próximo" onClick={() => setPg((p) => Math.min(totalPg - 1, p + 1))} disabled={pg >= totalPg - 1} style={seta(pg >= totalPg - 1)}>›</button>
    </div>
  );
}
