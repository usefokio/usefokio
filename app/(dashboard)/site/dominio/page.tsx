"use client";

// Domínio do site: publicação + subdomínio UseFokio (grátis) + domínio próprio (self-service).
// Subdomínio: validação ao vivo + checagem de disponibilidade; salvar via botão (useEditorEstado).
// Domínio próprio: ação explícita "Conectar domínio" → status (pendente_dns/verificando/ativo/erro)
// + registros DNS a criar + "Verificar agora" (checagem DNS real). Tutorial em popup.
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { useEditorEstado, SeloEstado, BotaoSalvarEstado, ModalNaoSalvo } from "@/app/(dashboard)/_components/EditorEstado";
import { REGEX_SUBDOMINIO, SUBDOMINIOS_RESERVADOS, slugSub, normalizarHost, CNAME_TARGET_DOMINIO } from "@/lib/site/publico";
import { urlPublicaSite } from "@/lib/site/urlPublica";
import { TutorialDominioModal } from "./_components/TutorialDominioModal";
import type { RegistroDns } from "@/lib/supabase/types";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8, boxSizing: "border-box",
  border: "1px solid var(--color-border-secondary)", fontSize: 13,
  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)",
  textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5,
};
const boxStyle: React.CSSProperties = { padding: "14px 16px", borderRadius: 12, border: "1px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" };
const ajudaStyle: React.CSSProperties = { fontSize: 11, color: "var(--color-text-secondary)", lineHeight: 1.6 };
const btnSec: React.CSSProperties = { padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" };

type DominioStatus = "nenhum" | "pendente_dns" | "verificando" | "ativo" | "erro";
type Disp = null | "checando" | "ok" | "em_uso" | "formato" | "reservado";

const STATUS_INFO: Record<DominioStatus, { rotulo: string; cor: string; fundo: string }> = {
  nenhum:       { rotulo: "Não conectado",            cor: "#6B7280", fundo: "rgba(107,114,128,0.12)" },
  pendente_dns: { rotulo: "Aguardando DNS",           cor: "#B45309", fundo: "rgba(245,158,11,0.15)" },
  verificando:  { rotulo: "DNS ok — emitindo HTTPS",  cor: "#1D4ED8", fundo: "rgba(37,99,235,0.10)" },
  ativo:        { rotulo: "Ativo",                    cor: "#059669", fundo: "rgba(16,185,129,0.12)" },
  erro:         { rotulo: "Erro",                     cor: "#DC2626", fundo: "rgba(220,38,38,0.10)" },
};

export default function SiteDominioPage() {
  const { fotografo } = useFotografo();
  const [publicado, setPublicado] = useState(false);
  const [subdominio, setSubdominio] = useState(""); // valor em edição
  const [subSalvo, setSubSalvo] = useState("");     // valor persistido (evita checar disponibilidade do próprio)
  const [disp, setDisp] = useState<Disp>(null);

  // Domínio próprio (ações explícitas, fora do snapshot de Salvar)
  const [dominioInput, setDominioInput] = useState("");
  const [dominio, setDominio] = useState<string | null>(null);
  const [status, setStatus] = useState<DominioStatus>("nenhum");
  const [registros, setRegistros] = useState<RegistroDns[]>([]);
  const [erroDominio, setErroDominio] = useState<string | null>(null);
  const [checadoEm, setChecadoEm] = useState<string | null>(null);
  const [conectando, setConectando] = useState(false);
  const [verificando, setVerificando] = useState(false);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [tutorial, setTutorial] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const snapshotAtual = JSON.stringify([publicado, subdominio]);
  const estado = useEditorEstado(snapshotAtual, "/site");

  useEffect(() => {
    if (!fotografo) return;
    createClient().from("site_config")
      .select("publicado, subdominio, dominio_customizado, dominio_status, dominio_verificacao, dominio_erro, dominio_checado_em")
      .eq("fotografo_id", fotografo.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPublicado(data.publicado ?? false);
          setSubdominio(data.subdominio ?? "");
          setSubSalvo(data.subdominio ?? "");
          setDominio(data.dominio_customizado ?? null);
          setStatus((data.dominio_status as DominioStatus) ?? "nenhum");
          setRegistros((data.dominio_verificacao as RegistroDns[]) ?? []);
          setErroDominio(data.dominio_erro ?? null);
          setChecadoEm(data.dominio_checado_em ?? null);
        }
        estado.inicializar(JSON.stringify([data?.publicado ?? false, data?.subdominio ?? ""]));
        setCarregando(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fotografo]);

  // Disponibilidade do subdomínio (debounce), só quando válido e diferente do já salvo.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const sub = subdominio.trim();
    if (!sub || sub === subSalvo) { setDisp(null); return; }
    if (!REGEX_SUBDOMINIO.test(sub)) { setDisp("formato"); return; }
    if (SUBDOMINIOS_RESERVADOS.has(sub)) { setDisp("reservado"); return; }
    setDisp("checando");
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/site/endereco/disponibilidade?tipo=subdominio&valor=${encodeURIComponent(sub)}`);
        const j = await r.json();
        setDisp(j.disponivel ? "ok" : (j.motivo === "reservado" ? "reservado" : j.motivo === "formato" ? "formato" : "em_uso"));
      } catch { setDisp(null); }
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [subdominio, subSalvo]);

  async function salvar(): Promise<boolean> {
    if (!fotografo) return false;
    const sub = subdominio.trim();
    if (sub) {
      if (!REGEX_SUBDOMINIO.test(sub)) { setMsg("Erro: subdomínio inválido — use só letras minúsculas, números e hífen (sem começar/terminar com hífen)."); return false; }
      if (SUBDOMINIOS_RESERVADOS.has(sub)) { setMsg(`Erro: o subdomínio "${sub}" é reservado pelo sistema — escolha outro.`); return false; }
      if (disp === "em_uso") { setMsg(`Erro: o subdomínio "${sub}" já está em uso por outro fotógrafo.`); return false; }
    }
    setSalvando(true); setMsg(null);
    const { error } = await createClient().from("site_config").upsert({
      fotografo_id: fotografo.id,
      publicado,
      subdominio: sub || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "fotografo_id" });
    setSalvando(false);
    if (error) {
      setMsg(error.code === "23505" ? `Erro: o subdomínio "${sub}" já está em uso por outro fotógrafo.` : "Erro: " + error.message);
      return false;
    }
    setSubSalvo(sub); setDisp(null);
    estado.marcarSalvo(snapshotAtual);
    setMsg("Endereço salvo!");
    return true;
  }

  // Rótulo do CNAME no painel do provedor: "www" quando o host começa com www; senão o host completo.
  const rotuloCname = (host: string) => (host.startsWith("www.") ? "www" : host);

  async function conectarDominio() {
    if (!fotografo) return;
    const host = normalizarHost(dominioInput.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, ""));
    if (!host || !host.includes(".")) { setMsg("Erro: digite um domínio válido (ex.: www.seudominio.com.br)."); return; }
    if (host.endsWith(".usefokio.com.br") || host === "usefokio.com.br") { setMsg("Erro: este campo é para o SEU domínio — o subdomínio UseFokio é configurado acima."); return; }
    setConectando(true); setMsg(null);
    try {
      const r = await fetch(`/api/site/endereco/disponibilidade?tipo=dominio&valor=${encodeURIComponent(host)}`);
      const j = await r.json();
      if (!j.disponivel) { setMsg(`Erro: o domínio "${host}" já está conectado a outro site.`); setConectando(false); return; }
    } catch { /* segue — o UNIQUE do banco é a barreira final */ }
    const novosRegistros: RegistroDns[] = [
      { tipo: "CNAME", nome: rotuloCname(host), valor: CNAME_TARGET_DOMINIO, papel: "roteamento" },
    ];
    const { error } = await createClient().from("site_config").upsert({
      fotografo_id: fotografo.id,
      dominio_customizado: host,
      dominio_status: "pendente_dns",
      dominio_verificacao: novosRegistros,
      dominio_erro: null,
      dominio_checado_em: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "fotografo_id" });
    setConectando(false);
    if (error) {
      setMsg(error.code === "23505" ? `Erro: o domínio "${host}" já está conectado a outro site.` : "Erro: " + error.message);
      return;
    }
    setDominio(host); setStatus("pendente_dns"); setRegistros(novosRegistros); setErroDominio(null); setChecadoEm(null);
    setDominioInput("");
  }

  async function desconectarDominio() {
    if (!fotografo || !dominio) return;
    if (!confirm(`Desconectar o domínio ${dominio}? O site continua no ar pelo subdomínio.`)) return;
    const { error } = await createClient().from("site_config").update({
      dominio_customizado: null, dominio_status: "nenhum", dominio_verificacao: null,
      dominio_cf_hostname_id: null, dominio_ssl_status: null, dominio_erro: null, dominio_checado_em: null,
      updated_at: new Date().toISOString(),
    }).eq("fotografo_id", fotografo.id);
    if (error) { setMsg("Erro: " + error.message); return; }
    setDominio(null); setStatus("nenhum"); setRegistros([]); setErroDominio(null); setChecadoEm(null);
  }

  async function verificarAgora() {
    setVerificando(true); setMsg(null);
    try {
      const r = await fetch("/api/site/dominio/verificar", { method: "POST" });
      const j = await r.json();
      if (r.ok) { setStatus(j.status as DominioStatus); setErroDominio(j.detalhe ?? null); setChecadoEm(new Date().toISOString()); }
      else setMsg("Erro: " + (j.erro ?? "falha na verificação."));
    } catch { setMsg("Erro: não foi possível verificar agora — tente novamente."); }
    setVerificando(false);
  }

  function copiar(valor: string) {
    navigator.clipboard?.writeText(valor).then(() => {
      setCopiado(valor);
      setTimeout(() => setCopiado(null), 1500);
    });
  }

  if (carregando) return <div style={{ padding: 60, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>;

  const cfgUrl = { subdominio: subSalvo || null, dominio_customizado: dominio, publicado };
  const urlSite = fotografo ? urlPublicaSite(cfgUrl, fotografo.id) : "#";
  const si = STATUS_INFO[status];

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>Domínio</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setTutorial(true)} style={btnSec}>🎬 Como configurar — ver tutorial</button>
          <SeloEstado temAlteracoes={estado.temAlteracoes} />
        </div>
      </div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 24px", lineHeight: 1.6 }}>
        O endereço onde o seu site fica no ar: o subdomínio gratuito do UseFokio e, se quiser, o seu domínio próprio.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* ── Publicação ── */}
        <div style={boxStyle}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
            <input type="checkbox" checked={publicado} onChange={(e) => setPublicado(e.target.checked)} style={{ width: 16, height: 16 }} />
            Site publicado
          </label>
          <div style={{ ...ajudaStyle, marginTop: 8 }}>
            Enquanto o site não está publicado, os endereços abaixo não funcionam — só a prévia interna pelo painel.
            Publique quando o conteúdo estiver pronto.
          </div>
        </div>

        {/* ── Subdomínio ── */}
        <div style={boxStyle}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>Subdomínio UseFokio (grátis)</div>
          <div style={{ ...ajudaStyle, marginBottom: 10 }}>
            Endereço gratuito no formato <strong>seunome.usefokio.com.br</strong>. Fica no ar na hora, sem configuração externa.
          </div>
          <label style={labelStyle}>Escolha o seu subdomínio</label>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <input value={subdominio} onChange={(e) => setSubdominio(slugSub(e.target.value))} style={{ ...inputStyle, width: 200 }} placeholder="seunome" />
            <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>.usefokio.com.br</span>
            {disp === "checando" && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>verificando…</span>}
            {disp === "ok" && <span style={{ fontSize: 12, fontWeight: 700, color: "#059669" }}>✓ disponível</span>}
            {disp === "em_uso" && <span style={{ fontSize: 12, fontWeight: 700, color: "#DC2626" }}>✗ já em uso</span>}
            {disp === "reservado" && <span style={{ fontSize: 12, fontWeight: 700, color: "#DC2626" }}>✗ reservado pelo sistema</span>}
            {disp === "formato" && <span style={{ fontSize: 12, fontWeight: 700, color: "#B45309" }}>não pode começar/terminar com hífen</span>}
          </div>
          <div style={{ ...ajudaStyle, marginTop: 8 }}>
            Só letras minúsculas, números e hífen. Este endereço é seu enquanto sua conta estiver ativa.
          </div>
          {subSalvo && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12.5, color: "var(--color-text-secondary)" }}>
                Seu endereço: <strong style={{ color: "var(--color-text-primary)" }}>{subSalvo}.usefokio.com.br</strong>
              </span>
              <a href={urlSite} target="_blank" rel="noopener noreferrer" style={{ ...btnSec, textDecoration: "none", padding: "6px 12px" }}>
                {publicado ? "Ver site ↗" : "Ver prévia ↗"}
              </a>
              {!publicado && <span style={{ fontSize: 11, color: "#B45309", fontWeight: 600 }}>⚠️ o endereço só serve o site depois de publicado</span>}
            </div>
          )}
        </div>

        {/* ── Domínio próprio ── */}
        <div style={boxStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)" }}>Domínio próprio</div>
            {dominio && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 10, color: si.cor, background: si.fundo }}>{si.rotulo}</span>
            )}
          </div>

          {!dominio ? (
            <>
              <div style={{ ...ajudaStyle, marginBottom: 10 }}>
                Use o endereço da sua marca (ex.: <strong>www.seudominio.com.br</strong>). O domínio continua registrado
                no seu nome, no seu provedor — você só aponta o site para o UseFokio. Seu e-mail não é afetado.
              </div>
              <label style={labelStyle}>Seu domínio</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input value={dominioInput} onChange={(e) => setDominioInput(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 220 }} placeholder="www.seudominio.com.br" />
                <button onClick={conectarDominio} disabled={conectando || !dominioInput.trim()}
                  style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 12.5, fontWeight: 700, cursor: "pointer", opacity: conectando || !dominioInput.trim() ? 0.6 : 1 }}>
                  {conectando ? "Conectando…" : "Conectar domínio"}
                </button>
              </div>
              <div style={{ ...ajudaStyle, marginTop: 8 }}>
                💡 Recomendamos usar o endereço com <strong>www</strong>. Ainda não tem um domínio? Registre no
                Registro.br (domínios .br) ou no provedor da sua preferência e volte aqui.
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)", margin: "2px 0 10px" }}>{dominio}</div>

              {/* registros DNS a criar */}
              {registros.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ ...ajudaStyle, marginBottom: 6 }}>
                    Crie este registro no painel DNS do seu provedor (onde o domínio foi registrado):
                  </div>
                  <div style={{ border: "1px solid var(--color-border-tertiary)", borderRadius: 8, overflow: "hidden" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "70px 1fr 1.6fr 34px", gap: 0, fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", padding: "7px 10px", background: "var(--color-background-primary)", borderBottom: "1px solid var(--color-border-tertiary)" }}>
                      <span>Tipo</span><span>Nome</span><span>Valor</span><span />
                    </div>
                    {registros.map((r, i) => (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "70px 1fr 1.6fr 34px", alignItems: "center", padding: "8px 10px", fontSize: 12.5, fontFamily: "var(--font-mono)", color: "var(--color-text-primary)", background: "var(--color-background-primary)", borderBottom: i < registros.length - 1 ? "1px solid var(--color-border-tertiary)" : "none" }}>
                        <span style={{ fontWeight: 700 }}>{r.tipo}</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.nome}</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.valor}</span>
                        <button onClick={() => copiar(r.valor)} title="Copiar valor" style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: copiado === r.valor ? "#059669" : "var(--color-text-secondary)" }}>
                          {copiado === r.valor ? "✓" : "⧉"}
                        </button>
                      </div>
                    ))}
                  </div>
                  <div style={{ ...ajudaStyle, marginTop: 6 }}>
                    “Nome” é o campo host/subdomínio do seu painel (em alguns provedores aparece como o endereço completo).
                    A propagação pode levar de minutos até 24h.
                  </div>
                </div>
              )}

              {/* status + erro + ações */}
              {erroDominio && status !== "ativo" && (
                <div style={{ fontSize: 12, color: "#B45309", lineHeight: 1.6, marginBottom: 8 }}>⚠️ {erroDominio}</div>
              )}
              {status === "verificando" && (
                <div style={{ fontSize: 12, color: "#1D4ED8", lineHeight: 1.6, marginBottom: 8 }}>
                  ✓ DNS apontado corretamente. Estamos providenciando o certificado de segurança (HTTPS) do seu domínio —
                  você será avisado quando ficar ativo.
                </div>
              )}
              {status === "ativo" && (
                <div style={{ fontSize: 12, color: "#059669", fontWeight: 600, lineHeight: 1.6, marginBottom: 8 }}>
                  ✓ Seu site está no ar em <a href={`https://${dominio}`} target="_blank" rel="noopener noreferrer" style={{ color: "#059669" }}>{dominio}</a>.
                </div>
              )}
              {checadoEm && (
                <div style={{ ...ajudaStyle, marginBottom: 8 }}>Última verificação: {new Date(checadoEm).toLocaleString("pt-BR")}</div>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={verificarAgora} disabled={verificando} style={{ ...btnSec, opacity: verificando ? 0.6 : 1 }}>
                  {verificando ? "Verificando…" : "Verificar agora"}
                </button>
                <button onClick={desconectarDominio} style={{ ...btnSec, color: "#DC2626", borderColor: "rgba(220,38,38,0.4)" }}>Desconectar</button>
              </div>
            </>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, alignItems: "center" }}>
          {msg && <span style={{ fontSize: 13, fontWeight: 600, color: msg.startsWith("Erro") ? "#DC2626" : "#059669" }}>{msg}</span>}
          <BotaoSalvarEstado temAlteracoes={estado.temAlteracoes} salvando={salvando} onClick={() => salvar()} />
        </div>
      </div>

      {tutorial && <TutorialDominioModal onFechar={() => setTutorial(false)} />}

      <ModalNaoSalvo
        aberto={estado.modalAberto}
        salvando={salvando}
        onSalvarESair={async () => { if (await salvar()) estado.sairAgora(); }}
        onSairSemSalvar={estado.sairAgora}
        onContinuar={estado.fecharModal}
      />
    </div>
  );
}
