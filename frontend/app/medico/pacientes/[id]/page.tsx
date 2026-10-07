"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Skeleton } from "antd";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import Topo, { Conteudo } from "@/components/layout/Topo";
import { Avatar, Barra, Botao, Cartao, Etiqueta, Icone, LinkSeta } from "@/components/ui";
import { api } from "@/lib/api";
import { hora } from "@/lib/formato";
import { ALERTAS_CLINICOS, ANEXOS, EVOLUCOES, ODONTOGRAMA, PLANO, type EstadoDente } from "@/lib/demo";
import type { Appointment, Patient } from "@/lib/types";

dayjs.locale("pt-br");

const ESTADO: Record<EstadoDente, { fundo: string; borda: string; cor: string; rotulo: string }> = {
  N: { fundo: "#fff", borda: "var(--cor-borda)", cor: "var(--cor-sutil)", rotulo: "Sem alteração" },
  T: { fundo: "#eaf3fd", borda: "#b8d4f1", cor: "var(--cor-info)", rotulo: "Em tratamento" },
  R: { fundo: "#e8f7ee", borda: "#b7e2c6", cor: "var(--cor-sucesso)", rotulo: "Restaurado" },
  A: { fundo: "#fef3e2", borda: "#f6d9a8", cor: "var(--cor-alerta)", rotulo: "Atenção" },
  X: { fundo: "#fdecec", borda: "#f5c2c2", cor: "var(--cor-erro)", rotulo: "Ausente" },
};

