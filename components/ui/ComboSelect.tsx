"use client";

import { useEffect, useRef, useState } from "react";
import { inputStyle } from "@/lib/styles";
import { normalizar } from "@/lib/utils/normalizar";

export type ComboOption = { id: string; label: string; sublabel?: string };

export function ComboSelect({
  options,
  value,
  onChange,
  placeholder = "Selecionar…",
  disabled = false,
}: {
  options: ComboOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [busca,   setBusca]   = useState("");
  const [aberto,  setAberto]  = useState(false);
  const [foco,    setFoco]    = useState(-1);

  const inputRef   = useRef<HTMLInputElement>(null);
  const listaRef   = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selecionada = options.find((o) => o.id === value) ?? null;

  const filtradas = busca.trim()
    ? options.filter((o) => normalizar(o.label).includes(normalizar(busca)) || (o.sublabel && normalizar(o.sublabel).includes(normalizar(busca))))
    : options;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        fechar();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (foco < 0 || !listaRef.current) return;
    const item = listaRef.current.children[foco] as HTMLElement;
    item?.scrollIntoView({ block: "nearest" });
  }, [foco]);

  function abrir() {
    if (disabled) return;
    setBusca("");
    setFoco(-1);
    setAberto(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function fechar() {
    setAberto(false);
    setBusca("");
    setFoco(-1);
  }

  function selecionar(o: ComboOption) {
    onChange(o.id);
    fechar();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFoco((f) => Math.min(f + 1, filtradas.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFoco((f) => Math.max(f - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (foco >= 0 && filtradas[foco]) selecionar(filtradas[foco]);
      else if (filtradas.length === 1) selecionar(filtradas[0]);
    } else if (e.key === "Escape") {
      fechar();
    }
  }

  return (
    <div style={{ position: "relative" }} ref={wrapperRef}>
      {aberto ? (
        <input
          ref={inputRef}
          type="text"
          value={busca}
          onChange={(e) => { setBusca(e.target.value); setFoco(-1); }}
          onKeyDown={handleKeyDown}
          placeholder="Digite para buscar…"
          style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
          autoComplete="off"
        />
      ) : (
        <button
          type="button"
          onClick={abrir}
          disabled={disabled}
          style={{
            ...inputStyle,
            width: "100%", textAlign: "left", cursor: disabled ? "default" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            color: selecionada ? "var(--color-text-primary)" : "var(--color-text-secondary)",
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selecionada?.label ?? placeholder}
          </span>
          <span style={{ fontSize: 10, color: "var(--color-text-secondary)", flexShrink: 0, marginLeft: 6 }}>▼</span>
        </button>
      )}

      {aberto && (
        <div
          ref={listaRef}
          style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 40,
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-secondary)",
            borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            maxHeight: 220, overflowY: "auto",
          }}
        >
          {filtradas.length === 0 ? (
            <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--color-text-secondary)" }}>
              {busca ? `Nenhum resultado para "${busca}"` : "Nenhuma opção disponível"}
            </div>
          ) : (
            filtradas.map((o, i) => (
              <div
                key={o.id}
                onMouseDown={() => selecionar(o)}
                onMouseEnter={() => setFoco(i)}
                style={{
                  padding: "10px 14px", cursor: "pointer", fontSize: 13,
                  background: i === foco ? "var(--color-background-secondary)" : "transparent",
                  borderBottom: i < filtradas.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none",
                }}
              >
                <div style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{o.label}</div>
                {o.sublabel && (
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{o.sublabel}</div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
