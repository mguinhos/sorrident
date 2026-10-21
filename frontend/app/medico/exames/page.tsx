"use client";

import { useMemo, useState } from "react";
import { Input, Upload, message } from "antd";
import Topo, { Conteudo } from "@/components/layout/Topo";
import { Avatar, Botao, Cartao, Etiqueta, Icone } from "@/components/ui";
import { EXAMES, type Exame } from "@/lib/demo";

const FILTROS: { rotulo: string; status?: Exame["status"] }[] = [
  { rotulo: "Todos" },
  { rotulo: "Solicitados", status: "solicitado" },
  { rotulo: "Em análise", status: "em análise" },
  { rotulo: "Prontos", status: "pronto" },
];

/** Exames: filtros com contagem, busca, linha selecionada ligada ao resultado e envio de arquivo. */
export default function Exames() {
  const [filtro, setFiltro] = useState<Exame["status"] | undefined>();
  const [busca, setBusca] = useState("");
  const [selId, setSelId] = useState(EXAMES[0].id);

  const lista = useMemo(
    () => EXAMES.filter((e) => (!filtro || e.status === filtro) && `${e.paciente} ${e.exame}`.toLowerCase().includes(busca.toLowerCase())),
    [filtro, busca],
  );
  const sel = EXAMES.find((e) => e.id === selId) ?? EXAMES[0];

  return (
    <>
      <Topo titulo="Exames" sub="Exames e resultados dos pacientes" acoes={<Botao icone="mais">Novo exame</Botao>} />
      <Conteudo gap={16}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} role="group" aria-label="Filtrar por status">
            {FILTROS.map((f) => (
              <button key={f.rotulo} type="button" className="sd-filtro" aria-pressed={filtro === f.status} onClick={() => setFiltro(f.status)}>
                {f.rotulo}
                <span className="sd-filtro-qtd">{EXAMES.filter((e) => !f.status || e.status === f.status).length}</span>
              </button>
            ))}
          </div>
          <Input
            allowClear
            prefix={<Icone nome="busca" tam={16} cor="var(--cor-sutil)" />}
            placeholder="Buscar paciente ou exame"
            style={{ width: 260 }}
            onChange={(e) => setBusca(e.target.value)}
            aria-label="Buscar paciente ou exame"
          />
        </div>

        <div className="sd-linha sd-linha-quebra" style={{ alignItems: "flex-start" }}>
          <div className="sd-coluna" style={{ flex: 1 }}>
            <Cartao pad={16} gap={0}>
              <table className="sd-tabela">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: 16 }}>Paciente</th>
                    <th>Exame</th>
                    <th style={{ width: 70 }}>Data</th>
                    <th style={{ width: 120 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((e) => {
                    const ativo = e.id === sel.id;
                    return (
                      <tr
                        key={e.id}
                        onClick={() => setSelId(e.id)}
                        onKeyDown={(k) => (k.key === "Enter" || k.key === " ") && setSelId(e.id)}
                        tabIndex={0}
                        aria-selected={ativo}
                        style={{ cursor: "pointer", background: ativo ? "var(--cor-primaria-suave)" : undefined, boxShadow: ativo ? "inset 3px 0 0 var(--cor-primaria)" : undefined }}
                      >
                        <td style={{ paddingLeft: 16 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <Avatar nome={e.paciente} tam={30} fundo={ativo ? "#fff" : undefined} />
                            <b style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{e.paciente}</b>
                          </div>
                        </td>
                        <td style={{ color: "var(--cor-texto)" }}>{e.exame}</td>
                        <td className="sd-num" style={{ fontSize: 13, color: "var(--cor-suave)" }}>{e.data.slice(0, 5)}</td>
                        <td><Etiqueta texto={e.status} /></td>
                      </tr>
                    );
                  })}
                  {lista.length === 0 && (
                    <tr><td colSpan={4} style={{ color: "var(--cor-suave)", paddingLeft: 16 }}>Nenhum exame encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </Cartao>

            <Upload.Dragger
              multiple
              accept=".png,.jpg,.jpeg,.dcm,.pdf"
              showUploadList={false}
              beforeUpload={(f) => {
                message.info(`${f.name} pronto para envio. O armazenamento de exames ainda não está disponível na API.`);
                return false;
              }}
              style={{ border: "1.5px dashed #b8d4f1", borderRadius: 16, background: "#f8fbff" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "8px 16px", textAlign: "left" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--cor-primaria-suave)", color: "var(--cor-primaria)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icone nome="subir" tam={22} />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>Cadastrar exame</div>
                  <div style={{ fontSize: 13, color: "var(--cor-suave)" }}>Arraste a imagem/arquivo ou clique (PNG, JPG, DICOM, PDF)</div>
                </div>
                <span style={{ height: 40, padding: "0 16px", borderRadius: 12, display: "inline-flex", alignItems: "center", border: "1px solid var(--cor-borda)", background: "#fff", fontWeight: 600, fontSize: 14 }}>Escolher arquivo</span>
              </div>
            </Upload.Dragger>
          </div>

          <div style={{ width: 400, maxWidth: "100%", flexShrink: 0 }}>
            <Cartao gap={16} titulo="Resultado do exame" acao={<Etiqueta texto={sel.status} />}>
              <div style={{ height: 220, borderRadius: 12, background: "linear-gradient(160deg,#0b1b33 0%,#1b3557 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "#9fb7d6" }}>
                <Icone nome="dente" tam={40} cor="#5f7fa8" esp={1.4} />
                <div style={{ fontSize: 13, fontWeight: 600 }}>{sel.exame} · prévia</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{sel.paciente}</div>
                <div style={{ fontSize: 13, color: "var(--cor-suave)" }}>{sel.exame} · {sel.data} · {sel.profissional}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 14, borderRadius: 12, background: "var(--cor-fundo)" }}>
                <div className="sd-rotulo">Laudo</div>
                <div style={{ fontSize: 14, lineHeight: 1.5 }}>{sel.laudo || "Laudo ainda não disponível."}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <Botao icone="baixar" block style={{ paddingInline: 10 }} disabled={sel.status !== "pronto"}>Baixar resultado</Botao>
                <Botao tipo="secundario" icone="enviar" block style={{ paddingInline: 10 }} disabled={sel.status !== "pronto"}>Enviar ao paciente</Botao>
              </div>
            </Cartao>
          </div>
        </div>
      </Conteudo>
    </>
  );
}
