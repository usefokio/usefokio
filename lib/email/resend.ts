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

// Chave com "Full access" usada só para ler e-mails recebidos (respostas do funil). As chaves de envio são
// "Sending access" e não leem a caixa de entrada. Sem ela, tenta a chave padrão.
let _resendRecebimento: Resend | null = null;
export function getResendRecebimento(): Resend {
  const key = process.env.RESEND_RECEBIMENTO_API_KEY;
  if (!key) return getResend();
  if (!_resendRecebimento) _resendRecebimento = new Resend(key);
  return _resendRecebimento;
}

// Mantém compatibilidade com código existente que usa `resend` diretamente
export const resend = new Proxy({} as Resend, {
  get(_target, prop) {
    return (getResend() as any)[prop];
  },
});

export const FROM_DEFAULT    = process.env.EMAIL_FROM         ?? "UseFokio <noreply@usefokio.com.br>";
// Remetente dos e-mails que aceitam resposta (a resposta segue pelo "responder para"): sem "noreply" no endereço
export const ENDERECO_RESPONDIVEL = `respostas@${FROM_DEFAULT.match(/@([^>\s]+)/)?.[1] ?? "usefokio.com.br"}`;
export const WEBMASTER_EMAIL = process.env.WEBMASTER_EMAIL    ?? "usefokio@gmail.com";
export const APP_URL         = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.usefokio.com.br";
