# Prompt de implementação — Aparência por blocos (construtor de site)

> Cole este documento como instrução para o desenvolvimento. A **referência visual funcional** está no artefato interativo `header-editor` (protótipo do editor de Aparência com prévia ao vivo). Este documento descreve o comportamento a ser implementado no `usefokio` (Next.js App Router + Supabase). **Não é para reimplementar o protótipo em HTML**, e sim traduzir as regras para o sistema real, seguindo as convenções do projeto.

## 1. Objetivo

Evoluir a tela de Aparência (`/site/temas`) de um conjunto fixo de opções para um **construtor por blocos**: o fotógrafo (e videógrafo) monta a página inicial do site escolhendo quais blocos exibir, configurando cada um e reordenando-os. Os **temas** virão numa etapa futura como *presets* dessas mesmas configurações — portanto o schema abaixo é a base sobre a qual os temas serão construídos. **Não implementar temas agora.**

## 2. Estrutura da tela

Duas colunas:

- **Esquerda — Configurações.** Lista de cards. Cada card pode **minimizar/expandir** (seta/chevron no **lado esquerdo** do cabeçalho; aponta pra baixo aberto, gira pra direita minimizado). Clicar no cabeçalho alterna; clicar no interruptor ou na alça de arraste **não** minimiza.
- **Direita — Prévia do site.** Deve ficar **fixa (sticky)** — ao rolar a coluna de configurações, a prévia permanece visível. Em telas estreitas, empilha acima.
- **Barra de dispositivo** acima da prévia: **Computador / Tablet / Celular**, que altera a largura da prévia (ex.: 100% / 768px / 380px) para conferir responsividade. No celular, o menu do header colapsa em ícone “hambúrguer”.

A prévia deve refletir **em tempo real** cada alteração (é a mesma renderização do site real, apenas escalada).

## 3. Seções fixas (sempre presentes, sem liga/desliga, não reordenáveis)

Ordem travada no topo: **Fontes → Logo → Header (Barra do topo)**. E **Rodapé** travado no fim.

### 3.1 Fontes
Lista de fontes agrupadas (Minimalistas: Moderno, Suave, Clean / Serifadas: Editorial, Revista). A fonte selecionada se aplica a títulos e menu na prévia.

### 3.2 Logo do site
Upload (Trocar/Remover) + **Tamanho da logo** (slider, px).

### 3.3 Header (Barra do topo)
- **Orientação:** `topo` | `lateral_esquerda`. Em `lateral_esquerda` a barra vira uma coluna à esquerda, com logo no topo e menu empilhado; o controle de “Posição da logo” é ocultado.
- **Posição da logo** (só quando orientação = topo): `esquerda` | `centro` | `direita`, com o menu se ajustando:
  - `esquerda` → itens do menu à **direita**;
  - `centro` → itens **divididos** entre esquerda e direita da logo;
  - `direita` → itens do menu à **esquerda**.
- **Cor** (fundo da barra) — paleta de swatches + cor personalizada.
- **Cor do texto do menu** — *NOVO*. Mesma paleta de swatches + personalizada. (Hoje só existe a cor de fundo; este é o campo que faltava.)
- **Transparência** (0–100%).
- **Altura** (topo) / **Largura** (lateral) — o rótulo/limites mudam conforme a orientação.

### 3.4 Rodapé
- **Cor** (swatches + personalizada). (Transparência/altura já existentes podem permanecer.)

## 4. Blocos (com liga/desliga e reordenáveis entre si)

Regras gerais válidas para **todos** os blocos:

- Cada bloco tem um **interruptor Mostrar/Ocultar** minimalista ao lado do título (não um botão grande). Ao ocultar, as configurações do bloco recolhem no painel **e** o bloco some da prévia.
- Título do card é só o nome do bloco (ex.: “BLOG”, “TRABALHOS RECENTES”) — sem prefixos nem selos “Novo”.
- **Reordenáveis entre si** por arraste (alça `⠿` à esquerda do título). A ordem escolhida define a **ordem de renderização na página** (prévia e site real devem seguir a mesma ordem). Fontes/Logo/Header não entram no arraste (topo travado); Rodapé travado no fim.

