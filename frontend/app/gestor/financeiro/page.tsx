"use client";

import { useState } from "react";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import Topo, { Conteudo } from "@/components/layout/Topo";
import { Avatar, Botao, Cartao, Etiqueta, Icone } from "@/components/ui";
import { reais } from "@/lib/formato";
import { FINANCEIRO, LANCAMENTOS, RECEITA_MENSAL, RECEITA_SERVICO, type Periodo } from "@/lib/demo";

dayjs.locale("pt-br");

const TOM_DELTA = {
  ok: ["var(--cor-sucesso-fundo)", "var(--cor-sucesso)"],
  info: ["var(--cor-info-fundo)", "var(--cor-primaria)"],
  alerta: ["var(--cor-alerta-fundo)", "var(--cor-alerta)"],
} as const;

/** Financeiro do gestor: resumo do período, receita por mês e por serviço, últimos lançamentos. */
export default function Financeiro() {
  const [periodo, setPeriodo] = useState<Periodo>("Mês");
  const [mes, setMes] = useState(dayjs());
  const max = Math.max(...RECEITA_MENSAL.map((r) => r.valor));
  const anterior = mes.subtract(1, "month").format("MMMM");

  return (
    <>
      <Topo
        titulo="Financeiro"
        sub="Receitas, recebimentos e inadimplência"
        acoes={
          <>
            <DatePicker
              picker="month"
              value={mes}
              onChange={(d) => d && setMes(d)}
              format={(d) => d.format("MMMM YYYY").replace(/^./, (c) => c.toUpperCase())}
              allowClear={false}
              aria-label="Mês de referência"
              style={{ width: 170 }}
            />
            <Botao tipo="secundario" icone="baixar">Exportar</Botao>
            <Botao icone="mais">Novo lançamento</Botao>
          </>
        }
      />
      <Conteudo gap={16}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Resumo do {periodo === "Mês" ? "mês" : periodo === "Ano" ? "ano" : "trimestre"}</h2>
          <div style={{ display: "flex", gap: 6 }} role="radiogroup" aria-label="Período">
            {(["Mês", "Trimestre", "Ano"] as Periodo[]).map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={periodo === p}
                onClick={() => setPeriodo(p)}
                className="sd-filtro"
                style={periodo === p ? { background: "var(--cor-primaria)", borderColor: "var(--cor-primaria)", color: "#fff" } : { color: "var(--cor-suave)" }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="sd-linha sd-linha-quebra" style={{ gap: 16 }}>
          {FINANCEIRO[periodo].kpis.map((k) => {
            const [fundo, cor] = TOM_DELTA[k.tom];
            return (
              <Cartao key={k.rotulo} pad={18} gap={8} style={{ flex: 1 }} as="div">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".1em", color: "#9aa6b8", textTransform: "uppercase" }}>{k.rotulo}</span>
                  <span style={{ width: 30, height: 30, borderRadius: 9, background: fundo, color: cor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icone nome={k.icone} tam={16} esp={2} />
                  </span>
                </div>
                <span className="sd-num" style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" }}>{k.valor}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, color: cor, background: fundo }}>{k.delta}</span>
                  <span style={{ fontSize: 11, color: "var(--cor-suave)" }}>vs. {periodo === "Mês" ? anterior : "período anterior"}</span>
                </div>
              </Cartao>
            );
          })}
        </div>

        <div className="sd-linha sd-linha-quebra" style={{ gap: 16 }}>
          <Cartao pad={18} gap={14} style={{ flex: 1.7 }} titulo={<span style={{ fontSize: 14 }}>Receita por mês</span>} acao={<span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--cor-suave)" }}>últimos 6 meses</span>}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 18, height: 190 }} role="img" aria-label={`Receita mensal: ${RECEITA_MENSAL.map((r) => `${r.mes} ${Math.round(r.valor / 1000)} mil`).join(", ")}`}>
              {RECEITA_MENSAL.map((r) => (
                <div key={r.mes} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 6, height: "100%" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--cor-suave)" }}>{Math.round(r.valor / 1000)}k</span>
                  <div style={{ width: "100%", maxWidth: 46, height: (r.valor / max) * 150, borderRadius: "8px 8px 4px 4px", background: r.cor }} />
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--cor-suave)" }}>{r.mes}</span>
                </div>
              ))}
            </div>
          </Cartao>
          <Cartao pad={18} gap={14} style={{ flex: 1 }} titulo={<span style={{ fontSize: 14 }}>Receita por serviço</span>}>
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {RECEITA_SERVICO.map((s) => (
                <div key={s.servico} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{s.servico}</span>
                    <span className="sd-num" style={{ fontSize: 12.5, fontWeight: 700 }}>{reais(s.valor).replace(",00", "")}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: "var(--cor-fundo)", overflow: "hidden" }}>
                    <div style={{ width: `${s.pct}%`, height: "100%", borderRadius: 999, background: s.cor }} />
                  </div>
                </div>
              ))}
            </div>
          </Cartao>
        </div>

        <Cartao pad={18} gap={0}>
          <table className="sd-tabela">
            <thead>
              <tr>
                {["Paciente", "Serviço", "Data", "Valor", "Status"].map((c, i) => (
                  <th key={c} style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "#9aa6b8", textAlign: i >= 3 ? "right" : "left" }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LANCAMENTOS.map((l) => (
                <tr key={l.paciente + l.data}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Avatar nome={l.paciente} tam={34} fundo="var(--cor-primaria)" cor="#fff" />
                      <b style={{ fontWeight: 600 }}>{l.paciente}</b>
                    </div>
                  </td>
                  <td style={{ color: "var(--cor-suave)" }}>{l.servico}</td>
                  <td className="sd-num" style={{ color: "var(--cor-suave)" }}>{l.data}</td>
                  <td className="sd-num" style={{ textAlign: "right", fontWeight: 700 }}>{reais(l.valor)}</td>
                  <td style={{ textAlign: "right" }}><Etiqueta texto={l.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Cartao>
      </Conteudo>
    </>
  );
}
