// GERADOR DA PROPOSTA EM PDF (server-only) — monta um documento a partir dos blocos da landing,
// com os VALORES REAIS (sem a máscara do gate). É o arquivo que vai por e-mail a quem pede os
// valores. Usa @react-pdf/renderer: JavaScript puro, sem Chromium (roda leve no Railway).
import { createHash } from "crypto";
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { valorExibido, type SiteBloco } from "@/lib/site/blocos";

export type FotografoPdf = {
  nome_empresa?: string | null;
  logo_url?: string | null;
  whatsapp?: string | null;
  telefone?: string | null;
  email?: string | null;
  site?: string | null;
};

const MAX_FOTOS_GALERIA = 6;   // teto por bloco de galeria (arquivo leve e geração rápida)

// HTML do editor rico (Tiptap) → linhas de texto. <li> vira "• ", <p>/<br> quebram linha.
export function htmlParaTexto(html: string | null | undefined): string[] {
  const bruto = (html ?? "")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
  return bruto.split("\n").map((l) => l.trim()).filter(Boolean);
}

// Impressão do conteúdo: muda quando o título ou qualquer bloco muda → PDF "desatualizado".
export function hashConteudo(titulo: string, blocos: SiteBloco[]): string {
  return createHash("sha1").update(JSON.stringify({ titulo, blocos })).digest("hex");
}

// Só as imagens que o gerador consegue embutir (o react-pdf baixa a URL no servidor).
function imagemOk(url: string | null | undefined): url is string {
  return !!url && /^https?:\/\//i.test(url);
}

