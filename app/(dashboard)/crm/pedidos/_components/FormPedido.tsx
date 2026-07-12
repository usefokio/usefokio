"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { isValidDate, formatNum, mascaraValor, parsearValor } from "@/lib/utils/format";
import { Field } from "@/components/ui/Field";
import { inputStyle } from "@/lib/styles";
import { ClienteSelect } from "@/components/ui/ClienteSelect";
import { ComboSelect } from "@/components/ui/ComboSelect";
import { ProdutoSearch } from "@/components/ui/ProdutoSearch";
import type { CrmOrder, CrmProduct, Cliente, CrmProductCategory } from "@/lib/supabase/types";
import { useUnsavedGuard } from "@/lib/hooks/useUnsavedGuard";
import { SeloEstado, ModalNaoSalvo } from "@/app/(dashboard)/_components/EditorEstado";

// ── Tipos locais ──────────────────────────────────────────────────────────────

type FormData = {
  nome: string;
  cliente_id: string;
  categoria: string;
  status: CrmOrder["status"];
  total: string;
  discount: string;
  other_expenses: string;
  data_evento: string;
  hora_evento: string;
  local_evento: string;
  convidados: string;
  local_cerimonia: string;
  local_recepcao: string;
  observacoes: string;
};

type ItemPedido = {
  tmpId: string;
  produto_id: string | null;
  descricao: string;
  quantidade: number;
  preco_unit: number;
};

type Intervalo = "mensal" | "quinzenal" | "semanal" | "unico";

type PlanoItem = {
  tmpId: string;
  forma: string;
  dataPrazo: string;
  numDocumento: string;
  numParcelas: number;
  intervalo: Intervalo;
  percentual: string;
  valor: string;
  obs: string;
  parcelasOverride: ParcelaPreview[] | null;
};

type ParcelaPreview = { vencimento: string; valor: number; label: string };

// ── Constantes ────────────────────────────────────────────────────────────────

const EMPTY: FormData = {
  nome: "", cliente_id: "", categoria: "", status: "aguardando_sinal",
  total: "", discount: "0", other_expenses: "0",
  data_evento: "", hora_evento: "", local_evento: "", convidados: "",
  local_cerimonia: "", local_recepcao: "", observacoes: "",
};

const EMPTY_PLANO: Omit<PlanoItem, "tmpId"> = {
  forma: "", dataPrazo: "", numDocumento: "", numParcelas: 1,
  intervalo: "mensal", percentual: "", valor: "", obs: "", parcelasOverride: null,
};

const FORMAS_PAGAMENTO = [
  "Boleto", "Carnê", "Cartão de crédito", "Cartão de débito", "Cheque",
  "Dinheiro", "Pix", "Transferência",
];

const CATEGORIAS_PADRAO = [
  // Casamentos
  "Casamento - foto", "Casamento - Foto e Video", "Casamento - Video", "Bodas",
  // Eventos
  "Aniversário Adulto", "Aniversário Infantil", "Aniversário 15 anos", "Batizado", "Evento Corporativo",
  // Books/Ensaios
  "Ensaio/Book", "Ensaio Casal", "Ensaio Familia", "Ensaio Gestante", "Ensaio Infantil", "Ensaio Newborn", "Ensaio 15 anos", "Acompanhamento",
  // Albuns
  "Diagramação de livro/álbum",
  // Consultoria
  "Consultoria",
  // Cursos
  "Cursos e Treinamento",
  // Vídeos
  "Video Casamento", "Video cultural", "Video Geral",
  // Outros
  "Foto Produto", "Vendas Extras", "Outros Serviços",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function gerarId() { return Math.random().toString(36).slice(2); }

function addIntervalo(dateStr: string, n: number, intervalo: Intervalo): string {
  if (n === 0) return dateStr;
  const d = new Date(dateStr + "T12:00:00");
  if (intervalo === "mensal")     d.setMonth(d.getMonth() + n);
  else if (intervalo === "quinzenal") d.setDate(d.getDate() + 15 * n);
  else if (intervalo === "semanal")   d.setDate(d.getDate() + 7 * n);
  // "unico" → sem offset
  return d.toISOString().slice(0, 10);
}

function calcParcelas(plano: PlanoItem): ParcelaPreview[] {
  if (!plano.dataPrazo || plano.numParcelas < 1) return [];
  const total = parseFloat(plano.valor.replace(",", ".")) || 0;
  const n = plano.numParcelas;
  const vUnit = +(total / n).toFixed(2);
  return Array.from({ length: n }, (_, i) => ({
    vencimento: addIntervalo(plano.dataPrazo, i, plano.intervalo),
    valor: i === n - 1 ? +(total - vUnit * (n - 1)).toFixed(2) : vUnit,
    label: n === 1 ? (plano.obs || "Pagamento") : `Parcela ${i + 1}/${n}${plano.obs ? " — " + plano.obs : ""}`,
  }));
}

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  inicial?: Partial<FormData & { id: string; oportunidade_id: string }>;
  onSalvo?: (id: string, agendaAtualizado?: boolean) => void;
  /** Modo edição embutido (detalhe do pedido): fecha o editor no lugar de navegar. */
  onCancelar?: () => void;
};

// ── Componente ────────────────────────────────────────────────────────────────

