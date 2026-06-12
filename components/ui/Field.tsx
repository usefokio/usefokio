import type { ReactNode } from "react";

interface FieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, hint, children }: FieldProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--color-text-secondary)",
            letterSpacing: "0.03em",
          }}
        >
          {label}
        </label>
        {hint && (
          <span style={{ fontSize: 11, color: "var(--color-text-secondary)", opacity: 0.7, fontWeight: 400 }}>
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
