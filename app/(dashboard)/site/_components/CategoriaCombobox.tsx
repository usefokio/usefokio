"use client";

// Combobox de CATEGORIA (trabalho e coleção): input + datalist das categorias da conta
// + aviso anti-duplicata ("Retrato" quando já existe "Retratos"), com um clique para usar
// a existente. A resolução digitado→slug vive em lib/site/categorias (fonte única).
import { quaseDuplicata } from "@/lib/site/categorias";
import type { SiteCategoria } from "@/lib/supabase/types";

export function CategoriaCombobox({
  valor, onChange, cats, listaId, placeholder, style,
}: {
  valor: string;
  onChange: (nome: string) => void;
  cats: SiteCategoria[];
  listaId: string;               // id único do <datalist> (a tela pode ter mais de um combobox)
  placeholder?: string;
  style?: React.CSSProperties;
}) {
  const parecida = quaseDuplicata(valor, cats);
  return (
    <>
      <input
        list={listaId}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Ex.: Casamentos (escolha ou digite uma nova)"}
        style={style}
      />
      <datalist id={listaId}>
        {cats.map((c) => <option key={c.id} value={c.nome} />)}
      </datalist>
      {parecida && (
        <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: "#B45309", background: "rgba(245,158,11,0.12)", padding: "7px 10px", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span>Já existe a categoria “{parecida.nome}” — era ela?</span>
          <button
            type="button"
            onClick={() => onChange(parecida.nome)}
            style={{ border: "1px solid rgba(180,83,9,0.4)", background: "transparent", color: "#B45309", fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 7, cursor: "pointer" }}
          >
            Usar “{parecida.nome}”
          </button>
          <span style={{ fontWeight: 400 }}>Se continuar, será criada uma categoria nova.</span>
        </div>
      )}
    </>
  );
}
