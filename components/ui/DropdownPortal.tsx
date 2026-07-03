"use client";

// Dropdown de busca renderizado em portal (document.body) com position: fixed
// posicionado pelo retângulo do input — nunca é cortado por container com overflow: hidden.
// Padrão do sistema para campos de busca (ClienteSelect, ComboSelect, ProdutoSearch).
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Pos = { left: number; top: number; width: number };

export function DropdownPortal({
  anchorRef,
  open,
  onClose,
  children,
  maxHeight = 260,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: number;
}) {
  const [pos, setPos] = useState<Pos | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Posiciona (e reposiciona em scroll/resize) a partir do retângulo do anchor
  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    const recalcular = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({ left: r.left, top: r.bottom + 4, width: r.width });
    };
    recalcular();
    window.addEventListener("scroll", recalcular, true);
    window.addEventListener("resize", recalcular);
    return () => {
      window.removeEventListener("scroll", recalcular, true);
      window.removeEventListener("resize", recalcular);
    };
  }, [open, anchorRef]);

  // Fecha ao clicar fora do anchor e do próprio dropdown
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t)) return;
      if (boxRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, anchorRef, onClose]);

  if (!open || !pos || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={boxRef}
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        width: pos.width,
        zIndex: 1000,
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-secondary)",
        borderRadius: 10,
        boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
        maxHeight,
        overflowY: "auto",
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
