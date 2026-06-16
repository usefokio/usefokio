"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { FormOportunidade } from "../_components/FormOportunidade";
import type { CrmOpportunity } from "@/lib/supabase/types";

type OportunidadeCompleta = CrmOpportunity & {
  clientes?: { id: string; nome: string; email: string | null } | null;
  crm_funnel_stages?: { id: string; nome: string; cor: string; ordem: number } | null;
  campos_extras?: { chave: string; valor: string | null }[];
};

export default function EditarOportunidadePage({ params }: { params: { id: string } }) {
  const { fotografo } = useFotografo();
  const supabase = createClient();
  const [oportunidade, setOportunidade] = useState<OportunidadeCompleta | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!fotografo) return;
    Promise.all([
      supabase
        .from("crm_opportunities")
        .select("*, clientes(id, nome, email), crm_funnel_stages(id, nome, cor, ordem)")
        .eq("id", params.id)
        .eq("fotografo_id", fotografo.id)
        .single(),
      supabase
        .from("crm_opportunity_fields")
        .select("chave, valor")
        .eq("oportunidade_id", params.id),
    ]).then(([{ data: op }, { data: campos }]) => {
      if (op) {
        setOportunidade({
          ...(op as OportunidadeCompleta),
          campos_extras: campos ?? [],
        });
      }
      setCarregando(false);
    });
  }, [fotografo, params.id]);

  if (carregando) {
    return (
      <div style={{ padding: "28px 32px", fontFamily: "var(--font-sans)", color: "var(--color-text-secondary)", fontSize: 13 }}>
        Carregando…
      </div>
    );
  }

  if (!oportunidade) {
    return (
      <div style={{ padding: "28px 32px", fontFamily: "var(--font-sans)", color: "var(--color-text-secondary)", fontSize: 13 }}>
        Oportunidade não encontrada.
      </div>
    );
  }

  return <FormOportunidade oportunidade={oportunidade} />;
}
