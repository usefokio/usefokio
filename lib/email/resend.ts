import { Resend } from "resend";

// Inicialização lazy para não quebrar o build quando RESEND_API_KEY não está definida
let _resend: Resend | null = null;
export function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY não configurada");
    _resend = new Resend(key);
  }
  return _resend;
}

// Mantém compatibilidade com código existente que usa `resend` diretamente
export const resend = new Proxy({} as Resend, {
  get(_target, prop) {
    return (getResend() as any)[prop];
  },
});

export const FROM_DEFAULT    = process.env.EMAIL_FROM         ?? "UseFokio <noreply@usefokio.com.br>";
export const WEBMASTER_EMAIL = process.env.WEBMASTER_EMAIL    ?? "";
export const APP_URL         = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
