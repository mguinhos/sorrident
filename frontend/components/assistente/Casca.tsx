"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { Button } from "antd";
import { Icone, Passos } from "@/components/ui";

interface Props {
  fluxo: string;
  sub: string;
  passos: string[];
  atual: number;
  titulo: string;
  descricao: ReactNode;
  children: ReactNode;
  previa: ReactNode;
  previaRotulo?: string;
  aoVoltar?: () => void;
  aoProximo: () => void;
  aoSair: () => void;
  textoProximo?: string;
  extraRodape?: ReactNode;
  carregando?: boolean;
}

/** Casca dos assistentes de configuração: passos, conteúdo, prévia ao vivo e rodapé Voltar/Próximo/Concluir. */
export default function Casca({
  fluxo, sub, passos, atual, titulo, descricao, children, previa, previaRotulo = "Prévia",
  aoVoltar, aoProximo, aoSair, textoProximo, extraRodape, carregando,
}: Props) {
  const total = passos.length;
  const ultimo = atual === total;
  return (
    <div className="sd-assistente">
      <header className="sd-assistente-topo">
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
          <Image src="/logo.svg" alt="" width={36} height={36} priority />
          <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fluxo}</div>
            <div className="sd-assistente-sub" style={{ fontSize: 12.5, color: "var(--cor-suave)" }}>{sub}</div>
          </div>
        </div>
        <Button size="large" onClick={aoSair} className="sd-assistente-sair" style={{ height: 44, display: "inline-flex", alignItems: "center", gap: 8, color: "var(--cor-texto)" }}>
          <Icone nome="fechar" tam={16} />
          Salvar e sair
        </Button>
      </header>

      <div className="sd-assistente-corpo">
        <div className="sd-assistente-passos"><Passos passos={passos} atual={atual} /></div>
        <section className="sd-assistente-cartao" aria-labelledby="titulo-passo">
          <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
            <div className="sd-assistente-esq">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <h1 id="titulo-passo" style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2 }}>{titulo}</h1>
                <p style={{ margin: 0, fontSize: 15, color: "var(--cor-suave)", lineHeight: 1.5, maxWidth: 520 }}>{descricao}</p>
              </div>
              <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
            </div>
            <aside className="sd-assistente-previa" aria-label={previaRotulo}>
              <div className="sd-assistente-previa-rotulo">
                <Icone nome="imagem" tam={13} />
                {previaRotulo}
              </div>
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>{previa}</div>
            </aside>
          </div>
          <footer className="sd-assistente-rodape">
            {aoVoltar ? (
              <Button size="large" onClick={aoVoltar} className="sd-rodape-voltar" style={{ height: 48, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Icone nome="esq" tam={18} />
                Voltar
              </Button>
            ) : (
              extraRodape ?? <span className="sd-rodape-vazio" />
            )}
            <Button type="primary" size="large" loading={carregando} onClick={aoProximo} className="sd-rodape-proximo" style={{ height: 48, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              {textoProximo ?? (ultimo ? "Concluir" : "Próximo")}
              <Icone nome={ultimo ? "check" : "seta"} tam={18} esp={2.2} />
            </Button>
          </footer>
        </section>
      </div>
    </div>
  );
}
