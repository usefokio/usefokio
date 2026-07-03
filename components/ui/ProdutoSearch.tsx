"use client";

// Busca de produto reutilizável (input + dropdown via portal). Padrão do sistema:
// filtra enquanto digita e tem navegação por teclado (setas / Enter / Esc).
import { useEffect, useRef, useState } from "react";
import { inputStyle } from "@/lib/styles";
import { formatBRL } from "@/lib/utils/format";
import { normalizar } from "@/lib/utils/normalizar";
import type { CrmProduct } from "@/lib/supabase/types";
import { DropdownPortal } from "./DropdownPortal";

export function ProdutoSearch({
  produtos,
  onSelect,
  placeholder = "Buscar e adicionar produto do catálogo…",
}: {
  produtos: CrmProduct[];
  onSelect: (p: CrmProduct) => void;
  placeholder?: string;
}) {
  const [busca,  setBusca]  = useState("");
  const [aberto, setAberto] = useState(false);
  const [foco,   setFoco]   = useState(-1);
  const anchorRef = useRef<HTMLDivElement>(null);
  const listaRef  = useRef<HTMLDivElement>(null);

  const filtrados = (busca.trim()
    ? produtos.filter((p) => normalizar(p.nome).includes(normalizar(busca)))
    : produtos
  ).slice(0, 30);

  function selecionar(p: CrmProduct) {
    onSelect(p);
    setBusca("");
    setAberto(false);
    setFoco(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAberto(true);
      setFoco((f) => Math.min(f + 1, filtrados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFoco((f) => Math.max(f - 1, -1));
    } else if (e.key === "Enter") {
      if (foco >= 0 && filtrados[foco]) { e.preventDefault(); selecionar(filtrados[foco]); }
      else if (filtrados.length === 1)  { e.preventDefault(); selecionar(filtrados[0]); }
    } else if (e.key === "Escape") {
      setAberto(false);
      setFoco(-1);
    }
  }

  // Rola o item focado para visível
  useEffect(() => {
    if (foco < 0 || !listaRef.current) return;
    const item = listaRef.current.children[foco] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [foco]);

  return (
    <div ref={anchorRef} style={{ position: "relative" }}>
      <input
        value={busca}
        onChange={(e) => { setBusca(e.target.value); setAberto(true); setFoco(-1); }}
        onFocus={() => setAberto(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
      />
      <DropdownPortal anchorRef={anchorRef} open={aberto} onClose={() => setAberto(false)}>
        <div ref={listaRef}>
          {filtrados.map((p, i) => (
            <div
              key={p.id}
              onMouseDown={() => selecionar(p)}
              onMouseEnter={() => setFoco(i)}
              style={{
                padding: "10px 14px", fontSize: 13, color: "var(--color-text-primary)", cursor: "pointer",
                display: "flex", justifyContent: "space-between", gap: 10,
                background: i === foco ? "var(--color-background-secondary)" : "transparent",
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nome}</span>
              <span style={{ color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>{formatBRL(p.preco ?? 0)}</span>
            </div>
          ))}
          {filtrados.length === 0 && (
            <div style={{ padding: "10px 14px", fontSize: 13, color: "var(--color-text-secondary)" }}>Nenhum produto encontrado</div>
          )}
        </div>
      </DropdownPortal>
    </div>
  );
}
