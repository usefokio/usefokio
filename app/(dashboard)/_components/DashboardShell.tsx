"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useWindowWidth, TABLET } from "@/lib/hooks/useWindowWidth";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const largura = useWindowWidth();
  const isMobile = largura < TABLET;
  const [sidebarAberta, setSidebarAberta] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "var(--color-background-tertiary)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {isMobile && sidebarAberta && (
        <div
          onClick={() => setSidebarAberta(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 40,
          }}
        />
      )}
      <Sidebar
        isMobile={isMobile}
        mobileAberta={sidebarAberta}
        onFechar={() => setSidebarAberta(false)}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Header isMobile={isMobile} onAbrirSidebar={() => setSidebarAberta(true)} />
        <main style={{ flex: 1, overflowY: "auto" }}>{children}</main>
      </div>
    </div>
  );
}
