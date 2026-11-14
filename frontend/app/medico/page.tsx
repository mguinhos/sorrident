"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Segmented, Skeleton, message } from "antd";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import Topo, { Conteudo } from "@/components/layout/Topo";
import NotificationBell from "@/components/NotificationBell";
import { Avatar, Botao, Cartao, Etiqueta, Icone, LinkSeta } from "@/components/ui";
import { useAuth } from "@/app/providers";
import { api } from "@/lib/api";
import { hora } from "@/lib/formato";
import { chamarProxima } from "@/lib/senhas";
import type { Appointment, Conversation, Dentist } from "@/lib/types";

dayjs.locale("pt-br");

const CANAL: Record<string, string> = { web: "chat do site", whatsapp: "WhatsApp", telegram: "Telegram" };

function Numero({ rotulo, valor, cor, borda = true }: { rotulo: string; valor: number; cor?: string; borda?: boolean }) {
  return (
    <div style={{ flex: 1, minWidth: 140, display: "flex", flexDirection: "column", gap: 6, padding: "0 20px", borderLeft: borda ? "1px solid var(--cor-borda)" : undefined }}>
      <div style={{ fontSize: 13, color: "var(--cor-suave)", fontWeight: 500 }}>{rotulo}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: cor, lineHeight: 1 }}>{valor}</div>
    </div>
  );
}

const statusExibido = (s: string) => (s === "agendado" ? "a confirmar" : s);

