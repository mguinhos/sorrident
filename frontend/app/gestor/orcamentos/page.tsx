"use client";

import { useState } from "react";
import { Form, Input, InputNumber, Modal, message } from "antd";
import Topo, { Conteudo } from "@/components/layout/Topo";
import { Avatar, Botao, Cartao, Etiqueta, Icone } from "@/components/ui";
import { reais } from "@/lib/formato";
import { ORCAMENTO, type ItemOrcamento } from "@/lib/demo";

type Situacao = "aguardando aprovação" | "aprovado" | "recusado";
const TOM: Record<Situacao, "alerta" | "ok" | "erro"> = { "aguardando aprovação": "alerta", aprovado: "ok", recusado: "erro" };

function Linha({ rotulo, valor, cor, forte }: { rotulo: string; valor: string; cor?: string; forte?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: forte ? 15 : 13, fontWeight: forte ? 700 : 400, color: forte ? "var(--cor-tinta)" : "var(--cor-suave)" }}>{rotulo}</span>
      <span className="sd-num" style={{ fontSize: forte ? 24 : 14, fontWeight: forte ? 800 : 600, color: cor ?? (forte ? "var(--cor-primaria)" : "var(--cor-tinta)") }}>{valor}</span>
    </div>
  );
}

/** Orçamento do paciente: procedimentos editáveis, resumo com desconto e parcelamento, condições e histórico. */
export default function Orcamento() {
  const o = ORCAMENTO;
  const [itens, setItens] = useState<ItemOrcamento[]>(o.itens);
  const [situacao, setSituacao] = useState<Situacao>("aguardando aprovação");
  const [novo, setNovo] = useState(false);
  const [form] = Form.useForm();

  const subtotal = itens.reduce((s, i) => s + i.qtd * i.unitario, 0);
  const desconto = subtotal * o.desconto;
  const total = subtotal - desconto;
  const parcela = (total - o.entrada) / o.parcelas;

  const decidir = (s: Situacao) => {
    setSituacao(s);
    message.success(s === "aprovado" ? "Orçamento aprovado." : "Orçamento marcado como recusado.");
  };

  return (
    <>
      <Topo
        titulo={`Orçamento #${o.numero}`}
        migalha={["Orçamentos", o.paciente.nome]}
        aoLado={<Etiqueta texto={situacao} tom={TOM[situacao]} />}
        acoes={
          <>
            <Botao tipo="secundario" icone="impressora" onClick={() => window.print()}>Imprimir</Botao>
            <Botao tipo="secundario" icone="enviar" onClick={() => message.success("Orçamento enviado ao paciente pelo WhatsApp.")}>Enviar por WhatsApp</Botao>
            <Botao icone="check" disabled={situacao === "aprovado"} onClick={() => decidir("aprovado")}>Aprovar orçamento</Botao>
          </>
        }
      />
      <Conteudo gap={16}>
        <div className="sd-linha sd-linha-quebra" style={{ gap: 16, alignItems: "stretch" }}>
          <div className="sd-coluna" style={{ flex: 1, gap: 16 }}>
            <Cartao pad={18} gap={0}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <Avatar nome={o.paciente.nome} tam={46} fundo="var(--cor-primaria)" cor="#fff" />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{o.paciente.nome}</div>
                  <div style={{ fontSize: 12.5, color: "var(--cor-suave)" }}>{o.paciente.detalhe}</div>
                </div>
                {[["Responsável", o.responsavel], ["Convênio", o.convenio]].map(([r, v]) => (
                  <div key={r} style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, marginLeft: 12 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "#9aa6b8" }}>{r}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>
            </Cartao>

            <Cartao
              pad={18}
              gap={14}
              style={{ flex: 1 }}
              titulo="Procedimentos"
              acao={
                <button type="button" className="sd-link" onClick={() => setNovo(true)} style={{ border: "1px dashed var(--cor-primaria)", borderRadius: 10, padding: "0 14px", height: 32 }}>
                  + Adicionar procedimento
                </button>
              }
            >
              <table className="sd-tabela">
                <thead>
                  <tr style={{ background: "var(--cor-fundo)" }}>
                    {["Procedimento", "Dente", "Qtd", "Unitário", "Subtotal", ""].map((c, i) => (
                      <th key={i} style={{ padding: "8px 10px", fontSize: 10.5, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "#9aa6b8", textAlign: i === 0 ? "left" : i < 3 ? "center" : "right" }}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {itens.map((i) => (
                    <tr key={i.id}>
                      <td style={{ padding: "11px 10px", fontWeight: 600 }}>{i.procedimento}</td>
                      <td style={{ textAlign: "center", color: "var(--cor-suave)" }}>{i.dente}</td>
                      <td className="sd-num" style={{ textAlign: "center", color: "var(--cor-suave)" }}>{i.qtd}</td>
                      <td className="sd-num" style={{ textAlign: "right", color: "var(--cor-suave)" }}>{reais(i.unitario)}</td>
                      <td className="sd-num" style={{ textAlign: "right", fontWeight: 700, paddingRight: 10 }}>{reais(i.qtd * i.unitario)}</td>
                      <td style={{ width: 40, textAlign: "right" }}>
                        <button type="button" className="sd-sino" style={{ width: 32, height: 32, border: 0 }} aria-label={`Remover ${i.procedimento}`} onClick={() => setItens(itens.filter((x) => x.id !== i.id))}>
                          <Icone nome="fechar" tam={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 6, paddingTop: 14, borderTop: "1px solid var(--cor-borda)" }}>
                <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "#9aa6b8" }}>Observações para o paciente</span>
                <span style={{ fontSize: 13.5, lineHeight: 1.5 }}>{o.observacoes}</span>
              </div>
            </Cartao>
          </div>

          <div className="sd-coluna" style={{ width: 395, maxWidth: "100%", flexShrink: 0, gap: 16 }}>
            <Cartao pad={18} gap={10} titulo="Resumo do orçamento">
              <Linha rotulo="Subtotal" valor={reais(subtotal)} />
              <Linha rotulo={`Desconto (${Math.round(o.desconto * 100)}%)`} valor={`- ${reais(desconto)}`} cor="var(--cor-sucesso)" />
              <div style={{ borderTop: "1px solid var(--cor-borda)", paddingTop: 10 }}>
                <Linha rotulo="Total" valor={reais(total)} forte />
              </div>
              <Linha rotulo="Entrada" valor={reais(o.entrada)} />
              <Linha rotulo={`Saldo em ${o.parcelas}x`} valor={`${reais(parcela)} / mês`} />
            </Cartao>
            <Cartao pad={18} gap={10} titulo="Condições">
              {[["Pagamento", o.pagamento], ["Validade do orçamento", o.validade]].map(([r, v]) => (
                <div key={r} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "#9aa6b8" }}>{r}</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{v}</span>
                </div>
              ))}
              <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                <Botao tipo="suave" style={{ flex: 1 }} onClick={() => decidir("aprovado")} disabled={situacao === "aprovado"}>Marcar como aprovado</Botao>
                <Botao tipo="secundario" onClick={() => decidir("recusado")} disabled={situacao === "recusado"}>Recusado</Botao>
              </div>
            </Cartao>
            <Cartao pad={18} gap={12} titulo="Histórico" style={{ flex: 1 }}>
              <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {o.historico.map((h) => (
                  <li key={h.titulo} style={{ display: "flex", gap: 12 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 999, background: h.cor, marginTop: 6, flexShrink: 0 }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{h.titulo}</span>
                      <span style={{ fontSize: 11.5, color: "var(--cor-suave)" }}>{h.detalhe}</span>
                    </div>
                  </li>
                ))}
              </ol>
              <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, background: "var(--cor-fundo)", border: "1px solid var(--cor-borda)" }}>
                <span style={{ width: 28, height: 28, borderRadius: 999, background: "#fff", border: "1px solid var(--cor-borda)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "var(--cor-primaria)" }}>{o.aberturas.vezes}</span>
                <span style={{ fontSize: 12, color: "var(--cor-suave)" }}>
                  Aberto <b style={{ color: "var(--cor-tinta)" }}>{o.aberturas.vezes} vezes</b> pelo paciente · última em {o.aberturas.ultima}
                </span>
              </div>
            </Cartao>
          </div>
        </div>
      </Conteudo>

      <Modal
        title="Adicionar procedimento"
        open={novo}
        okText="Adicionar"
        cancelText="Cancelar"
        onCancel={() => setNovo(false)}
        onOk={async () => {
          const v = await form.validateFields();
          setItens([...itens, { id: `n${Date.now()}`, procedimento: v.procedimento, dente: v.dente || "-", qtd: v.qtd, unitario: v.unitario }]);
          form.resetFields();
          setNovo(false);
        }}
        destroyOnClose
      >
        <Form form={form} layout="vertical" requiredMark={false} initialValues={{ qtd: 1 }} preserve={false}>
          <Form.Item name="procedimento" label="Procedimento" rules={[{ required: true, message: "Informe o procedimento" }]}><Input /></Form.Item>
          <div style={{ display: "flex", gap: 12 }}>
            <Form.Item name="dente" label="Dente" style={{ flex: 1 }}><Input placeholder="-" /></Form.Item>
            <Form.Item name="qtd" label="Quantidade" style={{ flex: 1 }} rules={[{ required: true }]}><InputNumber min={1} style={{ width: "100%" }} /></Form.Item>
            <Form.Item name="unitario" label="Valor unitário (R$)" style={{ flex: 1.4 }} rules={[{ required: true, message: "Informe o valor" }]}><InputNumber min={0} step={10} style={{ width: "100%" }} /></Form.Item>
          </div>
        </Form>
      </Modal>
    </>
  );
}
