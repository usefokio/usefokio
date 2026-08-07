"use client";

import { useEffect, useState } from "react";
import { useFotografo } from "@/lib/context/FotografoContext";

// Uso real do plano (fotos + armazenamento) — sempre via /api/conta/uso, que já aplica
// limiteEfetivoMax (planos_config + override do fotógrafo, vale o maior dos dois). Fonte única
// pra qualquer tela que precise mostrar/checar o limite — nunca montar isso na mão com o objeto
// PLANOS fixo de lib/planos.ts, que ignora o override e já causou o mesmo bug em 3 telas.
export type UsoPlano = {
  fotos_usadas: number;
  limite_fotos: number | null;
  bytes_usados: number;
  limite_gb: number | null;
};

export function useUsoPlano(): UsoPlano | null {
  const { fotografo } = useFotografo();
  const [uso, setUso] = useState<UsoPlano | null>(null);

  useEffect(() => {
    if (!fotografo) return;
    fetch("/api/conta/uso")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j && typeof j.bytes_usados === "number") setUso(j); })
      .catch(() => {});
  }, [fotografo?.id]);

  return uso;
}
