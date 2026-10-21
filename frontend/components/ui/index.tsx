"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Switch } from "antd";
import type { ButtonProps } from "antd";
import type { CSSProperties, ReactNode } from "react";
import Icone from "./Icone";

export { default as Icone, MarcaCanal } from "./Icone";

/* ---------------------------------------------------------------- etiqueta */
export type Tom = "ok" | "info" | "alerta" | "erro" | "neutro";

/** Cor fixa por significado: verde = confirmado/pago/pronto, azul = agendado/solicitado,
 *  âmbar = pendente/a confirmar, vermelho = atrasado/não coberto. */
const TOM_POR_STATUS: Record<string, Tom> = {
  confirmado: "ok", pago: "ok", pronto: "ok", ativo: "ok", coberto: "ok", concluido: "ok", "concluído": "ok", disponível: "ok",
  agendado: "info", solicitado: "info", "em tratamento": "info", "em andamento": "info",
  "a confirmar": "alerta", pendente: "alerta", "em análise": "alerta", parcial: "alerta", "aguardando aprovação": "alerta",
  faltou: "alerta",
  atrasado: "erro", "não coberto": "erro", cancelado: "erro", vencido: "erro",
};

export function tomDoStatus(status: string): Tom {
  return TOM_POR_STATUS[status.toLowerCase()] ?? "neutro";
}

export function Etiqueta({ texto, tom, tam = 12 }: { texto: string; tom?: Tom; tam?: number }) {
  const t = tom ?? tomDoStatus(texto);
  return (
    <span className={`sd-etiqueta sd-tom-${t}`} style={tam !== 12 ? { fontSize: tam } : undefined}>
      {texto.charAt(0).toUpperCase() + texto.slice(1)}
    </span>
  );
}

/* ---------------------------------------------------------------- botão */
type TipoBotao = "primario" | "secundario" | "suave" | "fantasma";
type TamBotao = "P" | "M" | "G";

interface BotaoProps extends Omit<ButtonProps, "type" | "size" | "icon"> {
  tipo?: TipoBotao;
  tam?: TamBotao;
  icone?: string;
  iconeFim?: string;
  href?: string;
}

/** Botão sólido do design: primário #0065C4 sem gradiente; P 32, M 40, G 48 px. */
export function Botao({ tipo = "primario", tam = "M", icone, iconeFim, children, className, href, onClick, ...resto }: BotaoProps) {
  const router = useRouter();
  const tipoAntd = tipo === "primario" ? "primary" : tipo === "fantasma" ? "text" : "default";
  const tamIc = tam === "G" ? 18 : 16;
  return (
    <Button
      type={tipoAntd}
      size={tam === "P" ? "small" : tam === "G" ? "large" : "middle"}
      className={`sd-botao sd-botao-${tipo} ${className ?? ""}`}
      onClick={href ? () => router.push(href) : onClick}
      {...resto}
    >
      {icone && <Icone nome={icone} tam={tamIc} />}
      {children}
      {iconeFim && <Icone nome={iconeFim} tam={tamIc} esp={2.2} />}
    </Button>
  );
}

export function LinkSeta({ children, href, onClick }: { children: ReactNode; href?: string; onClick?: () => void }) {
  const corpo = (
    <>
      {children}
      <Icone nome="dir" tam={14} />
    </>
  );
  return href ? (
    <Link className="sd-link" href={href}>{corpo}</Link>
  ) : (
    <button type="button" className="sd-link" onClick={onClick}>{corpo}</button>
  );
}

/* ---------------------------------------------------------------- cartão */
interface CartaoProps {
  children: ReactNode;
  pad?: number;
  gap?: number;
  style?: CSSProperties;
  className?: string;
  titulo?: ReactNode;
  sub?: ReactNode;
  acao?: ReactNode;
  as?: "section" | "div" | "article";
}

export function Cartao({ children, pad = 20, gap = 16, style, className, titulo, sub, acao, as: Tag = "section" }: CartaoProps) {
  return (
    <Tag className={`sd-cartao ${className ?? ""}`} style={{ padding: pad, gap, ...style }}>
      {(titulo || acao) && (
        <div className="sd-cartao-cab">
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {titulo && <h2 className="sd-cartao-titulo" style={{ margin: 0 }}>{titulo}</h2>}
            {sub && <div className="sd-cartao-sub">{sub}</div>}
          </div>
          {acao}
        </div>
      )}
      {children}
    </Tag>
  );
}

/* ---------------------------------------------------------------- avatar */
export function iniciais(nome: string): string {
  const partes = nome.replace(/^(Dra?\.)\s+/, "").split(/\s+/).filter((p) => p && p[0] === p[0].toUpperCase());
  if (partes.length > 1) return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  return (partes[0] ?? "?").slice(0, 2).toUpperCase();
}

export function Avatar({ nome, tam = 32, fundo, cor }: { nome: string; tam?: number; fundo?: string; cor?: string }) {
  return (
    <div className="sd-avatar" style={{ width: tam, height: tam, fontSize: Math.round(tam * 0.38), background: fundo, color: cor }} aria-hidden>
      {iniciais(nome)}
    </div>
  );
}

