import { useState, type ReactNode } from "react";

interface FieldProps {
  label: string;
  hint?: string;
  tooltip?: string;
  children: ReactNode;
}

function TooltipIcon({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <span
      style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 14, height: 14, borderRadius: "50%",
          border: "1.5px solid var(--color-text-secondary)",
          color: "var(--color-text-secondary)",
          fontSize: 9, fontWeight: 700, cursor: "default",
          opacity: 0.55, userSelect: "none", lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ?
      </span>
      {visible && (
        <span
          style={{
            position: "absolute", bottom: "calc(100% + 6px)", left: "50%",
            transform: "translateX(-50%)",
            background: "var(--color-text-primary)", color: "var(--color-background-primary)",
            fontSize: 11, fontWeight: 400, lineHeight: 1.5,
            padding: "6px 10px", borderRadius: 7,
            whiteSpace: "normal", width: 220, textAlign: "left",
            boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
            zIndex: 100, pointerEvents: "none",
          }}
        >
          {text}
          <span
            style={{
              position: "absolute", top: "100%", left: "50%",
              transform: "translateX(-50%)",
              border: "5px solid transparent",
              borderTopColor: "var(--color-text-primary)",
            }}
          />
        </span>
      )}
    </span>
  );
}

export function Field({ label, hint, tooltip, children }: FieldProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
        {tooltip && <TooltipIcon text={tooltip} />}
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
