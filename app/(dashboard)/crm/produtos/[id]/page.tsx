"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CrmProduct } from "@/lib/supabase/types";
import { FormProduto } from "../_components/FormProduto";

export default function EditarProdutoPage() {
  const { id }                      = useParams<{ id: string }>();
  const [produto, setProduto]       = useState<CrmProduct | null>(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    createClient()
      .from("crm_products")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => { setProduto(data as CrmProduct); setLoading(false); });
  }, [id]);

  if (loading) return <div style={{ padding: 32, fontSize: 13, color: "var(--color-text-secondary)", fontFamily: "var(--font-sans)" }}>Carregando…</div>;
  if (!produto) return <div style={{ padding: 32, fontSize: 13, color: "#EF4444", fontFamily: "var(--font-sans)" }}>Produto não encontrado.</div>;

  return <FormProduto produto={produto} />;
}
