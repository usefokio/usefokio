import { FotografoProvider } from "@/lib/context/FotografoContext";
import { DashboardGuard } from "./_components/DashboardGuard";
import { DashboardShell } from "./_components/DashboardShell";
import { BotaoSuporte } from "./_components/BotaoSuporte";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <FotografoProvider>
      <DashboardGuard>
        <DashboardShell>{children}</DashboardShell>
        <BotaoSuporte />
      </DashboardGuard>
    </FotografoProvider>
  );
}
