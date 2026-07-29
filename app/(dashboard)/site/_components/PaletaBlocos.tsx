"use client";

// Popup "Adicionar bloco" — mostra CADA bloco disponível com uma miniatura do layout e uma
// explicação em português do que ele faz. O fotógrafo escolhe vendo o exemplo, não só o nome.
// As miniaturas são desenhadas em CSS (nenhuma imagem externa): retângulo = foto, barra = texto.
import { CATALOGO_BLOCOS, type TipoBloco } from "@/lib/site/blocos";

const FUNDO = "var(--color-background-tertiary)";
const BORDA = "var(--color-border-tertiary)";
const TINTA = "var(--color-text-secondary)";

// ── peças reaproveitadas pelas miniaturas ─────────────────────────────────────
function Foto({ h, style }: { h?: number | string; style?: React.CSSProperties }) {
  return (
    <div style={{
      height: h ?? "100%", borderRadius: 3, border: `1px solid ${BORDA}`,
      background: `repeating-linear-gradient(135deg, ${FUNDO}, ${FUNDO} 5px, var(--color-background-secondary) 5px, var(--color-background-secondary) 10px)`,
      ...style,
    }} />
  );
}
function Barra({ w = "100%", h = 5, style }: { w?: number | string; h?: number; style?: React.CSSProperties }) {
  return <div style={{ width: w, height: h, borderRadius: 3, background: TINTA, opacity: 0.35, ...style }} />;
}
function Coluna({ gap = 5, style, children }: { gap?: number; style?: React.CSSProperties; children: React.ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column", gap, ...style }}>{children}</div>;
}

// ── miniatura de cada tipo de bloco ───────────────────────────────────────────
const MINIATURAS: Record<TipoBloco, React.ReactNode> = {
  hero: (
    <div style={{ position: "relative", height: "100%" }}>
      <Foto style={{ height: "100%" }} />
      <Coluna gap={4} style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 16, height: 16, borderRadius: "50%", background: TINTA, opacity: 0.5 }} />
        <Barra w="60%" h={7} style={{ opacity: 0.6 }} />
        <Barra w="42%" h={4} />
      </Coluna>
    </div>
  ),
  titulo: (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
      <Barra w="65%" h={9} style={{ opacity: 0.55 }} />
    </div>
  ),
  texto: (
    <Coluna style={{ justifyContent: "center", height: "100%" }}>
      <Barra /><Barra w="94%" /><Barra w="97%" /><Barra w="70%" />
    </Coluna>
  ),
  imagem: <Foto style={{ height: "100%" }} />,
  duas_colunas: (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, height: "100%" }}>
      <Coluna style={{ justifyContent: "center" }}>
        <Barra w="80%" h={7} style={{ opacity: 0.55 }} />
        <Barra /><Barra w="92%" /><Barra w="65%" />
      </Coluna>
      <Foto />
    </div>
  ),
  texto_carrossel: (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, height: "100%" }}>
      <Coluna style={{ justifyContent: "center" }}>
        <Barra w="80%" h={7} style={{ opacity: 0.55 }} />
        <Barra /><Barra w="92%" /><Barra w="65%" />
      </Coluna>
      <div style={{ position: "relative", height: "100%" }}>
        <Foto style={{ height: "100%" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px" }}>
          <Barra w={8} h={8} style={{ borderRadius: "50%", opacity: 0.5 }} />
          <Barra w={8} h={8} style={{ borderRadius: "50%", opacity: 0.5 }} />
        </div>
      </div>
    </div>
  ),
  pacote: (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, height: "100%" }}>
      <Coluna gap={4} style={{ justifyContent: "center" }}>
        <Barra w="75%" h={7} style={{ opacity: 0.55 }} />
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 3, height: 3, borderRadius: "50%", background: TINTA, opacity: 0.5 }} />
            <Barra w={i === 2 ? "58%" : "80%"} h={4} />
          </div>
        ))}
        <Barra w="46%" h={8} style={{ opacity: 0.6, marginTop: 2 }} />
      </Coluna>
      <Foto />
    </div>
  ),
  pacotes: (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, height: "100%" }}>
      {[0, 1, 2].map((i) => (
        <Coluna key={i} gap={4} style={{ border: `${i === 1 ? 2 : 1}px solid ${i === 1 ? TINTA : BORDA}`, borderRadius: 4, padding: 6, justifyContent: "center" }}>
          <Barra w="70%" h={5} style={{ opacity: 0.55 }} />
          <Barra w="90%" h={3} /><Barra w="80%" h={3} /><Barra w="85%" h={3} />
          <Barra w="55%" h={6} style={{ opacity: 0.6, marginTop: 2 }} />
        </Coluna>
      ))}
    </div>
  ),
  pagamento: (
    <Coluna gap={7} style={{ justifyContent: "center", height: "100%" }}>
      <Barra w="50%" h={6} style={{ opacity: 0.55, margin: "0 auto 2px" }} />
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "38% 1fr", gap: 8, alignItems: "center", borderBottom: `1px solid ${BORDA}`, paddingBottom: 5 }}>
          <Barra w="85%" h={5} style={{ opacity: 0.55 }} />
          <Barra w="95%" h={4} />
        </div>
      ))}
    </Coluna>
  ),
  cards: (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, height: "100%", alignContent: "center" }}>
      {[0, 1, 2].map((i) => (
        <Coluna key={i} gap={4}>
          <Foto h={34} />
          <Barra w="80%" h={4} style={{ margin: "0 auto" }} />
        </Coluna>
      ))}
    </div>
  ),
  galeria: (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "1fr 1fr", gap: 5, height: "100%" }}>
      {[0, 1, 2, 3, 4, 5].map((i) => <Foto key={i} />)}
    </div>
  ),
  video: (
    <div style={{ position: "relative", height: "100%" }}>
      <Foto style={{ height: "100%" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(0,0,0,0.45)", color: "#fff", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>▶</div>
      </div>
    </div>
  ),
  depoimentos: (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, height: "100%", alignContent: "center" }}>
      {[0, 1].map((i) => (
        <Coluna key={i} gap={4} style={{ alignItems: "center" }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: TINTA, opacity: 0.4 }} />
          <div style={{ fontSize: 8, color: "#F59E0B", letterSpacing: 1 }}>★★★★★</div>
          <Barra w="90%" h={4} /><Barra w="70%" h={4} />
        </Coluna>
      ))}
    </div>
  ),
  divisor: (
    <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
      <div style={{ width: "100%", height: 1, background: TINTA, opacity: 0.5 }} />
    </div>
  ),
  espaco: (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", border: `1px dashed ${BORDA}`, borderRadius: 4, color: TINTA, fontSize: 16 }}>↕</div>
  ),
  botao: (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
      <div style={{ padding: "9px 22px", borderRadius: 8, background: TINTA, color: "var(--color-background-secondary)", fontSize: 10, fontWeight: 700 }}>Reservar minha data</div>
    </div>
  ),
  whatsapp: (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
      <div style={{ padding: "7px 20px", borderRadius: 999, background: "#25d366", color: "#fff", fontSize: 9, fontWeight: 700 }}>💬 WhatsApp</div>
    </div>
  ),
  formulario: (
    <Coluna gap={5} style={{ justifyContent: "center", height: "100%" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ height: 11, borderRadius: 3, border: `1px solid ${BORDA}`, background: "var(--color-background-secondary)" }} />
      ))}
      <div style={{ height: 12, width: "45%", borderRadius: 3, background: TINTA, opacity: 0.45 }} />
    </Coluna>
  ),
};

