// PROMPT DE ENTREVISTA — o fotógrafo copia este texto e cola na IA que ele já usa (ChatGPT, Gemini,
// Claude…). A IA o entrevista e devolve os campos prontos, rotulados IGUAL à tela, para ele colar
// campo a campo em Site → Briefing. Sem API, sem chave, sem custo. Client-safe.
import type { Briefing } from "./briefing";

// Rótulos EXATOS dos campos — fonte única compartilhada pela tela e pelo prompt. É o que faz o
// "cole no campo de mesmo nome" funcionar: se mudar aqui, muda nos dois lugares.
export const ROTULOS_BRIEFING: Record<keyof Omit<Briefing, "preenchido_em">, string> = {
  conceito: "Conceito / estilo do seu trabalho",
  historia: "Sua história",
  nichos: "Nichos / áreas de atuação",
  publico_alvo: "Público-alvo",
  regioes: "Cidades / regiões que atende",
  diferenciais: "Diferenciais",
  tom_voz: "Tom de voz",
  palavras_semente: "Palavras que quer ser encontrado",
};

const FORMATO: Record<keyof typeof ROTULOS_BRIEFING, string> = {
  conceito: "uma frase curta. Ex.: fotografia documental e espontânea, com luz natural",
  historia: "1 a 2 parágrafos, em primeira pessoa — vira o texto da página “Sobre” do site",
  nichos: "lista separada por vírgula; o PRIMEIRO é o foco principal. Ex.: Casamentos, Ensaios, Gestantes",
  publico_alvo: "uma frase. Ex.: casais que valorizam fotos naturais e sem poses forçadas",
  regioes: "lista separada por vírgula, começando pela cidade-base. Ex.: Ourinhos, Jacarezinho, interior de SP",
  diferenciais: "uma frase, itens separados por vírgula. Ex.: entrega em 15 dias, álbuns artesanais, cobertura com drone",
  tom_voz: "poucas palavras. Ex.: próximo e informal",
  palavras_semente: "lista separada por vírgula, do jeito que um cliente digitaria no Google. Ex.: fotógrafo de casamento em Ourinhos",
};

type Ctx = {
  nome_empresa?: string | null;
  cidade?: string | null;
  categorias?: string[];
  briefingAtual?: Briefing | null;
};

const CHAVES = Object.keys(ROTULOS_BRIEFING) as (keyof typeof ROTULOS_BRIEFING)[];

function valorAtual(b: Briefing, k: keyof typeof ROTULOS_BRIEFING): string {
  const v = b[k];
  return Array.isArray(v) ? v.join(", ") : String(v ?? "");
}

export function gerarPromptEntrevista(ctx: Ctx): string {
  const estudio = (ctx.nome_empresa ?? "").trim();
  const cidade = (ctx.cidade ?? "").trim();
  const cats = (ctx.categorias ?? []).filter(Boolean);
  const b = ctx.briefingAtual;
  const refazendo = !!b?.preenchido_em && CHAVES.some((k) => valorAtual(b, k).trim());

  const sabemos = [
    estudio ? `- Nome do estúdio/marca: ${estudio}` : null,
    cidade ? `- Cidade-base: ${cidade}` : null,
    cats.length ? `- Categorias de fotos já cadastradas no site: ${cats.join(", ")}` : null,
  ].filter(Boolean).join("\n");

  const campos = CHAVES.map((k, i) => `${i + 1}. ${ROTULOS_BRIEFING[k]}\n   → Formato: ${FORMATO[k]}`).join("\n");

  const respostasAtuais = refazendo
    ? CHAVES.map((k) => `${ROTULOS_BRIEFING[k]}: ${valorAtual(b!, k) || "(em branco)"}`).join("\n")
    : "";

  return `Você é um entrevistador especialista em marketing e SEO para fotógrafos. Fale sempre em português do Brasil.

## Sua tarefa
Vou responder a uma entrevista sua. Ao final, você vai me entregar 8 campos preenchidos que eu mesmo vou copiar e colar num formulário do meu site.

## Contexto
Sou fotógrafo(a) e tenho um site profissional feito no UseFokio. Esse formulário é o "briefing da minha marca": ele alimenta o SEO do meu site (título, descrição e palavras-chave que aparecem no Google) e serve de base para o texto da minha página "Sobre". Quanto mais específico e verdadeiro, melhor eu apareço para quem procura um fotógrafo na minha região.

${sabemos ? `## O que o sistema já sabe sobre mim (não precisa perguntar)\n${sabemos}\n` : ""}
## Os 8 campos que você precisa preencher
${campos}

## Como conduzir a entrevista
- Faça **UMA pergunta por vez** e espere minha resposta antes da próxima. Nunca despeje todas de uma vez.
- Comece se apresentando em 1 ou 2 linhas, explicando que vai me fazer algumas perguntas rápidas (~10 minutos).
- Use linguagem simples e acolhedora: sou fotógrafo(a), não entendo de marketing. Não use jargão.
- Faça de 10 a 14 perguntas no total, cobrindo todos os 8 campos.
- Se minha resposta for vaga ("faço um trabalho diferenciado"), faça uma pergunta de follow-up pedindo um exemplo concreto. Não aceite resposta genérica.
- Se eu travar numa pergunta, sugira 2 ou 3 opções para eu escolher ou adaptar.
- Sobre as cidades: pergunte até onde eu viajo para fotografar — isso é o que mais importa para eu ser achado no Google.

## Regras importantes ao escrever as respostas finais
- **Nunca invente fatos**: nada de prêmios, anos de experiência, número de casamentos ou qualquer dado que eu não tenha dito.
- Use as **minhas palavras** e o meu jeito de falar — não transforme em texto publicitário.
- Nada de clichê de marketing vazio ("soluções de alta performance", "momentos mágicos eternizados").
- Respeite o formato de cada campo descrito acima (frase curta, parágrafo ou lista por vírgula).
${refazendo ? `
## Já respondi este briefing antes
Estas são as minhas respostas atuais. Não comece do zero: use-as como ponto de partida, confirme o que ainda vale, aprofunde o que ficou raso e me ajude a melhorar.

${respostasAtuais}
` : ""}
## Como entregar o resultado (muito importante)
Quando a entrevista terminar, escreva uma mensagem final SÓ com os 8 campos, exatamente neste formato — um bloco por campo, o rótulo em uma linha e a resposta isolada logo abaixo, para eu conseguir copiar cada resposta separadamente:

────────────────────────────
CAMPO: ${ROTULOS_BRIEFING.conceito}
RESPOSTA:
<a resposta aqui>
────────────────────────────
CAMPO: ${ROTULOS_BRIEFING.historia}
RESPOSTA:
<a resposta aqui>
────────────────────────────

…e assim por diante, na mesma ordem da lista dos 8 campos, mantendo os rótulos escritos exatamente como estão acima (eles são os nomes dos campos no meu formulário).

Não coloque comentários, explicações nem texto extra entre os blocos — só o rótulo e a resposta.

Pode começar a entrevista agora.`;
}
