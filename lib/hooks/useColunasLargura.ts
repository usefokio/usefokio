"use client";

import { useRef, useState, useCallback } from "react";
import { usePersistState } from "@/lib/hooks/usePersistState";

// Colunas de grade redimensionáveis (clica-e-arrasta a borda do cabeçalho).
// Usado nas listagens em CSS grid (oportunidades, pedidos, financeiro, recebimentos): a largura
// vira um `gridTemplateColumns`. As larguras ficam salvas por navegador (localStorage) via
// usePersistState, sob a chave `${chave}:colWidths`.

export type ColunaDef = {
  id: string;
  largura: number;      // largura padrão em px
  min?: number;         // largura mínima ao arrastar (default 60)
  flex?: boolean;       // coluna elástica: vira minmax(min, fr) e não é redimensionável
  fr?: number;          // peso da coluna elástica (default 1) — ex.: 1.4fr
};

const MIN_PADRAO = 60;

export function useColunasLargura(chave: string, defs: ColunaDef[]) {
  const [larguras, setLarguras] = usePersistState<Record<string, number>>(`${chave}:colWidths`, {});
  const [arrastando, setArrastando] = useState<string | null>(null);
  const arrasto = useRef<{ id: string; startX: number; startW: number; min: number } | null>(null);

  // gridTemplateColumns final: flex → minmax(min, fr); demais → px (persistido ou padrão).
  const template = defs
    .map((d) => {
      if (d.flex) return `minmax(${d.min ?? 200}px, ${d.fr ?? 1}fr)`;
      const w = larguras[d.id] ?? d.largura;
      return `${Math.round(w)}px`;
    })
    .join(" ");

  const iniciarResize = useCallback((id: string, e: React.MouseEvent) => {
    const def = defs.find((d) => d.id === id);
    if (!def || def.flex) return;
    e.preventDefault();
    e.stopPropagation();
    const startW = larguras[id] ?? def.largura;
    arrasto.current = { id, startX: e.clientX, startW, min: def.min ?? MIN_PADRAO };
    setArrastando(id);

    const onMove = (ev: MouseEvent) => {
      const a = arrasto.current;
      if (!a) return;
      const w = Math.max(a.min, a.startW + (ev.clientX - a.startX));
      setLarguras((prev) => ({ ...prev, [a.id]: w }));
    };
    const onUp = () => {
      arrasto.current = null;
      setArrastando(null);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [defs, larguras, setLarguras]);

  // Duplo-clique no divisor → volta a coluna ao padrão.
  const resetar = useCallback((id: string) => {
    setLarguras((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, [setLarguras]);

  // Props prontas para o <ResizeHandle> de uma coluna (inclui o destaque durante o arrasto).
  const handleProps = useCallback((id: string) => ({
    onResize: (e: React.MouseEvent) => iniciarResize(id, e),
    onReset: () => resetar(id),
    ativo: arrastando === id,
  }), [iniciarResize, resetar, arrastando]);

  return { template, iniciarResize, resetar, handleProps, arrastando };
}