// Explicação em linguagem do fotógrafo: o que o bloco É e quando usar.
const DESCRICOES: Record<TipoBloco, string> = {
  hero: "Foto grande no topo da página, com logo e título por cima. É a primeira coisa que a pessoa vê — dá para incluir o formulário de contato sobreposto.",
  titulo: "Um título centralizado para separar os assuntos da página (ex.: “Meus pacotes”, “Como funciona”).",
  texto: "Um trecho de texto com negrito, links e listas. Use para explicar o serviço, contar sua história ou responder dúvidas.",
  imagem: "Uma foto sozinha. Você escolhe a largura, a proporção e se ela ocupa a página de ponta a ponta.",
  duas_colunas: "Texto de um lado e foto do outro (dá para inverter). Bom para “Sobre o ensaio” ou “Como funciona”.",
  texto_carrossel: "Texto de um lado e VÁRIAS fotos do outro, trocando sozinhas e com setas para navegar. Bom para apresentar um modelo de álbum ou produto com várias fotos.",
  pacote: "UM pacote por vez: nome, lista do que está incluso, valor em destaque e foto (à direita, à esquerda ou acima). O nome pode virar uma faixa com foto de fundo.",
  pacotes: "Até 4 pacotes lado a lado, para o cliente comparar. Cada coluna tem nome, itens, valor e pode ganhar etiqueta (“Mais escolhido”) e destaque.",
  pagamento: "Condições de pagamento abaixo dos pacotes: parcelamento por opção, à vista com desconto, PIX. Cada linha tem um rótulo em destaque e a explicação ao lado.",
  cards: "Galeria com links: cada foto tem um nome embaixo e leva para onde você apontar — um trabalho, um post do blog ou qualquer endereço.",
  galeria: "Grade de fotos em linhas justificadas (o mesmo layout das galerias do site): cada foto na sua proporção natural, responsivo, e amplia ao clicar.",
  video: "Um vídeo do YouTube dentro da página. Cole o link e ele aparece no tamanho certo.",
  depoimentos: "Mostra os depoimentos cadastrados em Site → Depoimentos, com um botão para o cliente escrever a avaliação dele.",
  divisor: "Uma linha fina separando duas partes da página. Sem nada para preencher.",
  espaco: "Um respiro em branco entre dois blocos, com a altura que você escolher — para a página não ficar apertada.",
  botao: "Botão de ação (CTA) em destaque — “Reservar minha data”, “Pedir orçamento”. Leva a um link (sua proposta/página) ou abre o WhatsApp com a mensagem já escrita. Registra a conversão no clique.",
  whatsapp: "Botão verde que abre a conversa no seu WhatsApp. Dá para deixar uma mensagem já escrita. Sem número preenchido, usa o do seu cadastro.",
  formulario: "Formulário de contato com os campos que você escolher. Os envios chegam em Site → Inbox.",
};

