"use client";

import { useState } from "react";
import Topo, { Conteudo } from "@/components/layout/Topo";
import { Botao, Cartao, Etiqueta, Icone, Kpi } from "@/components/ui";
import { reais } from "@/lib/formato";
import { CONVENIOS } from "@/lib/demo";

/** Convênios: tabela com barra de cobertura; o convênio selecionado alimenta o painel de coberturas. */
export default function Convenios() {
  const [sel, setSel] = useState(CONVENIOS[0].nome);
  const c = CONVENIOS.find((x) => x.nome === sel) ?? CONVENIOS[0];
  const ativos = CONVENIOS.filter((x) => x.status === "ativo").length;

  return (
    <>
      <Topo titulo="Convênios" sub="Planos e coberturas aceitos pela clínica" acoes={<Botao icone="mais">Novo convênio</Botao>} />
      <Conteudo>
        <div className="sd-linha sd-linha-quebra">
          <Kpi titulo="Convênios ativos" valor={ativos} icone="escudo" />
          <Kpi titulo="Consultas por convênio" valor="62%" icone="grafico" />
          <Kpi titulo="Repasse médio" valor="30 dias" icone="relogio" />
        </div>
        <div className="sd-linha sd-linha-quebra" style={{ alignItems: "flex-start" }}>
          <Cartao pad={24} gap={16} style={{ flex: 1 }} titulo="Convênios cadastrados" sub="Selecione um convênio para ver as coberturas">
            <table className="sd-tabela">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 12 }}>Convênio</th>
                  <th style={{ width: 170 }}>Cobertura</th>
                  <th style={{ width: 120 }}>Procedimentos</th>
                  <th style={{ width: 90 }}>Repasse</th>
                  <th style={{ width: 120 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {CONVENIOS.map((x) => {
                  const ativo = x.nome === sel;
                  return (
                    <tr
                      key={x.nome}
                      tabIndex={0}
                      aria-selected={ativo}
                      onClick={() => setSel(x.nome)}
                      onKeyDown={(k) => (k.key === "Enter" || k.key === " ") && setSel(x.nome)}
                      style={{ cursor: "pointer", ...(ativo ? { background: "var(--cor-primaria-suave)", boxShadow: "inset 3px 0 0 var(--cor-primaria)" } : {}) }}
                    >
                      <td style={{ paddingLeft: 12, padding: "14px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 10, background: ativo ? "#fff" : "var(--cor-fundo)", color: "var(--cor-primaria)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Icone nome="escudo" tam={16} />
                          </div>
                          <b style={{ fontWeight: 600 }}>{x.nome}</b>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ flex: 1, height: 6, borderRadius: 999, background: ativo ? "#d3e5f8" : "var(--cor-divisoria)" }}>
                            <div style={{ width: `${x.cobertura}%`, height: 6, borderRadius: 999, background: "var(--cor-primaria)" }} />
                          </div>
                          <span className="sd-num" style={{ width: 34, fontSize: 13, fontWeight: 600 }}>{x.cobertura}%</span>
                        </div>
                      </td>
                      <td style={{ color: "var(--cor-texto)" }}>{x.procedimentos}</td>
                      <td style={{ color: "var(--cor-texto)" }}>{x.repasse}</td>
                      <td><Etiqueta texto={x.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Cartao>
          <div className="sd-coluna" style={{ width: 340, maxWidth: "100%", flexShrink: 0 }}>
            <Cartao gap={8} titulo="Coberturas do convênio" sub={c.nome}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {c.coberturas.map(([proc, st]) => (
                  <div key={proc} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid #f1f4f9" }}>
                    <div style={{ fontSize: 14 }}>{proc}</div>
                    <Etiqueta texto={st} />
                  </div>
                ))}
              </div>
            </Cartao>
            <Cartao gap={8} titulo="Resumo do mês">
              <div style={{ display: "flex", flexDirection: "column" }}>
                {[
                  ["Atendimentos", String(c.resumo.atendimentos), undefined],
                  ["A receber do convênio", reais(c.resumo.aReceber).replace(",00", ""), undefined],
                  ["Glosas", reais(c.resumo.glosas).replace(",00", ""), "var(--cor-erro)"],
                ].map(([r, v, cor]) => (
                  <div key={r} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid #f1f4f9" }}>
                    <div style={{ fontSize: 14, color: "var(--cor-texto)" }}>{r}</div>
                    <div className="sd-num" style={{ fontSize: 15, fontWeight: 700, color: cor }}>{v}</div>
                  </div>
                ))}
              </div>
            </Cartao>
          </div>
        </div>
      </Conteudo>
    </>
  );
}
