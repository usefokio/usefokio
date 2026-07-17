"use client";

// Modal "Configurações da página" (engrenagem) — abas Geral / Redes Sociais / SEO.
// Controlado: edita `valores` no estado do editor pai (onChange); Salvar persiste via onSalvar do pai.
// Reutilizado por trabalhos, posts, páginas e portfólios (mostra a aba Geral conforme `recursos`).
import { useRef, useState } from "react";
import { uploadFileClient } from "@/lib/storage/uploadClient";
import { processarImagemEntrega } from "@/lib/imageResize";
import { MODOS_EXIBICAO, slugifySite, type ConfigPaginaValores } from "@/lib/site/seo";
import { auditarConfigPagina, pontuar } from "@/lib/site/seoAudit";
import { SeoDicas, SeoNota } from "./SeoDica";
import { BotaoIA } from "./BotaoIA";

type Aba = "geral" | "redes" | "seo";

const input: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8, boxSizing: "border-box",
  border: "1px solid var(--color-border-secondary)", fontSize: 13,
  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
};
const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", display: "block", marginBottom: 6 };
const contador = (n: number, max: number): React.CSSProperties => ({ fontSize: 10, color: n > max ? "#DC2626" : "var(--color-text-secondary)", textAlign: "right", marginTop: 3 });