export default function FormPedido({ inicial, onSalvo, onCancelar }: Props) {
  const router        = useRouter();
  const { fotografo } = useFotografo();

  const [form,     setForm]     = useState<FormData>({ ...EMPTY, ...inicial });
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  // Clientes — carregados pelo ClienteSelect internamente

  // Produtos
  const [produtos,     setProdutos]     = useState<CrmProduct[]>([]);
  const [itens,        setItens]        = useState<ItemPedido[]>([]);

  // Categorias (de produto = de pedido), com flags pede_data/pede_local/pede_horario
  const [pedCats,      setPedCats]      = useState<CrmProductCategory[]>([]);

  // Modal de produto
  const [modalProd,     setModalProd]     = useState<CrmProduct | null>(null);
  const [modalDescricao, setModalDescricao] = useState("");
  const [modalQtd,      setModalQtd]      = useState(1);
  const [modalPreco,    setModalPreco]    = useState("");

  // Planos de pagamento
  const [planos,             setPlanos]             = useState<PlanoItem[]>([]);
  const [modalPlano,         setModalPlano]         = useState<(PlanoItem & { editIdx: number | null }) | null>(null);
  const [parcelasEditaveis,  setParcelasEditaveis]  = useState<ParcelaPreview[]>([]);
  // Ref para saber se a última mudança foi de config (regenera) ou de override (não regenera)
  const regenerarRef = useRef(true);

  // Controla quais planos têm parcelas em modo de edição
  const [parcelasEmEdicao, setParcelasEmEdicao] = useState<Set<number>>(new Set());

  const isEditing = !!inicial?.id;

  // ── Estado "não salvo" (guard de saída) ───────────────────────────────────────
  const [carregado,      setCarregado]      = useState(false);
  const [baseline,       setBaseline]       = useState<string | null>(null);
  const [saiu,           setSaiu]           = useState(false);
  const [cancelPendente, setCancelPendente] = useState(false);

  const snapshot = JSON.stringify({ form, itens, planos });
  const temAlteracoes = !saiu && baseline !== null && snapshot !== baseline;
  const guard = useUnsavedGuard(temAlteracoes);
  const rotaVolta = isEditing && inicial?.id ? `/crm/pedidos/${inicial.id}` : "/crm/pedidos";

  // ── Efeito de carregamento ──────────────────────────────────────────────────
  const fid = fotografo?.id ?? null;
  useEffect(() => {
    if (!fid) return;
    const sb = createClient();
    const p2 = sb.from("crm_products").select("*").eq("fotografo_id", fid).eq("ativo", true).order("nome");

    if (isEditing && inicial?.id) {
      const p3 = sb.from("crm_financial_entries")
        .select("id, descricao, valor, vencimento")
        .eq("pedido_id", inicial.id)
        .eq("tipo", "receita")
        .order("vencimento");
      Promise.all([p2, p3]).then(([r2, r3]) => {
        setProdutos((r2.data ?? []) as CrmProduct[]);
        const entries = (r3.data ?? []) as { id: string; descricao: string; valor: number; vencimento: string }[];
        if (entries.length > 0) {
          setPlanos(entries.map(e => ({
            tmpId: e.id, forma: "", dataPrazo: e.vencimento, numDocumento: "",
            numParcelas: 1, intervalo: "unico" as Intervalo, percentual: "",
            valor: String(e.valor), obs: e.descricao, parcelasOverride: null,
          })));
        }
        setCarregado(true);
      });
    } else {
      p2.then(r2 => {
        setProdutos((r2.data ?? []) as CrmProduct[]);
        setCarregado(true);
      });
    }
  }, [fid, inicial?.id, isEditing]);

  // Categorias de produto (= categorias do pedido) — combo + flags de quais campos aparecem
  useEffect(() => {
    if (!fid) return;
    createClient().from("crm_product_categories").select("*").eq("fotografo_id", fid).eq("ativo", true).order("ordem")
      .then(({ data }) => setPedCats((data ?? []) as CrmProductCategory[]));
  }, [fid]);

  // Captura o baseline do "não salvo" só DEPOIS que o carregamento assíncrono termina
  // (na edição os planos chegam via fetch; itens abrem vazios). baseline===null é o
  // sentinela de "ainda não capturado" — ele nunca volta a null.
  useEffect(() => {
    if (baseline !== null || !carregado) return;
    setBaseline(snapshot);
  }, [carregado, snapshot, baseline]);

  // Opções do combo (fallback à lista fixa se ainda não houver categorias configuradas)
  const catOptions = pedCats.length > 0
    ? pedCats.map((c) => ({ id: c.nome, label: c.nome }))
    : CATEGORIAS_PADRAO.map((c) => ({ id: c, label: c }));
  // Flags da categoria selecionada (default tudo true = mostra todos os campos)
  const catAtual = pedCats.find((c) => c.nome === form.categoria);
  const flags = {
    pede_data:    catAtual ? catAtual.pede_data : true,
    pede_local:   catAtual ? catAtual.pede_local : true,
    pede_horario: catAtual ? catAtual.pede_horario : true,
  };

  // ── Helpers de UI ───────────────────────────────────────────────────────────
  const upd = (k: keyof FormData, v: string) => setForm(f => ({ ...f, [k]: v }));
  const parseMoney = parsearValor;
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtDate = (s: string) => new Date(s + "T12:00:00").toLocaleDateString("pt-BR");

  // ── Cálculos financeiros ────────────────────────────────────────────────────
  const totalItens = itens.reduce((s, i) => s + i.quantidade * i.preco_unit, 0);
  const totalNum   = itens.length > 0 ? totalItens : parseMoney(form.total);
  const desconto   = parseMoney(form.discount);
  const extras     = parseMoney(form.other_expenses);
  const liquido    = totalNum - desconto + extras;
  const totalPlanos = planos.reduce((s, p) => s + (parseFloat(p.valor) || 0), 0);
  const valorRestante = liquido - totalPlanos;

  // ── Itens (produtos) ────────────────────────────────────────────────────────
  const abrirModalProduto = (prod: CrmProduct) => {
    setModalProd(prod);
    setModalDescricao(prod.descricao ?? "");
    setModalQtd(1);
    setModalPreco(formatNum(prod.preco));
  };

  const confirmarProduto = () => {
    if (!modalProd) return;
    setItens(prev => [...prev, {
      tmpId:      gerarId(),
      produto_id: modalProd.id,
      descricao:  modalDescricao || modalProd.nome,
      quantidade: modalQtd,
      preco_unit: parsearValor(modalPreco),
    }]);
    setModalProd(null);
  };

  const atualizarItem = (tmpId: string, campo: "quantidade" | "preco_unit" | "descricao", valor: string | number) => {
    setItens(prev => prev.map(i => i.tmpId === tmpId ? { ...i, [campo]: valor } : i));
  };

  const removerItem = (tmpId: string) => setItens(prev => prev.filter(i => i.tmpId !== tmpId));

  // ── Planos de pagamento ─────────────────────────────────────────────────────
  const abrirNovoPlano = () => {
    const hoje = new Date().toISOString().slice(0, 10);
    const valorDefault = valorRestante > 0 ? valorRestante.toFixed(2) : "";
    const pctDefault   = valorDefault && liquido > 0 ? (parseFloat(valorDefault) * 100 / liquido).toFixed(1) : "";
    setModalPlano({ ...EMPTY_PLANO, tmpId: gerarId(), dataPrazo: hoje, valor: valorDefault, percentual: pctDefault, editIdx: null });
  };

  const abrirEditarPlano = (idx: number) => {
    setModalPlano({ ...planos[idx], editIdx: idx });
  };

  const removerPlano = (idx: number) => setPlanos(prev => prev.filter((_, i) => i !== idx));

  // Atualiza data ou valor de uma parcela individual dentro de um plano salvo
  const atualizarParcelaSalva = (planoIdx: number, parcelaIdx: number, campo: "vencimento" | "valor", val: string) => {
    setPlanos(prev => prev.map((p, i) => {
      if (i !== planoIdx) return p;
      const base = p.parcelasOverride ?? calcParcelas(p);
      const novas = base.map((pc, j) =>
        j !== parcelaIdx ? pc : campo === "vencimento" ? { ...pc, vencimento: val } : { ...pc, valor: parseFloat(val) || 0 }
      );
      return { ...p, parcelasOverride: novas };
    }));
  };

  const salvarPlano = () => {
    if (!modalPlano) return;
    const { editIdx, ...plano } = modalPlano;
    if (editIdx !== null) {
      setPlanos(prev => prev.map((p, i) => i === editIdx ? plano : p));
    } else {
      setPlanos(prev => [...prev, plano]);
    }
    setModalPlano(null);
  };

  const CONFIG_KEYS: (keyof PlanoItem)[] = ["numParcelas", "intervalo", "dataPrazo", "valor", "percentual", "obs"];

  const updPlano = (k: keyof Omit<PlanoItem, "tmpId">, v: string | number) => {
    if (!modalPlano) return;
    const updated = { ...modalPlano, [k]: v };
    // Sincronizar % ↔ valor
    if (k === "percentual" && liquido > 0) {
      const pct = parseFloat(String(v)) || 0;
      updated.valor = pct > 0 ? (liquido * pct / 100).toFixed(2) : "";
    } else if (k === "valor" && liquido > 0) {
      const val = parseFloat(String(v).replace(",", ".")) || 0;
      updated.percentual = val > 0 ? (val * 100 / liquido).toFixed(1) : "";
    }
    // Mudar qualquer campo de config regenera as parcelas (limpa overrides)
    if (CONFIG_KEYS.includes(k)) {
      updated.parcelasOverride = null;
      regenerarRef.current = true;
    }
    setModalPlano(updated);
  };

  // Regenerar parcelasEditaveis quando config do modal muda
  useEffect(() => {
    if (!modalPlano || !regenerarRef.current) return;
    regenerarRef.current = false;
    setParcelasEditaveis(calcParcelas(modalPlano));
  }, [modalPlano?.numParcelas, modalPlano?.intervalo, modalPlano?.dataPrazo, modalPlano?.valor, modalPlano?.obs]);

  // Inicializar ao abrir o modal
  useEffect(() => {
    if (modalPlano) {
      regenerarRef.current = true;
      setParcelasEditaveis(modalPlano.parcelasOverride ?? calcParcelas(modalPlano));
    }
  }, [!!modalPlano]);

  const editarDataParcela = (idx: number, novaData: string) => {
    const novas = parcelasEditaveis.map((p, i) => i === idx ? { ...p, vencimento: novaData } : p);
    setParcelasEditaveis(novas);
    setModalPlano(m => m ? { ...m, parcelasOverride: novas } : m);
    regenerarRef.current = false;
  };

  // ── Salvar pedido ───────────────────────────────────────────────────────────
  // Retorna true só em caso de sucesso. `navegar` controla a navegação interna
  // pós-salvar (botões normais navegam; o "Salvar e sair" do modal decide o destino).
  const handleSave = async (navegar = true): Promise<boolean> => {
    if (!form.nome.trim()) { setError("Nome é obrigatório."); return false; }
    if (form.data_evento && !isValidDate(form.data_evento)) { setError("Data do evento inválida."); return false; }
    for (const plano of planos) {
      if (plano.dataPrazo && !isValidDate(plano.dataPrazo)) { setError("Data de vencimento do plano de pagamento inválida."); return false; }
      const ps = plano.parcelasOverride ?? calcParcelas(plano);
      for (const p of ps) {
        if (!isValidDate(p.vencimento)) { setError(`Vencimento de parcela inválido: ${p.vencimento}`); return false; }
      }
    }
    if (!fotografo) return false;
    setSaving(true);
    setError("");

    const sb = createClient();

    // Gerar número sequencial apenas para novos pedidos
    let proximoNumero: number | null = null;
    if (!isEditing) {
      const { data: maxRow } = await sb.from("crm_orders")
        .select("legacy_id")
        .eq("fotografo_id", fotografo.id)
        .not("legacy_id", "is", null)
        .order("legacy_id", { ascending: false })
        .limit(1)
        .single();
      proximoNumero = ((maxRow as { legacy_id: number } | null)?.legacy_id ?? 0) + 1;
    }

    const payload = {
      fotografo_id:    fotografo.id,
      nome:            form.nome.trim(),
      cliente_id:      form.cliente_id || null,
      oportunidade_id: inicial?.oportunidade_id ?? null,
      ...(proximoNumero !== null ? { legacy_id: proximoNumero, numero: String(proximoNumero) } : {}),
      categoria:       form.categoria || null,
      status:          form.status,
      total:           itens.length > 0 ? totalItens : parseMoney(form.total),
      discount:        parseMoney(form.discount),
      other_expenses:  parseMoney(form.other_expenses),
      payment_method:  planos.length > 0 ? (planos[0].forma || null) : null,
      data_evento:     flags.pede_data ? (form.data_evento || null) : null,
      hora_evento:     flags.pede_horario ? (form.hora_evento.trim() || null) : null,
      local_evento:    flags.pede_local ? (form.local_evento.trim() || null) : null,
      convidados:      form.convidados ? parseInt(form.convidados) || null : null,
      local_cerimonia: flags.pede_local ? (form.local_cerimonia.trim() || null) : null,
      local_recepcao:  flags.pede_local ? (form.local_recepcao.trim() || null) : null,
      data_entrega:    null,
      observacoes:     form.observacoes.trim() || null,
      updated_at:      new Date().toISOString(),
      ...(!isEditing ? { data_lancamento: new Date().toISOString().slice(0, 10), crm_nativo: true } : {}),
    };

    const dataEventoAnterior = inicial?.data_evento ?? null;
    const dataEventoNova = flags.pede_data ? (form.data_evento || null) : null;
    let agendaAtualizado = false;

    let id = inicial?.id;
    if (isEditing && id) {
      const { error: err } = await sb.from("crm_orders").update(payload).eq("id", id);
      if (err) { setError(err.message); setSaving(false); return false; }

      // Atualizar agendamento vinculado se data_evento mudou
      if (dataEventoNova && dataEventoNova !== dataEventoAnterior) {
        const { data: sched } = await sb.from("crm_schedules").select("id").eq("pedido_id", id).maybeSingle();
        if (sched) {
          await sb.from("crm_schedules").update({ inicio: dataEventoNova + "T08:00:00", fim: dataEventoNova + "T18:00:00" }).eq("id", sched.id);
          agendaAtualizado = true;
        }
      } else if (!dataEventoNova && dataEventoAnterior) {
        await sb.from("crm_schedules").delete().eq("pedido_id", id);
        agendaAtualizado = true;
      }

      // Recriar lançamentos financeiros
      await sb.from("crm_financial_entries").delete().eq("pedido_id", id).eq("tipo", "receita");
      if (planos.length > 0) {
        const contaVendasId = itens.map(i => produtos.find(p => p.id === i.produto_id)?.conta_vendas_id).find(Boolean) ?? null;
        const entries: object[] = [];
        for (const plano of planos) {
          const ps = plano.parcelasOverride ?? calcParcelas(plano);
          if (ps.length > 0) {
            for (const p of ps) {
              entries.push({ fotografo_id: fotografo.id, pedido_id: id, tipo: "receita", descricao: p.label, valor: p.valor, vencimento: p.vencimento, status: "pendente", parcela: plano.numParcelas > 1 ? p.label.match(/Parcela (\d+)/)?.[1] ?? null : null, internal_account_type: "pedido", conta_id: contaVendasId });
            }
          } else {
            entries.push({ fotografo_id: fotografo.id, pedido_id: id, tipo: "receita", descricao: plano.obs || "Pagamento", valor: parseFloat(plano.valor) || 0, vencimento: plano.dataPrazo, status: "pendente", parcela: null, internal_account_type: "pedido", conta_id: contaVendasId });
          }
        }
        if (entries.length > 0) await sb.from("crm_financial_entries").insert(entries);
      }
    } else {
      const { data, error: err } = await sb.from("crm_orders").insert(payload).select("id").single();
      if (err) { setError(err.message); setSaving(false); return false; }
      id = (data as { id: string }).id;

      // Mover oportunidade para última etapa do funil e gravar venda_efetuada
      if (inicial?.oportunidade_id) {
        const { data: opp } = await sb.from("crm_opportunities").select("funil_id").eq("id", inicial.oportunidade_id).single();
        if (opp?.funil_id) {
          const { data: etapas } = await sb.from("crm_funnel_stages").select("id, ordem").eq("funil_id", opp.funil_id).order("ordem", { ascending: false }).limit(1);
          const ultimaEtapa = etapas?.[0];
          await sb.from("crm_opportunities").update({
            status:   "venda_efetuada",
            etapa_id: ultimaEtapa?.id ?? null,
          }).eq("id", inicial.oportunidade_id);
        }
      }

      // Criar agendamento vinculado ao pedido se tiver data do evento
      if (dataEventoNova && id) {
        await sb.from("crm_schedules").insert({
          fotografo_id: fotografo.id,
          pedido_id:    id,
          cliente_id:   form.cliente_id || null,
          titulo:       form.nome.trim() || "Evento",
          descricao:    form.categoria || null,
          inicio:       dataEventoNova + "T08:00:00",
          fim:          dataEventoNova + "T18:00:00",
          dia_todo:     false,
          tipo:         "evento",
        });
      }

      // Itens
      if (itens.length > 0) {
        // `total` é coluna gerada no banco (quantidade * preco_unit) — não enviar no insert.
        await sb.from("crm_order_items").insert(itens.map(i => ({
          pedido_id:  id,
          produto_id: i.produto_id,
          descricao:  i.descricao,
          quantidade: i.quantidade,
          preco_unit: i.preco_unit,
        })));

        // Gerar contas a pagar a partir dos custos dos produtos
        const produtoIds = itens.map(i => i.produto_id).filter(Boolean) as string[];
        if (produtoIds.length > 0) {
          const { data: custos } = await sb.from("crm_product_custos").select("*").in("produto_id", produtoIds);
          if (custos && custos.length > 0) {
            const hoje = new Date().toISOString().slice(0, 10);
            const despesas: object[] = [];
            for (const custo of custos as { id: string; produto_id: string; fotografo_id: string; descricao: string; valor: number; percentual: number | null; conta_id: string | null; referencia: string; dias_offset: number; dias_direcao: string }[]) {
              const item = itens.find(i => i.produto_id === custo.produto_id);
              if (!item) continue;
              const baseDate = custo.referencia === "data_evento" ? (form.data_evento || hoje) : hoje;
              const d = new Date(baseDate + "T12:00:00");
              if (custo.dias_direcao === "antes") d.setDate(d.getDate() - custo.dias_offset);
              else if (custo.dias_direcao === "apos") d.setDate(d.getDate() + custo.dias_offset);
              const vencimento = d.toISOString().slice(0, 10);
              const valorCusto = custo.valor > 0 ? custo.valor * item.quantidade : custo.percentual ? (liquido * custo.percentual / 100) : 0;
              if (valorCusto <= 0) continue;
              despesas.push({
                fotografo_id:          fotografo.id,
                pedido_id:             id,
                tipo:                  "despesa",
                descricao:             custo.descricao || item.descricao,
                valor:                 +valorCusto.toFixed(2),
                vencimento,
                status:                "pendente",
                conta_id:              custo.conta_id,
                internal_account_type: "pedido",
              });
            }
            if (despesas.length > 0) await sb.from("crm_financial_entries").insert(despesas);
          }
        }
      }

      // Lançamentos financeiros a partir dos planos
      if (planos.length > 0 && id) {
        const contaVendasId = itens.map(i => produtos.find(p => p.id === i.produto_id)?.conta_vendas_id).find(Boolean) ?? null;
        const entries: object[] = [];
        for (const plano of planos) {
          const ps = plano.parcelasOverride ?? calcParcelas(plano);
          for (const p of ps) {
            entries.push({
              fotografo_id:          fotografo.id,
              pedido_id:             id,
              tipo:                  "receita",
              descricao:             p.label,
              valor:                 p.valor,
              vencimento:            p.vencimento,
              status:                "pendente",
              parcela:               plano.numParcelas > 1 ? p.label.match(/Parcela (\d+)/)?.[1] ?? null : null,
              internal_account_type: "pedido",
              conta_id:              contaVendasId,
            });
          }
        }
        if (entries.length > 0) await sb.from("crm_financial_entries").insert(entries);
      }
    }

    setSaving(false);
    setSaiu(true); // desliga o guard antes de navegar/fechar o editor
    if (navegar) {
      onSalvo ? onSalvo(id!, agendaAtualizado) : router.push(`/crm/pedidos/${id}`);
    }
    return true;
  };

  // ── Saída com guard de "não salvo" ────────────────────────────────────────────
  const pedirSair = () => {
    if (temAlteracoes) { setCancelPendente(true); guard.setModalAberto(true); }
    else if (isEditing && onCancelar) onCancelar();
    else router.back();
  };
  const confirmarSairSemSalvar = () => {
    setSaiu(true);
    if (cancelPendente) {
      setCancelPendente(false);
      guard.setModalAberto(false);
      if (isEditing && onCancelar) onCancelar();
      else router.back();
    } else {
      guard.irParaDestino(rotaVolta); // saída interceptada (link do menu/breadcrumb)
    }
  };
  const continuarEditando = () => { setCancelPendente(false); guard.setModalAberto(false); };
  // "Salvar e sair": salva e decide o destino. Cancelar explícito → deixa o handleSave
  // navegar/fechar sozinho; saída interceptada (link do menu) → salva SEM navegar e honra
  // o destino clicado. Se o salvamento falhar, fecha o modal para o erro ficar visível.
  const salvarESair = async () => {
    const eraCancelExplicito = cancelPendente;
    setCancelPendente(false);
    const ok = await handleSave(eraCancelExplicito);
    if (!ok) { guard.setModalAberto(false); return; } // erro fica visível (modal fechado)
    // Sucesso: fecha o modal em qualquer caso (sem janela para duplo-save durante o
    // re-fetch do onSalvo). Cancelar explícito → handleSave já navegou/fechou o editor;
    // saída interceptada → honra o destino do link clicado.
    if (eraCancelExplicito) guard.setModalAberto(false);
    else guard.irParaDestino(rotaVolta);
  };

  // ── Helpers de layout ───────────────────────────────────────────────────────
  const sec = (label: string) => (
    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14, marginTop: 4 }}>
      {label}
    </div>
  );

  const modalOverlay: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300,
    display: "flex", alignItems: "center", justifyContent: "center",
  };
  const modalBox: React.CSSProperties = {
    background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)",
    borderRadius: 14, padding: "28px 32px", width: 480, boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
    maxHeight: "90vh", overflowY: "auto",
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 32px" }}>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 16px", marginBottom: 18, fontSize: 13, color: "#EF4444" }}>
          {error}
        </div>
      )}

      {/* ── Botões topo ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 28, alignItems: "center" }}>
        <button onClick={() => handleSave()} disabled={saving || !form.nome.trim()}
          style={{ padding: "10px 28px", borderRadius: 8, background: saving || !form.nome.trim() ? "#93C5FD" : "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: saving || !form.nome.trim() ? "not-allowed" : "pointer" }}>
          {saving ? "Salvando…" : isEditing ? "Salvar alterações" : "Criar pedido"}
        </button>
        <button onClick={pedirSair}
          style={{ padding: "10px 18px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer" }}>
          Cancelar
        </button>
        <div style={{ marginLeft: "auto" }}><SeloEstado temAlteracoes={temAlteracoes} /></div>
      </div>

      {/* ── Pedido ── */}
      {sec("Pedido")}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Nome do pedido *">
          <input value={form.nome} onChange={e => upd("nome", e.target.value)} placeholder="Ex: Casamento Ana e João" style={inputStyle} autoFocus />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Categoria">
            <ComboSelect
              options={catOptions}
              value={form.categoria}
              onChange={v => upd("categoria", v)}
              placeholder="Selecionar categoria…"
            />
          </Field>
          <Field label="Status">
            <ComboSelect
              options={[
                { id: "aguardando_sinal", label: "Aguardando sinal" },
                { id: "em_producao",      label: "Em produção" },
                { id: "entregue",         label: "Entregue" },
                { id: "concluido",        label: "Concluído" },
                { id: "cancelado",        label: "Cancelado" },
              ]}
              value={form.status}
              onChange={v => upd("status", v as FormData["status"])}
            />
          </Field>
        </div>
        {/* Data / Horário conforme as flags da categoria; Convidados sempre (adapta a largura) */}
        {(flags.pede_data || flags.pede_horario) && (
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {flags.pede_data && (
              <div style={{ flex: "1 1 160px" }}>
                <Field label="Data do evento">
                  <input type="date" value={form.data_evento} onChange={e => upd("data_evento", e.target.value)} style={inputStyle} />
                </Field>
              </div>
            )}
            {flags.pede_horario && (
              <div style={{ flex: "1 1 160px" }}>
                <Field label="Horário">
                  <input value={form.hora_evento} onChange={e => upd("hora_evento", e.target.value)} placeholder="Ex: 16h" style={inputStyle} />
                </Field>
              </div>
            )}
            <div style={{ flex: "1 1 160px" }}>
              <Field label="Convidados">
                <input type="number" min="0" value={form.convidados} onChange={e => upd("convidados", e.target.value)} placeholder="Ex: 150" style={inputStyle} />
              </Field>
            </div>
          </div>
        )}
        {flags.pede_local && (
          (form.categoria.toLowerCase().includes("casamento") || form.categoria === "Bodas") ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Local da cerimônia">
                <input value={form.local_cerimonia} onChange={e => upd("local_cerimonia", e.target.value)} placeholder="Ex: Igreja São Francisco" style={inputStyle} />
              </Field>
              <Field label="Local da recepção">
                <input value={form.local_recepcao} onChange={e => upd("local_recepcao", e.target.value)} placeholder="Ex: Clube Náutico" style={inputStyle} />
              </Field>
            </div>
          ) : (
            <Field label="Local do evento">
              <input value={form.local_evento} onChange={e => upd("local_evento", e.target.value)} placeholder="Ex: Espaço Villa dos Sonhos" style={inputStyle} />
            </Field>
          )
        )}
      </div>

      {/* ── Cliente ── */}
      <div style={{ marginTop: 24, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 20 }}>
        {sec("Cliente")}
        <Field label="Cliente vinculado">
          <ClienteSelect
            value={form.cliente_id}
            onChange={id => upd("cliente_id", id)}
          />
        </Field>
      </div>

      {/* ── Produtos ── */}
      <div style={{ marginTop: 24, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 20 }}>
        {sec("Produtos")}
        <div style={{ marginBottom: 12 }}>
          <ProdutoSearch produtos={produtos} onSelect={abrirModalProduto} placeholder="Buscar e adicionar produto…" />
        </div>

        {itens.length > 0 && (
          <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 120px 80px 32px", padding: "8px 12px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              {["Descrição", "Qtd", "Preço unit.", "Total", ""].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</div>
              ))}
            </div>
            {itens.map((item, idx) => (
              <div key={item.tmpId} style={{ display: "grid", gridTemplateColumns: "1fr 80px 120px 80px 32px", padding: "8px 12px", alignItems: "center", borderBottom: idx < itens.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
                <input value={item.descricao} onChange={e => atualizarItem(item.tmpId, "descricao", e.target.value)}
                  style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }} />
                <input type="number" min="1" value={item.quantidade}
                  onChange={e => atualizarItem(item.tmpId, "quantidade", Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }} />
                <input type="text" inputMode="decimal" value={formatNum(item.preco_unit)}
                  onChange={e => atualizarItem(item.tmpId, "preco_unit", parsearValor(mascaraValor(e.target.value)))}
                  style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{fmt(item.quantidade * item.preco_unit)}</div>
                <button onClick={() => removerItem(item.tmpId)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 16, padding: 0 }}>×</button>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 12px", borderTop: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>Subtotal: {fmt(totalItens)}</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Valores ── */}
      <div style={{ marginTop: 24, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 20 }}>
        {sec("Valores")}
        <div style={{ display: "grid", gridTemplateColumns: itens.length > 0 ? "1fr 1fr" : "1fr 1fr 1fr", gap: 14 }}>
          {itens.length === 0 && (
            <Field label="Total (R$)">
              <input value={form.total} onChange={e => upd("total", mascaraValor(e.target.value))} placeholder="0,00" style={inputStyle} />
            </Field>
          )}
          <Field label="Desconto (R$)">
            <input value={form.discount} onChange={e => upd("discount", mascaraValor(e.target.value))} placeholder="0,00" style={inputStyle} />
          </Field>
          <Field label="Despesas extras (R$)">
            <input value={form.other_expenses} onChange={e => upd("other_expenses", mascaraValor(e.target.value))} placeholder="0,00" style={inputStyle} />
          </Field>
        </div>

        {(totalNum > 0 || itens.length > 0) && (
          <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 8, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 2 }}>Total bruto</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>{fmt(totalNum)}</div>
            </div>
            {desconto > 0 && <div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 2 }}>Desconto</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#EF4444" }}>- {fmt(desconto)}</div>
            </div>}
            {extras > 0 && <div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 2 }}>Despesas extras</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#D97706" }}>+ {fmt(extras)}</div>
            </div>}
            <div style={{ marginLeft: "auto" }}>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 2 }}>Líquido</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#059669" }}>{fmt(liquido)}</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Plano de pagamento ── */}
      <div style={{ marginTop: 24, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 20 }}>
          {sec("Pagamentos")}

          {/* Tabela expandida de parcelas */}
          <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, overflow: "hidden", marginBottom: 10 }}>
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 150px 100px 64px", padding: "8px 14px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              {["Descrição / Parcela", "Vencimento", "Valor", ""].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</div>
              ))}
            </div>

            {planos.length === 0 ? (
              <div style={{ padding: "16px 14px", fontSize: 13, color: "var(--color-text-secondary)", textAlign: "center" }}>
                Nenhum pagamento adicionado
              </div>
            ) : planos.map((p, planoIdx) => {
              const parcelas = p.parcelasOverride ?? calcParcelas(p);
              const isSimples = parcelas.length === 0; // plano sem parcelas calculadas (ex: carregado do banco como entrada simples)
              return (
                <div key={p.tmpId}>
                  {/* Cabeçalho do plano */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 150px 100px 64px", padding: "8px 14px", background: "rgba(37,99,235,0.04)", borderBottom: "0.5px solid var(--color-border-tertiary)", alignItems: "center" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)" }}>
                      {p.forma || "Pagamento"}{p.numParcelas > 1 ? ` — ${p.numParcelas}×` : ""}
                      {p.obs ? <span style={{ fontWeight: 400, color: "var(--color-text-secondary)", marginLeft: 6 }}>{p.obs}</span> : null}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{isSimples && p.dataPrazo ? fmtDate(p.dataPrazo) : ""}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#059669" }}>{fmt(parseFloat(p.valor) || 0)}</div>
                    <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                      <button
                        onClick={() => setParcelasEmEdicao(prev => { const s = new Set(prev); s.has(planoIdx) ? s.delete(planoIdx) : s.add(planoIdx); return s; })}
                        title={parcelasEmEdicao.has(planoIdx) ? "Bloquear edição" : "Editar parcelas"}
                        style={{ background: parcelasEmEdicao.has(planoIdx) ? "rgba(37,99,235,0.1)" : "none", border: parcelasEmEdicao.has(planoIdx) ? "0.5px solid rgba(37,99,235,0.3)" : "none", cursor: "pointer", fontSize: 11, color: parcelasEmEdicao.has(planoIdx) ? "#2563EB" : "var(--color-text-secondary)", padding: "2px 7px", borderRadius: 5, fontWeight: 600 }}>
                        {parcelasEmEdicao.has(planoIdx) ? "✓ Editando" : "Editar"}
                      </button>
                      <button onClick={() => abrirEditarPlano(planoIdx)} title="Editar plano"
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--color-text-secondary)", padding: "2px 4px" }}>✏️</button>
                      <button onClick={() => removerPlano(planoIdx)} title="Remover plano"
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#EF4444", padding: "2px 4px" }}>×</button>
                    </div>
                  </div>

                  {/* Linhas de parcelas */}
                  {parcelas.map((pc, pcIdx) => {
                    const editando = parcelasEmEdicao.has(planoIdx);
                    return (
                      <div key={pcIdx} style={{ display: "grid", gridTemplateColumns: "1fr 150px 100px 64px", padding: "6px 14px 6px 28px", alignItems: "center", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)" }}>
                        <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{pc.label}</div>
                        {editando ? (
                          <input
                            type="date"
                            value={pc.vencimento}
                            onChange={e => atualizarParcelaSalva(planoIdx, pcIdx, "vencimento", e.target.value)}
                            style={{ ...inputStyle, fontSize: 11, padding: "4px 7px", borderRadius: 6 }}
                          />
                        ) : (
                          <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{fmtDate(pc.vencimento)}</div>
                        )}
                        {editando ? (
                          <input
                            type="text"
                            inputMode="decimal"
                            value={formatNum(pc.valor)}
                            onChange={e => atualizarParcelaSalva(planoIdx, pcIdx, "valor", String(parsearValor(mascaraValor(e.target.value))))}
                            style={{ ...inputStyle, fontSize: 12, padding: "4px 7px", borderRadius: 6, fontWeight: 600, color: "#059669" }}
                          />
                        ) : (
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#059669" }}>{fmt(pc.valor)}</div>
                        )}
                        <div />
                      </div>
                    );
                  })}

                  {/* Plano simples (sem parcelas calculadas) — linha com read-only por padrão */}
                  {isSimples && (() => {
                    const editando = parcelasEmEdicao.has(planoIdx);
                    return (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 150px 100px 64px", padding: "6px 14px 6px 28px", alignItems: "center", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)" }}>
                        <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{p.obs || "Pagamento"}</div>
                        {editando ? (
                          <input type="date" value={p.dataPrazo}
                            onChange={e => setPlanos(prev => prev.map((x, i) => i === planoIdx ? { ...x, dataPrazo: e.target.value } : x))}
                            style={{ ...inputStyle, fontSize: 11, padding: "4px 7px", borderRadius: 6 }} />
                        ) : (
                          <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{p.dataPrazo ? fmtDate(p.dataPrazo) : "—"}</div>
                        )}
                        {editando ? (
                          <input type="text" inputMode="decimal" value={p.valor === "" ? "" : formatNum(parseFloat(p.valor) || 0)}
                            onChange={e => { const m = mascaraValor(e.target.value); setPlanos(prev => prev.map((x, i) => i === planoIdx ? { ...x, valor: m === "" ? "" : String(parsearValor(m)) } : x)); }}
                            style={{ ...inputStyle, fontSize: 12, padding: "4px 7px", borderRadius: 6, fontWeight: 600, color: "#059669" }} />
                        ) : (
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#059669" }}>{fmt(parseFloat(p.valor) || 0)}</div>
                        )}
                        <div />
                      </div>
                    );
                  })()}
                </div>
              );
            })}

            {/* Rodapé */}
            <div style={{ padding: "10px 14px", borderTop: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 28 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Total</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>{fmt(totalPlanos)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Valor Restante</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: valorRestante > 0.01 ? "#D97706" : "#059669" }}>{fmt(Math.max(0, valorRestante))}</div>
              </div>
              <button onClick={abrirNovoPlano}
                style={{ padding: "8px 16px", borderRadius: 8, background: "#2563EB", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                + Adicionar
              </button>
            </div>
          </div>
        </div>

      {/* ── Observações ── */}
      <div style={{ marginTop: 24, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 20 }}>
        <Field label="Observações">
          <textarea value={form.observacoes} onChange={e => upd("observacoes", e.target.value)} placeholder="Notas internas sobre este pedido…" rows={3} style={{ ...inputStyle, resize: "vertical", height: "auto" }} />
        </Field>
      </div>

      {/* ── Botões ── */}
      <div style={{ marginTop: 24, display: "flex", gap: 10, alignItems: "center" }}>
        <button onClick={() => handleSave()} disabled={saving || !form.nome.trim()}
          style={{ padding: "10px 28px", borderRadius: 8, background: saving || !form.nome.trim() ? "#93C5FD" : "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: saving || !form.nome.trim() ? "not-allowed" : "pointer" }}>
          {saving ? "Salvando…" : isEditing ? "Salvar alterações" : "Criar pedido"}
        </button>
        <button onClick={pedirSair}
          style={{ padding: "10px 18px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer" }}>
          Cancelar
        </button>
        <div style={{ marginLeft: "auto" }}><SeloEstado temAlteracoes={temAlteracoes} /></div>
      </div>

      <ModalNaoSalvo aberto={guard.modalAberto} salvando={saving}
        onSalvarESair={salvarESair}
        onSairSemSalvar={confirmarSairSemSalvar}
        onContinuar={continuarEditando} />

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL — Detalhes do Produto
      ════════════════════════════════════════════════════════════════════════ */}
      {modalProd && (
        <div style={modalOverlay} onClick={e => e.target === e.currentTarget && setModalProd(null)}>
          <div style={modalBox}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 18 }}>
              Detalhes do produto
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Produto</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)" }}>{modalProd.nome}</div>
            </div>

            <Field label="Descrição">
              <textarea
                value={modalDescricao}
                onChange={e => setModalDescricao(e.target.value)}
                placeholder="Descrição para este item…"
                rows={3}
                style={{ ...inputStyle, resize: "vertical", height: "auto" }}
              />
            </Field>

            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Quantidade">
                <input type="number" min="1" value={modalQtd} onChange={e => setModalQtd(Math.max(1, parseInt(e.target.value) || 1))}
                  style={inputStyle} />
              </Field>
              <Field label="Preço unit. (R$)">
                <input type="text" inputMode="decimal" value={modalPreco} onChange={e => setModalPreco(mascaraValor(e.target.value))}
                  style={inputStyle} />
              </Field>
            </div>

            <div style={{ marginTop: 8, fontSize: 12, color: "var(--color-text-secondary)" }}>
              Total: <strong style={{ color: "var(--color-text-primary)" }}>{fmt(parsearValor(modalPreco) * modalQtd)}</strong>
            </div>

            <div style={{ marginTop: 22, display: "flex", gap: 10 }}>
              <button onClick={confirmarProduto}
                style={{ padding: "9px 22px", borderRadius: 8, background: "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Adicionar ao pedido
              </button>
              <button onClick={() => setModalProd(null)}
                style={{ padding: "9px 16px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL — Detalhes do Pagamento
      ════════════════════════════════════════════════════════════════════════ */}
      {modalPlano && (
        <div style={modalOverlay} onClick={e => e.target === e.currentTarget && setModalPlano(null)}>
          <div style={{ ...modalBox, width: 540 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 6 }}>
              Detalhes do Pagamento
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 20 }}>
              Selecione o tipo de pagamento e o valor ou %
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <Field label="Forma de pagamento">
                <ComboSelect
                  options={FORMAS_PAGAMENTO.map(f => ({ id: f, label: f }))}
                  value={modalPlano.forma}
                  onChange={v => updPlano("forma", v)}
                  placeholder="Selecionar…"
                />
              </Field>
              <Field label="Data Prazo">
                <input type="date" value={modalPlano.dataPrazo} onChange={e => updPlano("dataPrazo", e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Número do documento">
                <input value={modalPlano.numDocumento} onChange={e => updPlano("numDocumento", e.target.value)} placeholder="001" style={inputStyle} />
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <Field label="Número de parcelas">
                <input
                  type="text"
                  inputMode="numeric"
                  value={modalPlano.numParcelas === 0 ? "" : String(modalPlano.numParcelas)}
                  onChange={e => {
                    const raw = e.target.value.replace(/\D/g, "");
                    updPlano("numParcelas", raw === "" ? 0 : Math.max(1, parseInt(raw)));
                  }}
                  placeholder="Ex: 3"
                  style={inputStyle}
                />
              </Field>
              <Field label="Intervalos de Pagamento">
                <ComboSelect
                  options={[
                    { id: "mensal",     label: "Mensal" },
                    { id: "quinzenal",  label: "Quinzenal" },
                    { id: "semanal",    label: "Semanal" },
                    { id: "unico",      label: "Único (sem intervalo)" },
                  ]}
                  value={modalPlano.intervalo}
                  onChange={v => updPlano("intervalo", v)}
                />
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <Field label="% do Valor Total">
                <input
                  value={modalPlano.percentual}
                  onChange={e => updPlano("percentual", e.target.value)}
                  placeholder="Ex: 50"
                  style={inputStyle}
                />
              </Field>
              <Field label="Valor (R$)">
                <input
                  value={modalPlano.valor === "" ? "" : formatNum(parseFloat(modalPlano.valor) || 0)}
                  onChange={e => { const m = mascaraValor(e.target.value); updPlano("valor", m === "" ? "" : String(parsearValor(m))); }}
                  placeholder="0,00"
                  style={inputStyle}
                />
              </Field>
            </div>

            <div style={{ marginTop: 12 }}>
              <Field label="Obs">
                <input value={modalPlano.obs} onChange={e => updPlano("obs", e.target.value)} placeholder="Observação" style={inputStyle} />
              </Field>
            </div>

            {/* Preview de parcelas */}
            {parcelasEditaveis.length > 0 && (
              <div style={{ marginTop: 16, border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, overflow: "hidden" }}>
                <div style={{ padding: "7px 12px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Preview — clique na data para editar
                </div>
                {parcelasEditaveis.map((p, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 140px 90px", padding: "6px 12px", borderBottom: i < parcelasEditaveis.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none", alignItems: "center" }}>
                    <div style={{ fontSize: 12, color: "var(--color-text-primary)" }}>{p.label}</div>
                    <input
                      type="date"
                      value={p.vencimento}
                      onChange={e => editarDataParcela(i, e.target.value)}
                      style={{ ...inputStyle, fontSize: 11, padding: "3px 6px", border: "0.5px solid var(--color-border-secondary)", borderRadius: 6 }}
                    />
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#059669", textAlign: "right" }}>{fmt(p.valor)}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 22, display: "flex", gap: 10 }}>
              <button onClick={salvarPlano}
                style={{ padding: "9px 22px", borderRadius: 8, background: "#2563EB", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Salvar
              </button>
              <button onClick={() => setModalPlano(null)}
                style={{ padding: "9px 16px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
