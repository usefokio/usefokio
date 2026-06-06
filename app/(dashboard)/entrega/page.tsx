"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { MOCK_ENTREGA } from "@/lib/mock-data";

export default function EntregaPage() {
  return (
    <div style={{ padding: "26px 30px", maxWidth: 1000 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 3px", letterSpacing: "-0.02em" }}>
            Galerias de Entrega
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
            Fotos editadas em alta resolução para o cliente baixar
          </p>
        </div>
        <Link
          href="/entrega/nova"
          style={{ padding: "8px 16px", borderRadius: 8, background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 500, textDecoration: "none" }}
        >
          + Nova entrega
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
        {MOCK_ENTREGA.map((g) => (
          <div
            key={g.id}
            style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, overflow: "hidden", cursor: "pointer" }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-border-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-border-tertiary)")}
          >
            <div style={{ height: 96, background: g.cover, position: "relative" }}>
              <div style={{ position: "absolute", top: 8, right: 8 }}>
                <Badge status={g.status} />
              </div>
            </div>
            <div style={{ padding: "13px 15px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 3 }}>{g.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Avatar initials={g.avatar} size={16} />
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{g.client}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 11 }}>
                <span>{g.photos} fotos · {g.size}</span>
                <span>{g.date}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{g.downloads} downloads</span>
                <button style={{ padding: "5px 11px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, color: "var(--color-text-primary)", cursor: "pointer", fontWeight: 500 }}>
                  {g.status === "Preparando" ? "Configurar" : "Ver galeria"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
