"use client";

// Busca de produto reutilizável (input + dropdown via portal). Padrão do sistema.
import { useRef, useState } from "react";
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
  const anchorRef = useRef<HTMLDivElement>(null);

  const filtrados = busca.trim()
    ? produtos.filter((p) => normalizar(p.nome).includes(normalizar(busca)))
    : produtos;

  return (
    <div ref={anchorRef} style={{ position: "relative" }}>
      <input
        value={busca}
        onChange={(e) => { setBusca(e.target.value); setAberto(true); }}
        onFocus={() => setAberto(true)}
        placeholder={placeholder}
        autoComplete="off"
        style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
      />
      <DropdownPortal anchorRef={anchorRef} open={aberto} onClose={() => setAberto(false)}>
        {filtrados.slice(0, 30).map((p) => (
          <div
            key={p.id}
            onMouseDown={() => { onSelect(p); setBusca(""); setAberto(false); }}
            style={{ padding: "10px 14px", fontSize: 13, color: "var(--color-text-primary)", cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 10 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-background-secondary)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nome}</span>
            <span style={{ color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>{formatBRL(p.preco ?? 0)}</span>
          </div>
        ))}
        {filtrados.length === 0 && (
          <div style={{ padding: "10px 14px", fontSize: 13, color: "var(--color-text-secondary)" }}>Nenhum produto encontrado</div>
        )}
      </DropdownPortal>
    </div>
  );
}
