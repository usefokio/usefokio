/**
 * Gera uma senha de acesso legível para o cliente.
 * Formato: 3 letras + 3 dígitos + 2 letras  (ex: "KAP482BX")
 * Fácil de digitar, sem caracteres ambíguos (0/O, 1/I, l).
 */
export function gerarSenhaAcesso(): string {
  const letras  = "ABCDEFGHJKMNPQRSTUVWXYZ"; // sem I, L, O
  const digitos = "23456789";                 // sem 0, 1
  const rand = (set: string) => set[Math.floor(Math.random() * set.length)];

  return (
    rand(letras) + rand(letras) + rand(letras) +
    rand(digitos) + rand(digitos) + rand(digitos) +
    rand(letras) + rand(letras)
  );
}
