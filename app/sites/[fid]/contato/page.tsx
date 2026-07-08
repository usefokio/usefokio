// Página de contato: texto editável (Páginas → contato) + formulário de orçamento.
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { ContatoForm } from "../_components/ContatoForm";
import type { SitePagina } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Solicite seu orçamento" };

export default async function ContatoPage({ params }: { params: Promise<{ fid: string }> }) {
  const { fid } = await params;
  const admin = createAdminClient();
  const { data } = await admin.from("site_paginas").select("*").eq("fotografo_id", fid).eq("slug", "contato").maybeSingle();
  const conteudo = ((data as SitePagina | null)?.conteudo ?? {}) as { html?: string | null };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, textAlign: "center", margin: "0 0 10px" }}>Solicite seu orçamento</h1>
      {conteudo.html ? (
        <div style={{ fontSize: 14, color: "#555", lineHeight: 1.8, margin: "0 0 28px" }} dangerouslySetInnerHTML={{ __html: conteudo.html }} />
      ) : (
        <p style={{ textAlign: "center", fontSize: 14, color: "#777", margin: "0 0 32px", lineHeight: 1.7 }}>
          Conte um pouco sobre o seu evento — data, cidade e o que você está planejando. Retorno o mais rápido possível!
        </p>
      )}
      <ContatoForm fid={fid} />
    </div>
  );
}
