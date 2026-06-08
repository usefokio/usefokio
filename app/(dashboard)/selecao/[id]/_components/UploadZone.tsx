"use client";

import { useRef, useState } from "react";

export function UploadZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [drag, setDrag] = useState(false);
  const inputRef        = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length) onFiles(files);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${drag ? "#2563EB" : "var(--color-border-secondary)"}`,
        borderRadius: 12, padding: "32px 24px",
        textAlign: "center", cursor: "pointer",
        background: drag ? "rgba(37,99,235,0.04)" : "var(--color-background-secondary)",
        transition: "all 0.2s", marginBottom: 20,
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 10 }}>📁</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 4 }}>
        Arraste as fotos aqui ou clique para selecionar
      </div>
      <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
        JPEG, PNG ou WebP · Máximo 50 MB por arquivo
      </div>
      <input
        ref={inputRef}
        type="file" multiple accept="image/jpeg,image/jpg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
