// Fontes curadas do site (todas Google/OFL, livres para web, self-hosted via next/font).
// preload:false → o navegador só baixa a fonte do par ESCOLHIDO (as demais só definem @font-face).
// O layout aplica todas as classes .variable no .site-root e liga --site-fonte-titulo/corpo à escolha.
// OBS: o plugin do next/font exige objeto LITERAL em cada chamada (sem ...spread nem variáveis).
import {
  Montserrat, Inter, Poppins, Work_Sans, DM_Sans,
  Cormorant_Garamond, Crimson_Text, Playfair_Display, Lora, PT_Serif, EB_Garamond,
  Cinzel, Marcellus, Italiana,
} from "next/font/google";

const montserrat = Montserrat({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600", "700"], variable: "--f-montserrat" });
const inter      = Inter({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600"], variable: "--f-inter" });
const poppins    = Poppins({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600"], variable: "--f-poppins" });
const worksans   = Work_Sans({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600"], variable: "--f-worksans" });
const dmsans     = DM_Sans({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "700"], variable: "--f-dmsans" });
const cormorant  = Cormorant_Garamond({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600"], variable: "--f-cormorant" });
const crimson    = Crimson_Text({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "600"], style: ["normal", "italic"], variable: "--f-crimson" });
const playfair   = Playfair_Display({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600", "700"], variable: "--f-playfair" });
const lora       = Lora({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600"], variable: "--f-lora" });
const ptserif    = PT_Serif({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "700"], variable: "--f-ptserif" });
const ebgaramond = EB_Garamond({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600"], variable: "--f-ebgaramond" });
const cinzel     = Cinzel({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600"], variable: "--f-cinzel" });
const marcellus  = Marcellus({ subsets: ["latin"], display: "swap", preload: false, weight: ["400"], variable: "--f-marcellus" });
const italiana   = Italiana({ subsets: ["latin"], display: "swap", preload: false, weight: ["400"], variable: "--f-italiana" });

// id (usado em lib/site/design.ts) → variável CSS
export const FONTE_VAR: Record<string, string> = {
  montserrat: "--f-montserrat", inter: "--f-inter", poppins: "--f-poppins", worksans: "--f-worksans", dmsans: "--f-dmsans",
  cormorant: "--f-cormorant", crimson: "--f-crimson", playfair: "--f-playfair", lora: "--f-lora", ptserif: "--f-ptserif", ebgaramond: "--f-ebgaramond",
  cinzel: "--f-cinzel", marcellus: "--f-marcellus", italiana: "--f-italiana",
};

// Todas as classes .variable, para aplicar no .site-root (só a fonte usada é baixada).
export const classesFontes = [
  montserrat, inter, poppins, worksans, dmsans,
  cormorant, crimson, playfair, lora, ptserif, ebgaramond,
  cinzel, marcellus, italiana,
].map((f) => f.variable).join(" ");
