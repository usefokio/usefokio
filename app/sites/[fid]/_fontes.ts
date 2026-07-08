// Fontes do site público (mesmas do site atual do fotógrafo): Cormorant nos títulos,
// Crimson Text no corpo. Expostas como CSS variables para o tema consumir.
import { Cormorant_Garamond, Crimson_Text } from "next/font/google";

export const fonteTitulo = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--site-fonte-titulo",
});

export const fonteCorpo = Crimson_Text({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--site-fonte-corpo",
});
