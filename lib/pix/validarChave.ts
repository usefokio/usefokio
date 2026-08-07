// Valida o formato da chave PIX conforme o tipo selecionado, pra não deixar salvar uma chave
// que não bate com o tipo escolhido (ex.: "chave aleatória" marcada como CPF).
function validarDigitosCPF(cpf: string): boolean {
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (base: string) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (base.length + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return calc(cpf.slice(0, 9)) === Number(cpf[9]) && calc(cpf.slice(0, 10)) === Number(cpf[10]);
}

export function validarChavePix(tipo: string, chave: string): string | null {
  const v = (chave || "").trim();
  if (!v) return "Informe a chave PIX.";
  switch (tipo) {
    case "cpf": {
      const digitos = v.replace(/\D/g, "");
      if (digitos.length !== 11) return "CPF deve ter 11 dígitos.";
      if (!validarDigitosCPF(digitos)) return "CPF inválido.";
      return null;
    }
    case "cnpj": {
      const digitos = v.replace(/\D/g, "");
      if (digitos.length !== 14) return "CNPJ deve ter 14 dígitos.";
      return null;
    }
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "E-mail inválido.";
    case "telefone": {
      const digitos = v.replace(/\D/g, "");
      if (digitos.length < 10 || digitos.length > 13) return "Telefone inválido (informe com DDD).";
      return null;
    }
    case "aleatoria":
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
        ? null : "Chave aleatória deve ser um UUID (ex: 123e4567-e89b-12d3-a456-426614174000).";
    default:
      return null;
  }
}
