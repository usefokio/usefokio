import { Resend } from "resend";

// Instância singleton do Resend
export const resend = new Resend(process.env.RESEND_API_KEY);

// Remetente padrão — deve ser um domínio verificado no Resend
// Durante desenvolvimento usa o domínio sandbox do Resend
export const FROM_DEFAULT = process.env.EMAIL_FROM ?? "UseFokio <noreply@usefokio.com.br>";
export const WEBMASTER_EMAIL = process.env.WEBMASTER_EMAIL ?? "";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