function Arcada({ titulo, dentes }: { titulo: string; dentes: string[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div className="sd-rotulo">{titulo}</div>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        {dentes.map((d, i) => {
          const e = ESTADO[d[2] as EstadoDente];
          return (
            <span key={d} style={{ display: "contents" }}>
              {i === 8 && <span style={{ width: 1, alignSelf: "stretch", background: "var(--cor-cinza-300)", margin: "0 4px" }} />}
              <span
                title={`Dente ${d.slice(0, 2)}: ${e.rotulo}`}
                style={{ flex: 1, height: 34, borderRadius: 8, background: e.fundo, border: `1px solid ${e.borda}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: e.cor, textDecoration: d[2] === "X" ? "line-through" : undefined }}
              >
                {d.slice(0, 2)}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function Meta({ icone, children }: { icone: string; children: React.ReactNode }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--cor-texto)" }}>
      <Icone nome={icone} tam={15} cor="var(--cor-suave)" />
      {children}
    </span>
  );
}

function AlertaClinico({ tom, icone, titulo, texto }: { tom: "ok" | "alerta"; icone: string; titulo: string; texto: string }) {
  return (
    <div className={`sd-tom-${tom}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12 }}>
      <Icone nome={icone} tam={17} />
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase" }}>{titulo}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--cor-tinta)" }}>{texto}</div>
      </div>
    </div>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, padding: "8px 0", borderTop: "1px solid #f1f4f9" }}>
      <div style={{ fontSize: 12, color: "var(--cor-suave)" }}>{rotulo}</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{valor}</div>
    </div>
  );
}

/** Prontuário: alertas clínicos no cabeçalho, odontograma, linha do tempo e plano de tratamento. */
export default function Prontuario() {
  const { id } = useParams<{ id: string }>();
  const [paciente, setPaciente] = useState<Patient | null>(null);

  useEffect(() => {
    api.getPatient(id).then(setPaciente).catch(() => setPaciente(null));
  }, [id]);

  const consultas: Appointment[] = [...(paciente?.appointments ?? [])].sort((a, b) => a.start.localeCompare(b.start));
  const proxima = consultas.find((a) => new Date(a.start) > new Date() && a.status !== "cancelado");
  const ultima = [...consultas].reverse().find((a) => new Date(a.start) <= new Date() && a.status !== "cancelado");
  const idade = paciente?.birth_date ? dayjs().diff(dayjs(paciente.birth_date), "year") : null;

  return (
    <>
      <Topo
        titulo="Prontuário do paciente"
        migalha={["Pacientes", paciente?.name ?? "…"]}
        acoes={
          <>
            <Botao tipo="secundario" icone="impressora" onClick={() => window.print()}>Imprimir</Botao>
            <Botao icone="mais">Nova evolução</Botao>
          </>
        }
      />
      <Conteudo gap={16}>
        <Cartao pad={16} gap={12}>
          {!paciente ? (
            <Skeleton active avatar paragraph={{ rows: 1 }} />
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <Avatar nome={paciente.name} tam={56} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em" }}>{paciente.name}</h2>
                    <Etiqueta texto={paciente.treatment ? "Em tratamento" : "Sem tratamento ativo"} tom={paciente.treatment ? "info" : "neutro"} />
                  </div>
                  <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                    {idade !== null && <Meta icone="pessoas">{idade} anos</Meta>}
                    {paciente.phone && <Meta icone="telefone">{paciente.phone}</Meta>}
                    {paciente.insurance_provider && (
                      <Meta icone="escudo">{paciente.insurance_provider}{paciente.insurance_card && ` · carteirinha ${paciente.insurance_card}`}</Meta>
                    )}
                    {paciente.created_at && <Meta icone="agenda">Paciente desde {dayjs(paciente.created_at).format("DD/MM/YYYY")}</Meta>}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <AlertaClinico tom="ok" icone="ok" titulo="Alergias" texto={ALERTAS_CLINICOS.alergias} />
                <AlertaClinico tom="alerta" icone="alerta" titulo="Observações" texto={paciente.notes || ALERTAS_CLINICOS.observacoes} />
              </div>
            </>
          )}
        </Cartao>

        <div className="sd-linha sd-linha-quebra" style={{ gap: 16, alignItems: "flex-start" }}>
          <div className="sd-coluna" style={{ flex: 1, gap: 16 }}>
            <Cartao gap={14} titulo="Odontograma" sub={`Atualizado em ${ODONTOGRAMA.atualizado}`}>
              <Arcada titulo="Arcada superior" dentes={ODONTOGRAMA.superior} />
              <Arcada titulo="Arcada inferior" dentes={ODONTOGRAMA.inferior} />
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {Object.values(ESTADO).map((e) => (
                  <span key={e.rotulo} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--cor-suave)" }}>
                    <span style={{ width: 12, height: 12, borderRadius: 4, background: e.fundo, border: `1px solid ${e.borda}` }} />
                    {e.rotulo}
                  </span>
                ))}
              </div>
            </Cartao>

            <Cartao gap={14} titulo="Histórico de evoluções" acao={<LinkSeta>Ver tudo</LinkSeta>}>
              <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" }}>
                {EVOLUCOES.map((e, i) => (
                  <li key={e.data} style={{ display: "flex", gap: 14 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, paddingTop: 4 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 999, background: "#fff", border: "2px solid var(--cor-primaria)" }} />
                      {i < EVOLUCOES.length - 1 && <span style={{ flex: 1, width: 2, background: "var(--cor-borda)" }} />}
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, paddingBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <b style={{ fontSize: 13 }}>{e.data}</b>
                        <span style={{ fontSize: 12, color: "var(--cor-suave)" }}>{e.autor}</span>
                        <Etiqueta texto={e.tipo} tom={e.tom} tam={11} />
                      </div>
                      <div style={{ fontSize: 14, color: "var(--cor-texto)", lineHeight: 1.45 }}>{e.texto}</div>
                    </div>
                  </li>
                ))}
              </ol>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 12, borderTop: "1px solid var(--cor-borda)" }}>
                <div className="sd-rotulo">Anexos do tratamento</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {ANEXOS.map((a) => (
                    <button key={a} type="button" className="sd-filtro" style={{ borderRadius: 10 }}>
                      <Icone nome="documento" tam={16} cor="var(--cor-primaria)" />
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </Cartao>
          </div>

          <div className="sd-coluna" style={{ width: 320, maxWidth: "100%", flexShrink: 0, gap: 16 }}>
            <Cartao gap={14}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div className="sd-rotulo">Próxima consulta</div>
                {proxima ? (
                  <>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--cor-primaria)" }}>
                      {dayjs(proxima.start).format("dddd, D [de] MMM").replace("-feira", "").replace(/^./, (c) => c.toUpperCase())} · {hora(proxima.start)}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--cor-suave)" }}>{proxima.procedure_name}</div>
                  </>
                ) : (
                  <div style={{ fontSize: 14, color: "var(--cor-suave)" }}>Nenhuma consulta marcada.</div>
                )}
              </div>
              {proxima && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Avatar nome={proxima.dentist_name} tam={28} />
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{proxima.dentist_name}</div>
                </div>
              )}
              <Botao block>Iniciar atendimento</Botao>
            </Cartao>

            <Cartao gap={12} titulo="Plano de tratamento" acao={<b style={{ fontSize: 14, color: "var(--cor-primaria)" }}>{PLANO.progresso}%</b>}>
              <Barra valor={PLANO.progresso} />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {PLANO.etapas.map((e, i) => (
                  <div key={e.texto} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: e.estado === "atual" ? "var(--cor-tinta)" : "var(--cor-suave)", fontWeight: e.estado === "atual" ? 600 : 400 }}>
                    {e.estado === "feito" ? (
                      <span className="sd-tom-ok" style={{ width: 22, height: 22, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icone nome="check" tam={13} esp={2.6} />
                      </span>
                    ) : (
                      <span style={{ width: 22, height: 22, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, ...(e.estado === "atual" ? { background: "var(--cor-primaria)", color: "#fff" } : { border: "1.5px solid var(--cor-cinza-300)", color: "var(--cor-sutil)" }) }}>
                        {i + 1}
                      </span>
                    )}
                    {e.texto}
                  </div>
                ))}
              </div>
            </Cartao>

            <Cartao gap={6} titulo="Resumo clínico">
              <div style={{ display: "flex", flexDirection: "column" }}>
                <Dado rotulo="Condição atual" valor={paciente?.treatment || "—"} />
                <Dado rotulo="Última visita" valor={ultima ? `${dayjs(ultima.start).format("DD/MM/YYYY")} · ${ultima.procedure_name}` : "—"} />
              </div>
            </Cartao>
          </div>
        </div>
      </Conteudo>
    </>
  );
}