### 4.1 Banner
- **Exibir** (on/off).
- **Tipo:** `foto_unica` | `deslizante` | `grid`.
  - `foto_unica`: uma foto por vez, com **setas laterais** e **passagem automática**.
  - `deslizante`: as fotos **respeitam a proporção do arquivo** — já aparece um pedaço da próxima foto ao lado da atual (sem esticar).
  - `grid`: várias imagens em grade (sem rotação), com **colunas** configuráveis.
- **Ajuste da imagem** (relevante em `foto_unica`): `manter_proporcao` | `preencher`.
  - `manter_proporcao`: mantém a proporção da foto; se sobrar espaço na janela, exibe **borda** em vez de cortar (evita corte errado). Nunca estica a imagem.
  - `preencher`: preenche todo o espaço conforme o tamanho da tela, podendo cortar.
- **Tamanho do banner** (altura).
- **Velocidade de passagem** (segundos) — para os tipos com rotação.
- **Colunas** — só no tipo `grid`.

### 4.2 Trabalhos recentes
- **Exibir** (on/off).
- **Colunas do grid.**
- **Proporção da capa:** `horizontal_3x2` | `vertical_2x3` | `quadrado_1x1` (a capa mantém a proporção em qualquer nº de colunas/dispositivo — **não** usar altura fixa).
- **Posição do título:** `acima` | `centro` (sobre a capa) | `abaixo`.
- **Texto do card:** `titulo_subtitulo` | `so_titulo`. O subtítulo é o **local** definido dentro do trabalho.

### 4.3 Blog (conteúdo mais denso — título mais longo + descrição)
- **Exibir** (on/off).
- **Layout:** `capa_esquerda` | `capa_em_cima` | `horizontal_deslizante`.
  - `capa_esquerda`: capa à esquerda, título + descrição à direita; posts empilhados em lista. (Neste layout, “Posição do título” não se aplica e deve ser ocultado.)
  - `capa_em_cima`: lista/grade com capa no topo. Exibir controle de **Colunas do grid** (1–4) **somente** neste layout — para evitar a capa desproporcional em coluna única.
  - `horizontal_deslizante`: lista horizontal.
- **Proporção da capa:** `horizontal_3x2` | `vertical_2x3` | `quadrado_1x1`.
- **Posição do título:** `acima` | `centro` | `abaixo` (nos layouts de capa no topo).
- **Descrição:** liga/desliga. Quando ligada, mostra o **texto inicial do post** (excerpt) abaixo do título.

### 4.4 Depoimentos
- **Exibir** (on/off).
- **Layout:** `lista_vertical` | `horizontal` | `grade`.
- **Colunas do grid** — só em `grade`.
- **Exibir:** `foto`, `nome`, `depoimento` (três toggles independentes).
- **Navegação (importante):** `horizontal` e `grade` **não** usam barra de rolagem nativa — usam **setas laterais** (‹ ›) para navegar; a `grade` **pagina** de acordo com o nº de colunas escolhido; as setas desabilitam nas pontas.
- **Lista vertical:** exibir um botão **“Ver mais depoimentos”** abaixo, que leva à **página de depoimentos**.

### 4.5 Selos e associações
- **Exibir** (on/off).
- **Mostrar título** (liga/desliga).
- Renderização **sempre em barra horizontal única**: os logos ficam numa **única linha, sem quebra de linha** e **sem barra deslizante** (distribuídos/encaixados na linha). **Não** ter controle de colunas.
- Cada item tem **logo + título + link**. Ao clicar no logo ou no título, abre o **perfil da associação/instituição** (link definido por item). São imagens que o fotógrafo adiciona (associações/instituições das quais faz parte).

## 5. Modelo de dados (sugestão — validar com o padrão atual)

Hoje `/site/temas` já persiste aparência (fonte, logo, cor/altura/transparência das barras) com salvamento automático (“Tudo salvo”). **Estender essa mesma persistência** com os novos campos e um array **ordenado** de blocos, por fotógrafo/site.

Proposta de shape (JSONB único de aparência, ou colunas + tabela de blocos — seguir o que já existe):

