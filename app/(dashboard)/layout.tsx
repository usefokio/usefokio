import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { FotografoProvider } from "@/lib/context/FotografoContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <FotografoProvider>
      <div
        style={{
          display: "flex",
          height: "100vh",
          background: "var(--color-background-tertiary)",
          fontFamily: "var(--font-sans)",
        }}
      >
        <Sidebar />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <Header />
          <main style={{ flex: 1, overflowY: "auto" }}>{children}</main>
        </div>
      </div>
    </FotografoProvider>
  );
}
