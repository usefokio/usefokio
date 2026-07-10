import type { Metadata } from "next";
import "./globals.css";
import { DevBanner } from "./_components/DevBanner";

export const metadata: Metadata = {
  title: "UseFokio",
  description: "A galeria de seleção que seus clientes vão amar",
  icons: {
    icon: "/usefokio-favicon.svg",
    shortcut: "/usefokio-favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const isDev = process.env.NODE_ENV === "development";
  return (
    <html lang="pt-BR">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body suppressHydrationWarning style={isDev ? ({ ["--dev-banner-h"]: "28px" } as React.CSSProperties) : undefined}>
        <DevBanner />
        {children}
      </body>
    </html>
  );
}
