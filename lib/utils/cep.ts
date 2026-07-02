// Busca de endereço por CEP via ViaCEP. Reutilizado por todos os formulários
// com endereço (cadastro, perfil do fotógrafo, clientes).
export type EnderecoCep = {
  logradouro: string;
  bairro:     string;
  cidade:     string;
  estado:     string;
};

export async function buscarCep(cep: string): Promise<EnderecoCep | null> {
  const c = cep.replace(/\D/g, "");
  if (c.length !== 8) return null;
  try {
    const res  = await fetch(`https://viacep.com.br/ws/${c}/json/`);
    const data = await res.json();
    if (data.erro) return null;
    return {
      logradouro: data.logradouro ?? "",
      bairro:     data.bairro ?? "",
      cidade:     data.localidade ?? "",
      estado:     data.uf ?? "",
    };
  } catch {
    return null; // ignora erros de rede
  }
}