```jsonc
{
  "fontes": { "familia": "editorial" },
  "logo":   { "url": "...", "tamanho": 58 },
  "header": {
    "orientacao": "topo",            // topo | lateral_esquerda
    "logo_pos": "esquerda",          // esquerda | centro | direita
    "cor_fundo": "#f7f5ef",
    "cor_texto": "#2f2f2c",          // NOVO
    "transparencia": 8,
    "altura": 88,                     // topo
    "largura": 200                    // lateral_esquerda
  },
  "rodape": { "cor": "#ffffff", "transparencia": 0, "altura": 18 },
  "blocos": [                         // ORDEM = ordem de render
    { "key": "banner", "on": true, "tipo": "foto_unica", "ajuste": "manter_proporcao",
      "altura": 300, "velocidade": 4, "colunas": 3 },
    { "key": "trabalhos", "on": true, "colunas": 3, "proporcao": "horizontal_3x2",
      "titulo_pos": "abaixo", "texto": "titulo_subtitulo" },
    { "key": "blog", "on": true, "layout": "capa_esquerda", "colunas": 3,
      "proporcao": "horizontal_3x2", "titulo_pos": "abaixo", "descricao": true },
    { "key": "depoimentos", "on": true, "layout": "lista_vertical", "colunas": 3,
      "foto": true, "nome": true, "texto": true },
    { "key": "selos", "on": true, "titulo": true }
  ]
}
```

- `blocos` é a **lista ordenada**; a seção fixa (Fontes/Logo/Header/Rodapé) fica fora dela.
- Se optar por tabela relacional para blocos, guardar `ordem` (int) e `config` (jsonb) por bloco.

## 6. Convenções do projeto a respeitar (ver `CLAUDE.md`)

- **Schema:** toda mudança vira **migration numerada** em `supabase/migrations/`, aplicada **primeiro no dev** (`lcpoufencuaawpztmclb`), testada, e só então na prod no deploy em lote. Nunca alterar schema direto em produção.
- **Campos de cor/valor:** usar os utilitários existentes; nada de hardcode de regra de negócio (limites/planos vêm de `planos_config`).
- **Estado de salvamento claro:** manter o padrão de “✓ Tudo salvo / ● Alterações não salvas” já usado na tela, com baseline no load; se houver ação de salvar explícita em algum editor, seguir `useUnsavedGuard`. (A tela de Aparência hoje é auto-save; manter o comportamento atual salvo pedido em contrário.)
- **Listagens/somas:** onde precisar carregar dados (ex.: trabalhos, posts, depoimentos para a prévia real), usar `fetchAllRows` — nunca `select` cru (corte silencioso em 1000 linhas).
- **Cliente único / dados reais:** a prévia deve consumir os dados reais do site (trabalhos, posts, depoimentos, selos) do fotógrafo, não bases paralelas.
- **Dev sem auth:** guards de Supabase Auth protegidos por `if (process.env.NODE_ENV === "development")`.
- **Commits** em português no estilo `feat(site): ...`; desenvolver em **branch**, testar local (porta 3001, DB dev), deploy em lote via merge em `master`.

## 7. Fora de escopo (próxima etapa)
- **Temas** como presets: um tema é um conjunto pré-preenchido de tudo acima (fontes, logo defaults, header, ordem/config de blocos). O schema desta entrega deve permitir que um tema seja aplicado sobrescrevendo esses valores. Não construir os temas agora.

## 8. Critérios de aceite
1. Novo campo **Cor do texto do menu** no Header, funcionando na prévia e persistido.
2. Header com **orientação** (topo/lateral) e **posição da logo** com o menu se ajustando conforme a regra da seção 3.3.
3. Banner com os 3 tipos, **ajuste de imagem** (manter proporção sem corte / preencher), tamanho, velocidade e colunas (grid).
4. Blocos Trabalhos, Blog, Depoimentos e Selos conforme seções 4.2–4.5, incluindo: proporção de capa, posições de título, colunas condicionais, setas laterais nos depoimentos (sem scrollbar), “Ver mais” na lista vertical, e a barra horizontal única dos selos.
5. Cada bloco com **Mostrar/Ocultar**; **reordenação por arraste** refletindo na ordem da página; cards **minimizáveis** (chevron à esquerda); Fontes/Logo/Header travados no topo e Rodapé no fim.
6. Prévia **sticky** + barra de **dispositivo** (PC/Tablet/Celular) com responsividade real.
7. Tudo persistido no schema da seção 5 (via migration dev-first) e refletido no site publicado.