/* ---------------------------------------------------------------- kpi */
export function Kpi({
  titulo, valor, icone, cor, rodape, tomIcone = ["var(--cor-primaria-suave)", "var(--cor-primaria)"],
}: { titulo: string; valor: ReactNode; icone: string; cor?: string; rodape?: ReactNode; tomIcone?: [string, string] }) {
  return (
    <Cartao gap={12} style={{ flex: 1 }} as="div">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="sd-kpi-titulo">{titulo}</div>
        <div className="sd-kpi-icone" style={{ background: tomIcone[0], color: tomIcone[1] }}>
          <Icone nome={icone} tam={17} />
        </div>
      </div>
      <div className="sd-kpi-valor" style={{ color: cor }}>{valor}</div>
      {rodape && <div style={{ display: "flex" }}>{rodape}</div>}
    </Cartao>
  );
}

/* ---------------------------------------------------------------- formulário */
export function Campo({ rotulo, ajuda, children, style, id }: { rotulo: string; ajuda?: ReactNode; children: ReactNode; style?: CSSProperties; id?: string }) {
  return (
    <div className="sd-campo" style={style}>
      <label className="sd-campo-rotulo" htmlFor={id}>{rotulo}</label>
      {children}
      {ajuda && <div className="sd-campo-ajuda">{ajuda}</div>}
    </div>
  );
}

interface EscolhaProps {
  titulo: string;
  desc: string;
  icone?: string;
  lateral?: ReactNode;
  ativo: boolean;
  selo?: string;
  onClick?: () => void;
  altura?: number;
}

/** Cartão selecionável (rádio) usado nos assistentes. */
export function Escolha({ titulo, desc, icone, lateral, ativo, selo, onClick, altura = 72 }: EscolhaProps) {
  return (
    <button type="button" role="radio" aria-checked={ativo} className="sd-escolha" onClick={onClick} style={{ minHeight: altura }}>
      {lateral ?? (icone && <span className="sd-escolha-icone"><Icone nome={icone} tam={20} /></span>)}
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <span className="sd-escolha-titulo">{titulo}{selo && <span className="sd-selo">{selo}</span>}</span>
        <span className="sd-escolha-desc">{desc}</span>
      </span>
      <span className="sd-radio" aria-hidden />
    </button>
  );
}

export function GrupoEscolha({ rotulo, children, linha }: { rotulo?: string; children: ReactNode; linha?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rotulo && <div className="sd-campo-rotulo">{rotulo}</div>}
      <div role="radiogroup" aria-label={rotulo} style={{ display: "flex", flexDirection: linha ? "row" : "column", gap: linha ? 12 : 8 }}>
        {children}
      </div>
    </div>
  );
}

interface OpcaoProps {
  titulo: string;
  desc: string;
  ligado: boolean;
  icone?: string;
  travado?: boolean;
  onChange?: (v: boolean) => void;
  extra?: ReactNode;
}

/** Linha com interruptor (alvo de toque ≥ 56 px). Travado = regra obrigatória. */
export function Opcao({ titulo, desc, ligado, icone, travado, onChange, extra }: OpcaoProps) {
  return (
    <div className="sd-opcao">
      {icone && <div className="sd-opcao-icone"><Icone nome={icone} tam={18} /></div>}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
          {titulo}
          {travado && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--cor-suave)" }}>
              <Icone nome="cadeado" tam={12} />obrigatório
            </span>
          )}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--cor-suave)", lineHeight: 1.4 }}>{desc}</div>
      </div>
      {extra}
      <Switch checked={ligado} disabled={travado} onChange={onChange} aria-label={titulo} />
    </div>
  );
}

export function Aviso({ children, icone = "alerta", tom = "info" }: { children: ReactNode; icone?: string; tom?: Tom }) {
  return (
    <div className={`sd-aviso sd-tom-${tom}`}>
      <Icone nome={icone} tam={18} />
      <div>{children}</div>
    </div>
  );
}

/* ---------------------------------------------------------------- passos */
export function Passos({ passos, atual }: { passos: string[]; atual: number }) {
  return (
    <ol className="sd-passos" aria-label={`Passo ${atual} de ${passos.length}`}>
      {passos.map((nome, i) => {
        const n = i + 1;
        const estado = n < atual ? "feito" : n === atual ? "atual" : "proximo";
        return (
          <li key={nome} style={{ display: "contents" }}>
            <span className="sd-passo" data-estado={estado} aria-current={estado === "atual" ? "step" : undefined}>
              <span className="sd-passo-bola">
                {estado === "feito" ? <Icone nome="check" tam={15} cor="#fff" esp={2.6} /> : n}
              </span>
              {nome}
            </span>
            {n < passos.length && <span className="sd-passo-linha" data-feito={n < atual} aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

export function Pontos({ total, atual }: { total: number; atual: number }) {
  return (
    <div className="sd-pontos" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} data-feito={i + 1 <= atual} data-atual={i + 1 === atual} />
      ))}
    </div>
  );
}

export function Barra({ valor, cor }: { valor: number; cor?: string }) {
  return (
    <div className="sd-barra" role="progressbar" aria-valuenow={valor} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${Math.max(0, Math.min(100, valor))}%`, background: cor }} />
    </div>
  );
}
