"use client";

import { useCallback, useEffect, useState } from "react";
import { Skeleton } from "antd";
import Topo, { Conteudo } from "@/components/layout/Topo";
import NotificationBell from "@/components/NotificationBell";
import { Avatar, Botao, Cartao, Etiqueta, Icone, Kpi, LinkSeta } from "@/components/ui";
import type { Tom } from "@/components/ui";
import { api } from "@/lib/api";
import { dataLonga, hora, mesmoDia, saudacao } from "@/lib/formato";
import type { DashboardData } from "@/lib/types";

function Pendencia({ icone, tom, titulo, desc, acao }: { icone: string; tom: Tom; titulo: string; desc: string; acao: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: 14, borderRadius: 12, border: "1px solid var(--cor-borda)" }}>
      <div className={`sd-tom-${tom}`} style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icone nome={icone} tam={18} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{titulo}</div>
        <div style={{ fontSize: 13, color: "var(--cor-suave)", lineHeight: 1.4 }}>{desc}</div>
        <div style={{ paddingTop: 6, display: "flex" }}>{acao}</div>
      </div>
    </div>
  );
}

/** Painel do gestor: resumo do dia, próximas consultas e pendências. */
export default function VisaoGeral() {
  const [dados, setDados] = useState<DashboardData | null>(null);

  const carregar = useCallback(async () => {
    try {
      setDados(await api.dashboard());
    } catch {
      /* mantém o último resumo */
    }
  }, []);

  useEffect(() => {
    void carregar();
    const t = setInterval(() => void carregar(), 30000);
    return () => clearInterval(t);
  }, [carregar]);

  const hoje = new Date();
  const proximas = (dados?.next_appointments ?? []).filter((a) => mesmoDia(new Date(a.start), hoje));
  const lista = proximas.length ? proximas : (dados?.next_appointments ?? []).slice(0, 6);
  const semConfirmar = proximas.filter((a) => a.status === "agendado");
  const naoLidas = dados?.unread_messages ?? 0;

  return (
    <>
      <Topo
        titulo="Visão geral"
        sub={`${saudacao()}! Este é o resumo da clínica hoje.`}
        acoes={
          <>
            <NotificationBell />
            <Botao tipo="secundario" icone="pessoas" href="/gestor/pacientes">Cadastrar paciente</Botao>
            <Botao icone="mais" href="/gestor/agenda">Novo agendamento</Botao>
          </>
        }
      />
      <Conteudo>
        <div className="sd-linha sd-linha-quebra">
          <Kpi titulo="Consultas hoje" valor={dados?.appointments_today ?? "–"} icone="agenda" rodape={<LinkSeta href="/gestor/agenda">Abrir agenda</LinkSeta>} />
          <Kpi titulo="Consultas na semana" valor={dados?.appointments_week ?? "–"} icone="grafico" />
          <Kpi titulo="Pacientes" valor={dados?.patients_total ?? "–"} icone="pessoas" rodape={<LinkSeta href="/gestor/pacientes">Ver pacientes</LinkSeta>} />
          <Kpi
            titulo="Mensagens não lidas"
            valor={dados ? naoLidas : "–"}
            icone="chat"
            tomIcone={["var(--cor-alerta-fundo)", "var(--cor-alerta)"]}
            rodape={<LinkSeta href="/gestor/conversas">Responder</LinkSeta>}
          />
        </div>

        <div className="sd-linha sd-linha-quebra" style={{ alignItems: "flex-start" }}>
          <Cartao
            pad={24}
            gap={20}
            style={{ flex: 1 }}
            titulo="Próximas consultas"
            sub={proximas.length ? `Hoje, ${dataLonga(hoje).toLowerCase()}` : "Próximos dias"}
            acao={<LinkSeta href="/gestor/agenda">Ver agenda completa</LinkSeta>}
          >
            {!dados ? (
              <Skeleton active />
            ) : lista.length === 0 ? (
              <div style={{ color: "var(--cor-suave)", fontSize: 14 }}>Nenhuma consulta marcada.</div>
            ) : (
              <table className="sd-tabela">
                <thead>
                  <tr>
                    <th style={{ width: 80 }}>Horário</th>
                    <th style={{ width: 240 }}>Paciente</th>
                    <th>Procedimento e profissional</th>
                    <th style={{ width: 120 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((a) => (
                    <tr key={a.id}>
                      <td className="sd-num" style={{ fontSize: 15, fontWeight: 700 }}>{hora(a.start)}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Avatar nome={a.patient_name} />
                          <span style={{ fontWeight: 600 }}>{a.patient_name}</span>
                        </div>
                      </td>
                      <td>
                        <div>{a.procedure_name}</div>
                        <div style={{ fontSize: 13, color: "var(--cor-suave)" }}>{a.dentist_name}</div>
                      </td>
                      <td><Etiqueta texto={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Cartao>

          <div style={{ width: 340, maxWidth: "100%", flexShrink: 0, display: "flex", flexDirection: "column", gap: 20 }}>
            <Cartao pad={24} gap={12} titulo="Precisa de atenção">
              <Pendencia
                icone="chat"
                tom="alerta"
                titulo={`${naoLidas} ${naoLidas === 1 ? "mensagem não lida" : "mensagens não lidas"}`}
                desc="Pacientes aguardando resposta no chat."
                acao={<Botao tipo="suave" tam="P" href="/gestor/conversas">Abrir conversas</Botao>}
              />
              <Pendencia
                icone="relogio"
                tom="info"
                titulo={`${semConfirmar.length} ${semConfirmar.length === 1 ? "consulta sem confirmação" : "consultas sem confirmação"}`}
                desc={
                  semConfirmar.length
                    ? semConfirmar.map((a) => `${a.patient_name} (${hora(a.start)})`).join(" e ")
                    : "Todas as consultas de hoje estão confirmadas."
                }
                acao={<Botao tipo="suave" tam="P" href="/gestor/agenda">Ver na agenda</Botao>}
              />
            </Cartao>
          </div>
        </div>
      </Conteudo>
    </>
  );
}
