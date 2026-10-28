"use client";

import { useEffect, useState } from "react";
import { Select, message } from "antd";
import Topo, { Conteudo } from "@/components/layout/Topo";
import { Botao, Cartao, Etiqueta, Icone } from "@/components/ui";
import { api } from "@/lib/api";
import { reais } from "@/lib/formato";
import { FORMAS_PAGAMENTO, PLANO_PAGAMENTO } from "@/lib/demo";
import type { Patient } from "@/lib/types";

function Valor({ rotulo, valor, cor, borda = true }: { rotulo: string; valor: string; cor?: string; borda?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...(borda ? { borderLeft: "1px solid var(--cor-borda)", paddingLeft: 24 } : {}) }}>
      <div style={{ fontSize: 13, color: "var(--cor-suave)", fontWeight: 500 }}>{rotulo}</div>
      <div className="sd-num" style={{ fontSize: 26, fontWeight: 700, color: cor, lineHeight: 1, letterSpacing: "-0.01em" }}>{valor}</div>
    </div>
  );
}

/** Pagamentos do paciente: resumo com progresso, próxima parcela destacada com ação de cobrança. */
export default function Pagamentos() {
  const [pacientes, setPacientes] = useState<Patient[]>([]);
  const [paciente, setPaciente] = useState(PLANO_PAGAMENTO.paciente);
  const [forma, setForma] = useState("Pix");
  const p = PLANO_PAGAMENTO;
  const proxima = p.parcelas.find((x) => x.status !== "pago");
  const pagas = p.parcelas.filter((x) => x.status === "pago").length;
  const aberto = p.total - p.pago;

  useEffect(() => {
    api.listPatients().then(setPacientes).catch(() => undefined);
  }, []);

  const cobrar = () => message.success(`Cobrança via ${forma} enviada para ${paciente} pelo WhatsApp.`);

  return (
    <>
      <Topo
        titulo={`Pagamentos · ${paciente}`}
        migalha={["Pacientes", paciente]}
        acoes={
          <>
            <Select
              showSearch
              value={paciente}
              onChange={setPaciente}
              style={{ width: 220 }}
              aria-label="Paciente"
              options={(pacientes.length ? pacientes.map((x) => x.name) : [p.paciente]).map((n) => ({ value: n, label: n }))}
            />
            <Botao icone="mais">Registrar pagamento</Botao>
          </>
        }
      />
      <Conteudo>
        <Cartao pad={24} gap={18}>
          <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
            <Valor rotulo="Total do tratamento" valor={reais(p.total).replace(",00", "")} borda={false} />
            <Valor rotulo="Pago" valor={reais(p.pago).replace(",00", "")} cor="var(--cor-sucesso)" />
            <Valor rotulo="Em aberto" valor={reais(aberto).replace(",00", "")} cor="var(--cor-alerta)" />
            {proxima && (
              <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", padding: "12px 16px", borderRadius: 12, background: "var(--cor-fundo)" }}>
                <div style={{ fontSize: 12, color: "var(--cor-suave)" }}>Próximo vencimento</div>
                <div className="sd-num" style={{ fontSize: 15, fontWeight: 700 }}>{proxima.vencimento} · {reais(proxima.valor)}</div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div className="sd-barra" style={{ background: "var(--cor-alerta-fundo)" }} role="progressbar" aria-valuenow={Math.round((p.pago / p.total) * 100)}>
              <span style={{ width: `${(p.pago / p.total) * 100}%`, background: "#16a34a" }} />
            </div>
            <div style={{ fontSize: 12, color: "var(--cor-suave)" }}>{pagas} de {p.parcelas.length} parcelas pagas</div>
          </div>
        </Cartao>

        <div className="sd-linha sd-linha-quebra" style={{ alignItems: "flex-start" }}>
          <Cartao pad={24} gap={16} style={{ flex: 1 }} titulo="Parcelas" sub={`${p.parcelas.length} parcelas`}>
            <table className="sd-tabela">
              <thead>
                <tr>
                  <th style={{ width: 80, paddingLeft: 12 }}>Parcela</th>
                  <th>Vencimento</th>
                  <th style={{ width: 120, textAlign: "right" }}>Valor</th>
                  <th style={{ width: 120, paddingLeft: 16 }}>Status</th>
                  <th style={{ width: 110 }} />
                </tr>
              </thead>
              <tbody>
                {p.parcelas.map((x) => {
                  const prox = x === proxima;
                  return (
                    <tr key={x.n} style={prox ? { background: "#fffbf3", boxShadow: "inset 3px 0 0 #f59e0b" } : undefined}>
                      <td style={{ paddingLeft: 12, fontWeight: 700 }}>{x.n}</td>
                      <td className="sd-num" style={{ color: "var(--cor-texto)" }}>
                        {x.vencimento}
                        {prox && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--cor-alerta)", marginLeft: 8 }}>PRÓXIMA</span>}
                      </td>
                      <td className="sd-num" style={{ textAlign: "right", fontWeight: 600 }}>{reais(x.valor)}</td>
                      <td style={{ paddingLeft: 16 }}><Etiqueta texto={x.status} /></td>
                      <td style={{ textAlign: "right", paddingRight: 12 }}>
                        {prox && <Botao tipo="suave" tam="P" icone="enviar" onClick={cobrar}>Cobrar</Botao>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Cartao>

          <div className="sd-coluna" style={{ width: 340, maxWidth: "100%", flexShrink: 0 }}>
            <Cartao gap={14}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--cor-primaria-suave)", color: "var(--cor-primaria)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icone nome="enviar" tam={19} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>Enviar cobrança</div>
                  <div style={{ fontSize: 13, color: "var(--cor-suave)" }}>Pix ou boleto por WhatsApp</div>
                </div>
              </div>
              <Botao tipo="suave" block onClick={cobrar}>Enviar cobrança</Botao>
            </Cartao>
            <Cartao gap={6} titulo="Últimos recebimentos">
              <div style={{ display: "flex", flexDirection: "column" }}>
                {p.recebimentos.map((r) => (
                  <div key={r.desc} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: "1px solid #f1f4f9" }}>
                    <div className="sd-tom-ok" style={{ width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icone nome="check" tam={15} esp={2.4} />
                    </div>
                    <div style={{ flex: 1, fontSize: 14, color: "var(--cor-texto)" }}>{r.desc}</div>
                    <div className="sd-num" style={{ fontSize: 14, fontWeight: 700, color: "var(--cor-sucesso)" }}>+ {reais(r.valor)}</div>
                  </div>
                ))}
              </div>
            </Cartao>
            <Cartao gap={14} titulo="Formas de pagamento">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }} role="radiogroup" aria-label="Forma de pagamento">
                {FORMAS_PAGAMENTO.map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="radio"
                    aria-checked={forma === f}
                    onClick={() => setForma(f)}
                    style={{ font: "inherit", height: 36, padding: "0 14px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", ...(forma === f ? { background: "var(--cor-primaria)", color: "#fff", border: "1px solid var(--cor-primaria)" } : { background: "#fff", border: "1px solid var(--cor-borda)", color: "var(--cor-texto)" }) }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </Cartao>
          </div>
        </div>
      </Conteudo>
    </>
  );
}
