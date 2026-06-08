import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UseFokio",
  description: "A galeria de seleção que seus clientes vão amar",
  icons: {
    icon: "/usefokio-favicon.svg",
    shortcut: "/usefokio-favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
