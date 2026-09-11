"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Tipos de contato configuráveis (Config. CRM → Tipos de Contato; tabela crm_contato_tipos).
// clientes.tipo_contato guarda a `chave`. "cliente" e "oportunidade" são FIXOS: a regra automática
// do banco (Oportunidade vira Cliente ao ganhar pedido/conta recebida) depende deles.

export type TipoContato = { chave: string; label: string; cor: string; ordem: number; ativo: boolean };
export type EstiloTipo = { label: string; color: string; bg: string };

export const TIPOS_CONTATO_FIXOS = ["cliente", "oportunidade"];

export const TIPOS_CONTATO_PADRAO: TipoContato[] = [
  { chave: "cliente",      label: "Cliente",      cor: "#2563EB", ordem: 0, ativo: true },
  { chave: "oportunidade", label: "Oportunidade", cor: "#D97706", ordem: 1, ativo: true },
  { chave: "fornecedor",   label: "Fornecedor",   cor: "#7C3AED", ordem: 2, ativo: true },
  { chave: "parceiro",     label: "Parceiro",     cor: "#059669", ordem: 3, ativo: true },
  { chave: "fotografo",    label: "Fotógrafo",    cor: "#0891B2", ordem: 4, ativo: true },
  { chave: "videografo",   label: "Videógrafo",   cor: "#DB2777", ordem: 5, ativo: true },
];

const COR_PADRAO = "#6B7280";

export function estiloDoTipo(t: Pick<TipoContato, "label" | "cor">): EstiloTipo {
  const cor = /^#[0-9a-fA-F]{6}$/.test(t.cor) ? t.cor : COR_PADRAO;
  return { label: t.label, color: cor, bg: `${cor}14` };
}

/** Tipos do fotógrafo (todos, na ordem da config). Sem nada cadastrado → a lista padrão. */
export function useTiposContato(fotografoId: string | null | undefined) {
  const [tipos, setTipos] = useState<TipoContato[]>(TIPOS_CONTATO_PADRAO);

  useEffect(() => {
    if (!fotografoId) return;
    let cancelado = false;
    createClient().from("crm_contato_tipos").select("chave, label, cor, ordem, ativo")
      .eq("fotografo_id", fotografoId).order("ordem")
      .then(({ data, error }) => {
        if (cancelado || error || !data || data.length === 0) return;
        setTipos((data as { chave: string; label: string; cor: string | null; ordem: number; ativo: boolean }[])
          .map(t => ({ ...t, cor: t.cor ?? COR_PADRAO })));
      });
    return () => { cancelado = true; };
  }, [fotografoId]);

  const mapa = useMemo(
    () => Object.fromEntries(tipos.map(t => [t.chave, estiloDoTipo(t)])) as Record<string, EstiloTipo>,
    [tipos],
  );

  /** Opções de um select: os tipos ativos + o valor atual (se estiver desativado, continua aparecendo). */
  const opcoes = (atual?: string | null) =>
    tipos.filter(t => t.ativo || t.chave === atual);

  /** Estilo de uma chave; chave desconhecida vira um selo cinza com o próprio texto. */
  const estilo = (chave: string | null | undefined): EstiloTipo =>
    (chave && mapa[chave]) || { label: chave ?? "—", color: COR_PADRAO, bg: `${COR_PADRAO}14` };

  return { tipos, mapa, opcoes, estilo };
}
