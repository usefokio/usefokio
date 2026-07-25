// Link de WhatsApp com DDI 55 e mensagem opcional pré-preenchida (?text=).
// Centraliza a normalização do número que estava duplicada em ~4 lugares (álbum, entrega, blocos).
export function linkWhatsApp(numero: string | null | undefined, texto?: string | null): string {
  const limpo = (numero ?? "").replace(/\D/g, "");
  if (!limpo) return "";
  const full = limpo.startsWith("55") ? limpo : `55${limpo}`;
  const base = `https://wa.me/${full}`;
  const t = (texto ?? "").trim();
  return t ? `${base}?text=${encodeURIComponent(t)}` : base;
}