export function ConfigPaginaModal({
  onFechar, onSalvar, valores, onChange, recursos,
  urlPublica, dominio, tituloFallback, descricaoFallback, imagemFallback, fotografoId, salvando, sugestao,
}: {
  onFechar: () => void;                                // Cancelar (reverte as edições do modal)
  onSalvar: () => void;                                // Salvar (persiste via editor pai)
  valores: ConfigPaginaValores;
  onChange: (patch: Partial<ConfigPaginaValores>) => void;
  recursos: { url?: boolean; data?: boolean; exibicao?: boolean };
  urlPublica: string;                                  // path público (ex.: /portfolio/casamentos/123-slug)
  dominio: string;                                     // ex.: www.fernandoagrelafotografia.com.br
  tituloFallback: string;
  descricaoFallback?: string;
  imagemFallback?: string | null;
  fotografoId: string;
  salvando?: boolean;
  // Sugestão do BRIEFING (páginas genéricas como Sobre/Contato) — preenche só os campos vazios,
  // o fotógrafo revisa e salva. Sem a prop, o modal fica idêntico (páginas pontuais não mudam).
  sugestao?: { title: string; description: string; keywords: string };
}) {
  const [iniciais] = useState(valores); // snapshot para o Cancelar reverter
  const temGeral = !!(recursos.url || recursos.data || recursos.exibicao);
  const [aba, setAba] = useState<Aba>(temGeral ? "geral" : "seo");
  const [enviandoOg, setEnviandoOg] = useState(false);
  const inputOg = useRef<HTMLInputElement>(null);

  const seg = urlPublica.split("/").filter(Boolean);
  // Análise de SEO ao vivo dos campos do modal (título/descrição/keywords/OG/noindex).
  const achados = auditarConfigPagina(valores, { titulo: tituloFallback, descricao: descricaoFallback, imagem: imagemFallback });
  const nota = pontuar(achados);
  const segTitulo = valores.seo_title.trim() || tituloFallback;
  const segDesc = valores.seo_description.trim() || descricaoFallback || "";
  const ogTitulo = valores.og_title.trim() || segTitulo;
  const ogDesc = valores.og_description.trim() || segDesc;
  const ogImg = valores.og_image_url || imagemFallback || null;

  async function enviarOg(files: FileList | null) {
    if (!files || !files[0]) return;
    setEnviandoOg(true);
    try {
      const { blob } = await processarImagemEntrega(files[0], 1200, 0.85);
      const path = `site/${fotografoId}/og/og-${crypto.randomUUID().slice(0, 6)}.jpg`;
      const { url_publica } = await uploadFileClient(path, blob);
      onChange({ og_image_url: url_publica });
    } catch { /* silencioso; o pai mostra erro geral se salvar falhar */ }
    setEnviandoOg(false);
    if (inputOg.current) inputOg.current.value = "";
  }

  const cancelar = () => { onChange(iniciais); onFechar(); };

  const abas: { id: Aba; nome: string; mostrar: boolean }[] = [
    { id: "geral", nome: "Geral", mostrar: temGeral },
    { id: "redes", nome: "Redes Sociais", mostrar: true },
    { id: "seo", nome: "SEO", mostrar: true },
  ];

  return (
    <div onClick={cancelar} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", borderRadius: 14, width: "100%", maxWidth: 720, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", overflow: "hidden" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--color-border-tertiary)" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text-primary)" }}>Configurações da página</div>
          <button onClick={cancelar} style={{ border: "none", background: "transparent", fontSize: 20, color: "var(--color-text-secondary)", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          {/* nav de abas */}
          <div style={{ width: 140, flex: "0 0 auto", borderRight: "1px solid var(--color-border-tertiary)", padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
            {abas.filter((a) => a.mostrar).map((a) => (
              <button key={a.id} onClick={() => setAba(a.id)}
                style={{ textAlign: "left", padding: "9px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13,
                  fontWeight: aba === a.id ? 700 : 500,
                  background: aba === a.id ? "var(--color-background-tertiary)" : "transparent",
                  color: aba === a.id ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>
                {a.nome}
              </button>
            ))}
          </div>

          {/* conteúdo */}
          <div style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "20px 22px" }}>
            {aba === "geral" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {recursos.url && (
                  <div>
                    <label style={label}>Personalize a URL</label>
                    <input value={valores.slug} onChange={(e) => onChange({ slug: slugifySite(e.target.value) })}
                      style={{ ...input, fontFamily: "var(--font-mono)", fontSize: 12 }} />
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 5, fontFamily: "var(--font-mono)", wordBreak: "break-all" }}>{dominio}{urlPublica}</div>
                  </div>
                )}
                {recursos.data && (
                  <div>
                    <label style={label}>Mostrar data</label>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: "var(--color-text-secondary)" }}>
                      <input type="checkbox" checked={valores.mostrar_data} onChange={(e) => onChange({ mostrar_data: e.target.checked })} style={{ width: 16, height: 16, accentColor: "#2563EB" }} />
                      Exibir a data na página
                    </label>
                  </div>
                )}
                {recursos.exibicao && (
                  <div>
                    <label style={label}>Modo de exibição das imagens</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {MODOS_EXIBICAO.map((m) => {
                        const on = valores.modo_exibicao === m.valor;
                        return (
                          <button key={m.valor} onClick={() => onChange({ modo_exibicao: m.valor })}
                            style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left", padding: "10px 14px", borderRadius: 8, cursor: "pointer",
                              border: on ? "1.5px solid #2563EB" : "1px solid var(--color-border-tertiary)",
                              background: on ? "rgba(37,99,235,0.06)" : "var(--color-background-primary)" }}>
                            <span style={{ width: 14, height: 14, borderRadius: "50%", flex: "0 0 auto", border: on ? "4px solid #2563EB" : "1.5px solid var(--color-border-secondary)" }} />
                            <span style={{ fontSize: 13, fontWeight: on ? 700 : 500, color: "var(--color-text-primary)" }}>{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {aba === "redes" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Exemplo de exibição nas redes sociais</div>
                <div style={{ border: "1px solid var(--color-border-tertiary)", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ position: "relative", background: "var(--color-background-tertiary)", minHeight: 150, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {ogImg
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={ogImg} alt="" style={{ width: "100%", maxHeight: 220, objectFit: "cover", display: "block" }} />
                      : <span style={{ fontSize: 30, color: "var(--color-border-secondary)" }}>🖼️</span>}
                    <button onClick={() => inputOg.current?.click()} disabled={enviandoOg}
                      style={{ position: "absolute", padding: "8px 16px", borderRadius: 999, border: "none", background: "#2563EB", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 10px rgba(0,0,0,0.25)" }}>
                      {enviandoOg ? "Enviando…" : "Escolher imagem"}
                    </button>
                  </div>
                  <div style={{ padding: "10px 12px", borderTop: "1px solid var(--color-border-tertiary)" }}>
                    <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{dominio}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)", margin: "2px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ogTitulo || "Título da página"}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ogDesc || "Descrição da página…"}</div>
                  </div>
                </div>
                {valores.og_image_url && <button onClick={() => onChange({ og_image_url: null })} style={{ alignSelf: "flex-start", border: "none", background: "transparent", color: "#DC2626", fontSize: 11, cursor: "pointer", padding: 0 }}>Remover imagem (usa a capa)</button>}
                <input ref={inputOg} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => enviarOg(e.target.files)} />
                <div>
                  <label style={label}>Título</label>
                  <input value={valores.og_title} onChange={(e) => onChange({ og_title: e.target.value })} maxLength={120} style={input} placeholder={segTitulo} />
                  <div style={contador(valores.og_title.length, 100)}>{valores.og_title.length}/100</div>
                </div>
                <div>
                  <label style={label}>Descrição</label>
                  <textarea value={valores.og_description} onChange={(e) => onChange({ og_description: e.target.value })} rows={3} maxLength={300} style={{ ...input, resize: "vertical" }} placeholder={segDesc} />
                  <div style={contador(valores.og_description.length, 250)}>{valores.og_description.length}/250</div>
                </div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Se deixados em branco, as redes usam o título e a descrição do SEO.</div>
              </div>
            )}

            {aba === "seo" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* nota + dicas ao vivo */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <SeoNota nota={nota} />
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                    <strong style={{ color: "var(--color-text-primary)" }}>Nota de SEO desta página.</strong> Preencha os campos abaixo seguindo as dicas — a nota atualiza na hora.
                  </div>
                </div>
                <SeoDicas achados={achados} />
                {/* Sugestão do briefing — preenche só os vazios; o fotógrafo revisa e salva */}
                {sugestao && (!valores.seo_title.trim() || !valores.seo_description.trim() || !valores.seo_keywords.trim()) && (
                  <div style={{ border: "1px solid rgba(37,99,235,0.3)", borderRadius: 10, padding: "12px 14px", background: "rgba(37,99,235,0.04)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--color-text-primary)" }}>✨ Sugestão do seu briefing</span>
                      <button
                        onClick={() => {
                          const patch: Partial<ConfigPaginaValores> = {};
                          if (!valores.seo_title.trim()) patch.seo_title = sugestao.title;
                          if (!valores.seo_description.trim()) patch.seo_description = sugestao.description;
                          if (!valores.seo_keywords.trim()) patch.seo_keywords = sugestao.keywords;
                          onChange(patch);
                        }}
                        style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#2563EB", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        Aplicar nos campos vazios
                      </button>
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                      {!valores.seo_title.trim() && <div><strong>Título:</strong> {sugestao.title}</div>}
                      {!valores.seo_description.trim() && <div><strong>Descrição:</strong> {sugestao.description}</div>}
                      {!valores.seo_keywords.trim() && <div><strong>Palavras-chave:</strong> {sugestao.keywords}</div>}
                    </div>
                  </div>
                )}
                {/* prévia Google */}
                <div style={{ border: "1px solid var(--color-border-tertiary)", borderRadius: 10, padding: "14px 16px", background: "#fff" }}>
                  <div style={{ fontSize: 13, color: "#202124", marginBottom: 6, fontWeight: 700 }}><span style={{ color: "#4285F4" }}>G</span><span style={{ color: "#EA4335" }}>o</span><span style={{ color: "#FBBC05" }}>o</span><span style={{ color: "#4285F4" }}>g</span><span style={{ color: "#34A853" }}>l</span><span style={{ color: "#EA4335" }}>e</span></div>
                  <div style={{ fontSize: 12, color: "#4d5156", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>https://{dominio}{seg.length ? " › " + seg.join(" › ") : ""}</div>
                  <div style={{ fontSize: 18, color: "#1a0dab", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{segTitulo}</div>
                  <div style={{ fontSize: 12.5, color: "#4d5156", lineHeight: 1.5, marginTop: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{segDesc || "Descrição exibida nos resultados de busca."}</div>
                </div>
                <div>
                  <label style={label}>Título</label>
                  <input value={valores.seo_title} onChange={(e) => onChange({ seo_title: e.target.value })} maxLength={120} style={input} placeholder={tituloFallback} />
                  <div style={contador(valores.seo_title.length, 100)}>{valores.seo_title.length}/100</div>
                </div>
                <div>
                  <label style={label}>Descrição</label>
                  <textarea value={valores.seo_description} onChange={(e) => onChange({ seo_description: e.target.value })} rows={3} maxLength={300} style={{ ...input, resize: "vertical" }} placeholder="Descrição de até ~250 caracteres exibida na busca." />
                  <div style={contador(valores.seo_description.length, 250)}>{valores.seo_description.length}/250</div>
                </div>
                <div>
                  <label style={label}>Palavras-chave</label>
                  <textarea value={valores.seo_keywords} onChange={(e) => onChange({ seo_keywords: e.target.value })} rows={3} maxLength={300} style={{ ...input, resize: "vertical" }} placeholder="separadas por vírgula" />
                  <div style={contador(valores.seo_keywords.length, 250)}>{valores.seo_keywords.length}/250</div>
                </div>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", padding: "12px 14px", borderRadius: 8, border: "1px solid var(--color-border-tertiary)", background: valores.seo_noindex ? "rgba(220,38,38,0.06)" : "var(--color-background-secondary)" }}>
                  <input type="checkbox" checked={valores.seo_noindex} onChange={(e) => onChange({ seo_noindex: e.target.checked })} style={{ width: 16, height: 16, marginTop: 1, accentColor: "#DC2626" }} />
                  <span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", display: "block" }}>Não indexar esta página (noindex)</span>
                    <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>A página fica acessível pelo link, mas não aparece nos buscadores.</span>
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, padding: "14px 20px", borderTop: "1px solid var(--color-border-tertiary)" }}>
          <div style={{ marginRight: "auto" }}><BotaoIA compacto contexto={{ tipo: "descricao", entidade: "pagina", campos: { titulo: segTitulo } }} /></div>
          <button onClick={cancelar} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>Cancelar</button>
          <button onClick={onSalvar} disabled={salvando} style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: "#2563EB", color: "#fff", fontSize: 13, fontWeight: 700, cursor: salvando ? "default" : "pointer" }}>{salvando ? "Salvando…" : "Salvar"}</button>
        </div>
      </div>
    </div>
  );
}