export function PaletaBlocos({ onEscolher, onFechar }: { onEscolher: (tipo: TipoBloco) => void; onFechar: () => void }) {
  return (
    <div onClick={onFechar}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--color-background-primary)", borderRadius: 14, width: "100%", maxWidth: 900, maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", overflow: "hidden" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${BORDA}` }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text-primary)" }}>Adicionar um bloco</div>
            <div style={{ fontSize: 12, color: TINTA, marginTop: 2 }}>Clique no bloco que quer usar — ele entra no fim da página e abre para você preencher.</div>
          </div>
          <button onClick={onFechar} style={{ border: "none", background: "transparent", fontSize: 20, color: TINTA, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 12 }}>
            {CATALOGO_BLOCOS.map((c) => (
              <button key={c.tipo} type="button" onClick={() => onEscolher(c.tipo)} title={`Adicionar ${c.label}`}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2563EB"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDA; }}
                style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left", padding: 12, borderRadius: 10, border: `1px solid ${BORDA}`, background: "var(--color-background-primary)", cursor: "pointer" }}>
                {/* exemplo do layout */}
                <div style={{ height: 86, padding: 8, borderRadius: 8, background: "var(--color-background-secondary)", overflow: "hidden" }}>
                  {MINIATURAS[c.tipo]}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>{c.icone} {c.label}</div>
                <div style={{ fontSize: 11.5, color: TINTA, lineHeight: 1.5 }}>{DESCRICOES[c.tipo]}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 20px", borderTop: `1px solid ${BORDA}` }}>
          <button onClick={onFechar}
            style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