/** Painel do médico: agenda do dia com acesso direto ao prontuário. */
export default function PainelMedico() {
  const { user } = useAuth();
  const [dia, setDia] = useState(dayjs());
  const [visao, setVisao] = useState<"Dia" | "Semana">("Dia");
  const [consultas, setConsultas] = useState<Appointment[] | null>(null);
  const [temConsultasSemana, setTemConsultasSemana] = useState(false);
  const [agendaVista, setAgendaVista] = useState<string>(() =>
    typeof window !== "undefined" ? (window.localStorage.getItem("medico_agenda_last_seen") ?? "") : "",
  );
  const [conversas, setConversas] = useState<Conversation[]>([]);
  const [eu, setEu] = useState<Dentist | null>(null);

  const carregar = useCallback(async () => {
    if (!user) return;
    const ini = visao === "Semana" ? dia.startOf("week") : dia;
    try {
      const lista = await api.agenda(ini.format("YYYY-MM-DD"), visao === "Semana" ? 14 : 1);
      setConsultas(lista.filter((a) => a.status !== "cancelado"));
      // verifica se há consultas na semana (para o ponto vermelho)
      const iniSemana = dayjs().startOf("week");
      const listaSemana = await api.agenda(iniSemana.format("YYYY-MM-DD"), 14);
      setTemConsultasSemana(listaSemana.filter((a) => a.status !== "cancelado").length > 0);
    } catch {
      setConsultas([]);
    }
  }, [dia, visao, user]);

  useEffect(() => {
    if (!user) return;
    void carregar();
  }, [carregar, user]);

  useEffect(() => {
    if (!user) return;
    const t = setInterval(() => void carregar(), 30000);
    return () => clearInterval(t);
  }, [carregar, user]);

  useEffect(() => {
    if (!user) return;
    const carregarConv = () => api.listConversations().then((c) => setConversas(c.slice(0, 3))).catch(() => undefined);
    void carregarConv();
    const t = setInterval(() => void carregarConv(), 5000);
    api.listDentists().then((d) => setEu(d.find((x) => x.id === user?.linked_id) ?? null)).catch(() => undefined);
    return () => clearInterval(t);
  }, [user?.linked_id, user]);

  const lista = useMemo(() => [...(consultas ?? [])].sort((a, b) => a.start.localeCompare(b.start)), [consultas]);
  const confirmadas = lista.filter((a) => a.status === "confirmado").length;
  const aConfirmar = lista.filter((a) => a.status === "agendado");
  const faltas = lista.filter((a) => a.status === "faltou").length;
  const proximo = lista.find((a) => new Date(a.end) > new Date() && a.status !== "faltou" && a.status !== "concluido");

  return (
    <>
      <Topo
        titulo="Minha agenda"
        sub={eu ? `${eu.name} · ${eu.specialty}` : user?.display_name}
        acoes={
          <>
            <button
              type="button"
              aria-label="Chamar próximo paciente"
              onClick={() => {
                if (!proximo) {
                  message.info("Nenhum paciente na fila para chamar.");
                  return;
                }
                const partes = proximo.patient_name.split(" ");
                const curto = partes.length > 1 ? `${partes[0]} ${partes[partes.length - 1][0]}.` : partes[0];
                const s = chamarProxima("Consultório 1", curto);
                message.success(s ? `${curto} chamado(a) no painel com a senha ${s.codigo}.` : `${curto} foi chamado(a). Não há senhas na fila do quiosque.`);
              }}
              style={{ width: 40, height: 40, borderRadius: 10, border: 0, background: "var(--cor-primaria)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: 1 }}
            >
              <Icone nome="megafone" tam={18} cor="#fff" />
            </button>
            <NotificationBell />
          </>
        }
      />
      <Conteudo>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button type="button" className="sd-sino" style={{ width: 36, height: 36 }} aria-label="Anterior" onClick={() => setDia(dia.subtract(1, visao === "Dia" ? "day" : "week"))}>
            <Icone nome="esq" tam={16} />
          </button>
          <button type="button" className="sd-sino" style={{ width: 36, height: 36 }} aria-label="Próximo" onClick={() => setDia(dia.add(1, visao === "Dia" ? "day" : "week"))}>
            <Icone nome="dir" tam={16} />
          </button>
          <div style={{ fontSize: 18, fontWeight: 700, padding: "0 8px" }} aria-live="polite">
            {dia.format("dddd, D [de] MMMM").replace("-feira", "").replace(/^./, (c) => c.toUpperCase())}
          </div>
          <Botao tipo="primario" tam="P" style={{ fontFamily: "var(--fonte-poppins)" }} onClick={() => setDia(dayjs())}>Hoje</Botao>
        </div>

        <div className="sd-linha sd-linha-quebra" style={{ alignItems: "flex-start" }}>
          <Cartao
            pad={24}
            gap={20}
            style={{ flex: 1 }}
            titulo={visao === "Dia" ? "Hoje na clínica" : "Minha semana"}
            acao={<Segmented value={visao} onChange={(v) => setVisao(v as "Dia" | "Semana")} options={[
              { label: "Dia", value: "Dia" },
              {
                label: (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    Semana
                    {temConsultasSemana && visao !== "Semana" && (
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff4d4f", display: "inline-block" }} />
                    )}
                  </span>
                ),
                value: "Semana",
              },
            ]} />}
          >
            <div style={{ display: "flex", flexWrap: "wrap", rowGap: 16, padding: "16px 0", borderRadius: 12, background: "var(--cor-fundo)" }}>
              <Numero rotulo={visao === "Dia" ? "Consultas hoje" : "Consultas"} valor={lista.length} borda={false} />
              <Numero rotulo="Confirmadas" valor={confirmadas} cor="var(--cor-sucesso)" />
              <Numero rotulo="A confirmar" valor={aConfirmar.length} cor="var(--cor-alerta)" />
              <Numero rotulo="Faltas" valor={faltas} />
            </div>
            {consultas === null ? (
              <Skeleton active />
            ) : lista.length === 0 ? (
              <div style={{ color: "var(--cor-suave)" }}>Nenhuma consulta neste período.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {lista.map((a) => {
                  const destaque = a.status === "agendado";
                  return (
                    <div key={a.id} className="sd-agenda-item" style={{ display: "flex", alignItems: "stretch", gap: 16 }}>
                      <div className="sd-agenda-hora" style={{ width: 52, paddingTop: 18, paddingLeft: 8, fontSize: 15, fontWeight: 700 }}>

                        {visao === "Semana" ? dayjs(a.start).format("DD/MM") : hora(a.start)}
                      </div>
                      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 12, border: `1px solid ${destaque ? "#f6d9a8" : "var(--cor-borda)"}`, background: destaque ? "#fffbf3" : "#fff", flexWrap: "wrap" }}>
                        <Avatar nome={a.patient_name} tam={40} />
                        <div style={{ flex: 1, minWidth: 160, display: "flex", flexDirection: "column", gap: 3 }}>
                          <div style={{ fontSize: 15, fontWeight: 600 }}>{a.patient_name}</div>
                          <div style={{ fontSize: 13, color: "var(--cor-suave)" }}>
                            {a.procedure_name || "Consulta"} · {Math.round((new Date(a.end).getTime() - new Date(a.start).getTime()) / 60000)} min
                            {a.dentist_name && ` · ${a.dentist_name}`}
                            {visao === "Semana" && ` · ${hora(a.start)}`}
                          </div>
                        </div>
                        <Etiqueta texto={statusExibido(a.status)} />
                        {a.cadastrado === false ? (
                          <Etiqueta texto="não cadastrado" tom="alerta" />
                        ) : (
                          <Etiqueta texto="cadastrado" tom="ok" />
                        )}
                        <Botao tipo="secundario" tam="P" href={`/medico/pacientes/${a.patient_id}`}>Abrir prontuário</Botao>
                        {a.status !== "cancelado" && a.status !== "concluido" && (
                          <Botao
                            tipo="secundario"
                            tam="P"
                            onClick={async () => {
                              if (!confirm(`Cancelar a consulta de ${a.patient_name}?`)) return;
                              try {
                                await api.cancelAppointment(a.id, "Cancelado pelo profissional");
                                message.success("Consulta cancelada.");
                                void carregar();
                              } catch (e) {
                                message.error(e instanceof Error ? e.message : "Não foi possível cancelar.");
                              }
                            }}
                          >
                            Cancelar
                          </Botao>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Cartao>

          <div className="sd-medico-sidebar" style={{ width: 340, maxWidth: "100%", flexShrink: 0, display: "flex", flexDirection: "column", gap: 20 }}>
            <Cartao pad={24} gap={12} titulo="Pendências">
              {aConfirmar.length === 0 && <div style={{ fontSize: 14, color: "var(--cor-suave)" }}>Nada pendente.</div>}
              {aConfirmar.map((a) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, border: "1px solid var(--cor-borda)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: "#f59e0b", flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 14 }}>{a.patient_name} aguarda confirmação</div>
                </div>
              ))}
            </Cartao>
            <Cartao pad={24} gap={8} titulo="Conversas recentes" acao={<LinkSeta href="/medico/conversas">Ver todas</LinkSeta>}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {conversas.length === 0 && <div style={{ fontSize: 14, color: "var(--cor-suave)" }}>Sem conversas recentes.</div>}
                {conversas.map((c) => (
                  <Link key={c.id} href="/medico/conversas" style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 0", borderTop: "1px solid #f1f4f9", color: "inherit", textDecoration: "none" }}>
                    <Avatar nome={c.display_name || "Paciente"} tam={36} />
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{c.display_name || "Paciente"}</div>
                        <div style={{ fontSize: 12, color: "var(--cor-suave)" }}>{c.last_message_at ? hora(c.last_message_at) : ""}</div>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--cor-suave)" }}>via {CANAL[c.channel] ?? c.channel}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </Cartao>
          </div>
        </div>
      </Conteudo>
    </>
  );
}