const s = StyleSheet.create({
  pagina:    { paddingTop: 48, paddingBottom: 56, paddingHorizontal: 48, fontSize: 11, color: "#1a1a1a", fontFamily: "Helvetica" },
  logo:      { maxHeight: 44, maxWidth: 160, objectFit: "contain", marginBottom: 14 },
  empresa:   { fontSize: 12, fontWeight: 700, marginBottom: 14, color: "#444" },
  titulo:    { fontSize: 22, fontWeight: 700, marginBottom: 6, color: "#111" },
  subtitulo: { fontSize: 11, color: "#666", marginBottom: 22 },
  h2:        { fontSize: 15, fontWeight: 700, marginTop: 20, marginBottom: 8, color: "#111" },
  p:         { fontSize: 11, lineHeight: 1.55, marginBottom: 5, color: "#333" },
  img:       { width: "100%", objectFit: "cover", borderRadius: 4, marginTop: 8, marginBottom: 8 },
  card:      { borderWidth: 1, borderColor: "#e4e4e4", borderRadius: 6, padding: 14, marginTop: 12 },
  cardNome:  { fontSize: 13, fontWeight: 700, marginBottom: 6, color: "#111" },
  item:      { fontSize: 10.5, lineHeight: 1.5, marginBottom: 2, color: "#333" },
  valorLbl:  { fontSize: 8.5, color: "#888", marginTop: 8, letterSpacing: 1 },
  valor:     { fontSize: 17, fontWeight: 700, color: "#111" },
  colunas:   { flexDirection: "row", gap: 10, marginTop: 12 },
  coluna:    { flex: 1, borderWidth: 1, borderColor: "#e4e4e4", borderRadius: 6, padding: 10 },
  pgtoLinha: { flexDirection: "row", gap: 10, marginBottom: 5, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: "#eee" },
  pgtoRot:   { width: "34%", fontSize: 10.5, fontWeight: 700, color: "#111" },
  pgtoDesc:  { flex: 1, fontSize: 10.5, color: "#444" },
  grade:     { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  gradeFoto: { width: "31.5%", height: 84, objectFit: "cover", borderRadius: 3 },
  rodape:    { position: "absolute", bottom: 26, left: 48, right: 48, borderTopWidth: 1, borderTopColor: "#e4e4e4", paddingTop: 8, fontSize: 9, color: "#777", textAlign: "center" },
});

// Itens do pacote: texto rico (forma atual) com fallback para a lista antiga.
function itensDoPacote(itensHtml?: string | null, itens?: string[]): string[] {
  const doHtml = htmlParaTexto(itensHtml);
  if (doHtml.length) return doHtml;
  return (itens ?? []).map((i) => (i.startsWith("•") ? i : `• ${i}`));
}

function BlocoPdf({ b }: { b: SiteBloco }) {
  const d = b.dados;
  switch (b.tipo) {
    case "hero":
      return (
        <View>
          {d.titulo && <Text style={s.h2}>{d.titulo}</Text>}
          {d.texto && <Text style={s.p}>{d.texto}</Text>}
          {imagemOk(d.imagem_url) && <Image style={{ ...s.img, height: 180 }} src={d.imagem_url} />}
        </View>
      );

    case "titulo":
      return d.texto ? <Text style={s.h2}>{d.texto}</Text> : null;

    case "texto":
      return <View>{htmlParaTexto(d.html).map((l, i) => <Text key={i} style={s.p}>{l}</Text>)}</View>;

    case "imagem":
      return imagemOk(d.url) ? <Image style={{ ...s.img, height: 200 }} src={d.url} /> : null;

    case "duas_colunas":
      return (
        <View>
          {d.titulo && <Text style={s.h2}>{d.titulo}</Text>}
          {htmlParaTexto(d.html).map((l, i) => <Text key={i} style={s.p}>{l}</Text>)}
          {imagemOk(d.imagem_url) && <Image style={{ ...s.img, height: 170 }} src={d.imagem_url} />}
        </View>
      );

    case "pacote": {
      const valor = valorExibido(d);   // valor REAL (sem máscara)
      return (
        <View style={s.card} wrap={false}>
          {d.nome && <Text style={s.cardNome}>{d.nome}</Text>}
          {itensDoPacote(d.itens_html, d.itens).map((l, i) => <Text key={i} style={s.item}>{l}</Text>)}
          {valor && (<><Text style={s.valorLbl}>VALOR</Text><Text style={s.valor}>{valor}</Text></>)}
        </View>
      );
    }

    case "pacotes": {
      const lista = (d.pacotes ?? []).filter((p) => p.nome || p.itens_html || (p.itens?.length ?? 0) > 0);
      if (!lista.length) return null;
      return (
        <View>
          {d.titulo && <Text style={s.h2}>{d.titulo}</Text>}
          {/* 2 por linha para caber na página com folga */}
          {Array.from({ length: Math.ceil(lista.length / 2) }, (_, linha) => (
            <View key={linha} style={s.colunas} wrap={false}>
              {lista.slice(linha * 2, linha * 2 + 2).map((p, i) => {
                const valor = valorExibido({ valor: p.valor, valor_prefixo: p.valor_prefixo });
                return (
                  <View key={i} style={s.coluna}>
                    {p.etiqueta && <Text style={{ fontSize: 8.5, color: "#2563EB", marginBottom: 3 }}>{p.etiqueta}</Text>}
                    <Text style={s.cardNome}>{p.nome}</Text>
                    {itensDoPacote(p.itens_html, p.itens).map((l, j) => <Text key={j} style={s.item}>{l}</Text>)}
                    {valor && (<><Text style={s.valorLbl}>VALOR</Text><Text style={s.valor}>{valor}</Text></>)}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      );
    }

    case "pagamento": {
      const cond = (d.condicoes ?? []).filter((c) => c.rotulo || c.descricao);
      return (
        <View>
          {d.titulo && <Text style={s.h2}>{d.titulo}</Text>}
          {htmlParaTexto(d.intro_html).map((l, i) => <Text key={i} style={s.p}>{l}</Text>)}
          {cond.map((c, i) => (
            <View key={i} style={s.pgtoLinha} wrap={false}>
              <Text style={s.pgtoRot}>{c.rotulo}</Text>
              <Text style={s.pgtoDesc}>{c.descricao}</Text>
            </View>
          ))}
        </View>
      );
    }

    case "galeria": {
      const fotos = (d.fotos ?? []).filter(imagemOk).slice(0, MAX_FOTOS_GALERIA);
      if (!fotos.length) return null;
      return (
        <View>
          {d.titulo && <Text style={s.h2}>{d.titulo}</Text>}
          <View style={s.grade}>{fotos.map((f, i) => <Image key={i} style={s.gradeFoto} src={f} />)}</View>
        </View>
      );
    }

    // Sem sentido no papel: formulário, botão, whatsapp, vídeo, divisor, espaço, cards, depoimentos.
    default:
      return null;
  }
}

export async function gerarPropostaPdf({ titulo, blocos, fotografo }: {
  titulo: string;
  blocos: SiteBloco[];
  fotografo: FotografoPdf;
}): Promise<Buffer> {
  const hoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const contato = [fotografo.whatsapp || fotografo.telefone, fotografo.email, fotografo.site]
    .filter(Boolean).join("  ·  ");

  const doc = (
    <Document title={titulo} author={fotografo.nome_empresa ?? "Proposta"}>
      <Page size="A4" style={s.pagina}>
        {imagemOk(fotografo.logo_url)
          ? <Image style={s.logo} src={fotografo.logo_url} />
          : fotografo.nome_empresa ? <Text style={s.empresa}>{fotografo.nome_empresa}</Text> : null}

        <Text style={s.titulo}>{titulo}</Text>
        <Text style={s.subtitulo}>Proposta gerada em {hoje}</Text>

        {blocos.map((b) => <BlocoPdf key={b.id} b={b} />)}

        {contato && <Text style={s.rodape} fixed>{contato}</Text>}
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
