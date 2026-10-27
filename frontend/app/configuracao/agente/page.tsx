"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Modal, TimePicker, message } from "antd";
import ChatPanel from "@/components/ChatPanel";
import dayjs from "dayjs";
import Casca from "@/components/assistente/Casca";
import { AvisoChat, Bolha, MiniChat } from "@/components/assistente/Miniaturas";
import { Celular3D, SeloFlutuante } from "@/components/assistente/Modelos3D";
import Resumo from "@/components/assistente/Resumo";
import { Aviso, Botao, Campo, Escolha, GrupoEscolha, Icone, Opcao } from "@/components/ui";
import { api } from "@/lib/api";

const PASSOS = ["Persona e tom", "Modelo", "Regras", "Horário de atendimento", "Concluir"];

const TONS = {
  Acolhedor: { desc: "Próximo e gentil, usa o primeiro nome do paciente", icone: "sorriso", exemplo: "Olá, Ana! Que bom falar com você. Tenho horários na quinta às 09h ou 14h20. Qual fica melhor?" },
  Formal: { desc: "Educado e objetivo, trata por senhor ou senhora", icone: "cracha", exemplo: "Bom dia, senhora Ana. Há horários disponíveis na quinta-feira às 09h ou às 14h20. Qual prefere?" },
  Direto: { desc: "Respostas curtas, só o essencial", icone: "raio", exemplo: "Quinta: 09h ou 14h20. Qual?" },
} as const;
type Tom = keyof typeof TONS;

const MODELOS = [
  { id: "kimi-k2.5", nome: "Kimi K2.5", desc: "Padrão do SorriDente. Equilibra qualidade e rapidez. Via OpenCode Go (nuvem).", icone: "estrela", selo: "Recomendado" },
  { id: "glm-5", nome: "GLM-5", desc: "Alternativa mais econômica. Via OpenCode Go (nuvem).", icone: "cerebro" },
];

const REGRAS = [
  { id: "clinica", titulo: "Nunca dar orientação clínica", desc: "Dúvida de saúde vai direto para uma pessoa da equipe", icone: "escudo", travado: true },
  { id: "lgpd", titulo: "Aviso de privacidade (LGPD)", desc: "Mostra o aviso no primeiro contato e registra o aceite", icone: "cadeado", travado: true },
  { id: "cancelar", titulo: "Cancelar só com 4 h de antecedência", desc: "Menos que isso, passa para a recepção", icone: "relogio" },
  { id: "maximo", titulo: "No máximo 2 consultas futuras", desc: "Por paciente, pelo atendimento automático", icone: "agenda" },
  { id: "humano", titulo: "Passar para humano após 2 tentativas", desc: "Quando o assistente não entender a mensagem", icone: "pessoas" },
];

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

/** Configuração do agente: persona, modelo, regras e horário, com conversa de exemplo em um celular 3D. */
export default function ConfigAgente() {
  const router = useRouter();
  const [passo, setPasso] = useState(1);
  const [nome, setNome] = useState("Sorri");
  const [assina, setAssina] = useState("");
  const [tom, setTom] = useState<Tom>("Acolhedor");
  const [modelo, setModelo] = useState(MODELOS[0].id);
  const [chave, setChave] = useState("");
  const [regras, setRegras] = useState<Record<string, boolean>>(Object.fromEntries(REGRAS.map((r) => [r.id, true])));
  const [extras, setExtras] = useState("Sempre lembre o paciente de trazer documento com foto e a carteirinha do convênio.");
  const [dias, setDias] = useState<number[]>([0, 1, 2, 3, 4, 5]);
  const [abre, setAbre] = useState("08:00");
  const [fecha, setFecha] = useState("18:00");
  const [foraHorario, setForaHorario] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [teste, setTeste] = useState(false);

  useEffect(() => {
    api.getSettings().then((s) => {
      setAssina(s.clinic_name);
      setAbre(s.opening_hour || "08:00");
      setFecha(s.closing_hour || "18:00");
      if (s.working_days?.length) setDias(s.working_days);
    }).catch(() => undefined);
    api.getIntegration("opencode_go").then((g) => {
      const m = g.values?.model;
      if (typeof m === "string" && m) setModelo(m);
    }).catch(() => undefined);
  }, []);

  function persona(): string {
    const ativas = REGRAS.filter((r) => regras[r.id]).map((r) => `- ${r.titulo}: ${r.desc}.`);
    return [
      `Você é ${nome}, assistente virtual da ${assina || "clínica"}. Tom: ${tom.toLowerCase()} (${TONS[tom].desc.toLowerCase()}).`,
      "Regras:",
      ...ativas,
      foraHorario
        ? "- Fora do horário: continue atendendo, agende e deixe na fila da recepção o que precisar de uma pessoa."
        : "- Fora do horário: informe o horário da clínica e peça para o paciente voltar depois.",
      extras ? `Instruções extras: ${extras}` : "",
    ].filter(Boolean).join("\n");
  }

  async function concluir() {
    setSalvando(true);
    try {
      await api.updateSettings({ persona: persona(), opening_hour: abre, closing_hour: fecha, working_days: dias });
      await api.saveIntegration("opencode_go", chave ? { model: modelo, api_key: chave } : { model: modelo });
      message.success(`${nome} está ativo e pronto para atender.`);
      router.push("/gestor/agente");
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Não foi possível salvar a configuração do agente.");
    } finally {
      setSalvando(false);
    }
  }

  const oi = <Bolha minha texto="Oi! Quero marcar uma avaliação." hora="09:12" />;
  const resposta = <Bolha texto={TONS[tom].exemplo} hora="09:12" />;
  const chat = (msgs: React.ReactNode) => <MiniChat nome={nome || "Sorri"}>{msgs}</MiniChat>;

  const comum = {
    fluxo: "Configuração do agente",
    sub: "O assistente que responde os pacientes no chat e no WhatsApp",
    passos: PASSOS,
    atual: passo,
    aoSair: () => router.push("/gestor/agente"),
    aoVoltar: passo > 1 ? () => setPasso(passo - 1) : undefined,
    aoProximo: () => (passo < PASSOS.length ? setPasso(passo + 1) : void concluir()),
    carregando: salvando,
  };

  if (passo === 1) {
    return (
      <Casca {...comum} titulo="Como o assistente se apresenta" descricao="Dê um nome e escolha o jeito de falar. A conversa de exemplo ao lado muda conforme a escolha." previa={<Celular3D tela={chat(<>{oi}{resposta}</>)} />} previaRotulo="Conversa de exemplo">
        <div style={{ display: "flex", gap: 14 }}>
          <Campo rotulo="Nome do assistente" id="nome" style={{ flex: 1 }}>
            <Input id="nome" size="large" autoFocus prefix={<Icone nome="robo" tam={18} cor="var(--cor-sutil)" />} value={nome} onChange={(e) => setNome(e.target.value)} />
          </Campo>
          <Campo rotulo="Assina como" id="assina" style={{ flex: 1.4 }}>
            <Input id="assina" size="large" value={assina} onChange={(e) => setAssina(e.target.value)} placeholder="Nome da clínica" />
          </Campo>
        </div>
        <GrupoEscolha rotulo="Tom de voz">
          {(Object.keys(TONS) as Tom[]).map((t) => (
            <Escolha key={t} titulo={t} desc={TONS[t].desc} icone={TONS[t].icone} ativo={tom === t} selo={t === "Acolhedor" ? "Recomendado" : undefined} onClick={() => setTom(t)} />
          ))}
        </GrupoEscolha>
      </Casca>
    );
  }

  if (passo === 2) {
    return (
      <Casca {...comum} titulo="Qual cérebro o assistente usa" descricao="O modelo de linguagem é quem entende a mensagem do paciente e escreve a resposta." previa={<Celular3D tela={chat(<>{oi}{resposta}<AvisoChat texto="Respondeu em 1,2 s" tom="ok" icone="raio" /></>)} />} previaRotulo="Teste de velocidade">
        <GrupoEscolha>
          {MODELOS.map((m) => <Escolha key={m.id} titulo={m.nome} desc={m.desc} icone={m.icone} selo={m.selo} ativo={modelo === m.id} onClick={() => setModelo(m.id)} />)}
          <div style={{ opacity: 0.55 }} aria-disabled>
            <Escolha titulo="Modelo local (Ollama)" desc="Roda no computador da clínica. Ainda não integrado ao SorriDente." icone="servidor" ativo={false} />
          </div>
        </GrupoEscolha>
        <Campo rotulo="Chave de acesso OpenCode Go" id="chave" ajuda="Deixe em branco para manter a chave atual. Guardada no cofre de segredos.">
          <Input.Password id="chave" size="large" prefix={<Icone nome="chave" tam={18} cor="var(--cor-sutil)" />} value={chave} onChange={(e) => setChave(e.target.value)} placeholder="sk-…" style={{ fontFamily: "var(--fonte-mono)" }} />
        </Campo>
        <Aviso icone="ok" tom="ok">Na dúvida, mantenha o recomendado. Dá para trocar depois sem perder as conversas.</Aviso>
      </Casca>
    );
  }

  if (passo === 3) {
    const tela = chat(<>
      <Bolha minha texto="Meu dente está doendo muito, posso tomar ibuprofeno?" hora="10:40" />
      <Bolha texto="Entendo, Ana. Sobre remédios, quem orienta é a dentista. Já chamei a recepção para falar com você." hora="10:40" />
      <AvisoChat texto="Transferido para a recepção" icone="pessoas" />
    </>);
    return (
      <Casca {...comum} titulo="Regras que o assistente segue" descricao="As duas primeiras são exigidas por lei e pela ética da profissão. As demais você ajusta." previa={<Celular3D tela={tela} />} previaRotulo="Regra em ação">
        {REGRAS.map((r) => (
          <Opcao key={r.id} titulo={r.titulo} desc={r.desc} icone={r.icone} travado={r.travado} ligado={regras[r.id]} onChange={(v) => setRegras({ ...regras, [r.id]: v })} />
        ))}
        <Campo rotulo="Instruções extras (opcional)" id="extras">
          <Input.TextArea id="extras" rows={2} value={extras} onChange={(e) => setExtras(e.target.value)} />
        </Campo>
      </Casca>
    );
  }

  if (passo === 4) {
    const tela = chat(<>
      <Bolha minha texto="Boa noite, dá pra remarcar minha consulta de amanhã?" hora="23:10" />
      <Bolha texto={foraHorario ? `Boa noite, Ana! Anotei seu pedido. A recepção confirma o novo horário amanhã às ${abre.slice(0, 2)}h.` : `Boa noite, Ana! A clínica está fechada agora. Atendemos a partir das ${abre.slice(0, 2)}h.`} hora="23:10" />
      {foraHorario && <AvisoChat texto="Na fila da recepção" tom="alerta" icone="relogio" />}
    </>);
    return (
      <Casca {...comum} titulo="Horário de atendimento da clínica" descricao="O assistente funciona 24 horas, mas precisa saber quando há gente na recepção." previa={<Celular3D tela={tela} />} previaRotulo="Mensagem às 23h">
        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "14px 16px", border: "1px solid var(--cor-borda)", borderRadius: 14 }}>
          <div className="sd-campo-rotulo">Dias de atendimento</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} role="group" aria-label="Dias de atendimento">
            {DIAS.map((d, i) => {
              const on = dias.includes(i);
              return (
                <button key={d} type="button" aria-pressed={on} onClick={() => setDias(on ? dias.filter((x) => x !== i) : [...dias, i].sort())} style={{ font: "inherit", height: 44, minWidth: 56, padding: "0 14px", borderRadius: 999, border: 0, cursor: "pointer", fontSize: 13, fontWeight: 600, ...(on ? { background: "var(--cor-primaria)", color: "#fff" } : { background: "var(--cor-neutro-fundo)", color: "var(--cor-suave)" }) }}>
                  {d}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600, width: 90 }}>Expediente</span>
            <TimePicker size="large" format="HH:mm" minuteStep={15} value={dayjs(abre, "HH:mm")} onChange={(v) => v && setAbre(v.format("HH:mm"))} allowClear={false} aria-label="Abre às" />
            <span style={{ color: "var(--cor-suave)", fontSize: 13 }}>até</span>
            <TimePicker size="large" format="HH:mm" minuteStep={15} value={dayjs(fecha, "HH:mm")} onChange={(v) => v && setFecha(v.format("HH:mm"))} allowClear={false} aria-label="Fecha às" />
          </div>
        </div>
        <GrupoEscolha rotulo="Fora do horário, o assistente…">
          <Escolha titulo="Continua atendendo e deixa na fila" desc="Responde, agenda e avisa a recepção do que precisa de uma pessoa" icone="lua" selo="Recomendado" ativo={foraHorario} altura={64} onClick={() => setForaHorario(true)} />
          <Escolha titulo="Só avisa que a clínica está fechada" desc="Informa o horário e pede para voltar depois" icone="relogio" ativo={!foraHorario} altura={64} onClick={() => setForaHorario(false)} />
        </GrupoEscolha>
      </Casca>
    );
  }

  const tela = chat(<>
    {oi}
    {resposta}
    <Bolha minha texto="Quinta às 09h, por favor!" hora="09:13" />
    <Bolha texto="Pronto! Avaliação marcada para quinta, às 09h. Te mando um lembrete na véspera." hora="09:13" />
    <AvisoChat texto="Consulta confirmada" tom="ok" icone="check" />
  </>);
  const nRegras = REGRAS.filter((r) => regras[r.id]).length;
  return (
    <Casca {...comum} titulo="Confira e ative o assistente" descricao="Ao concluir, o assistente começa a responder no chat do site e nos canais conectados." previa={<Celular3D tela={tela} selo={<SeloFlutuante texto="Assistente ativo" />} />} previaRotulo="Atendimento completo" textoProximo="Ativar assistente">
      <div className="sd-tom-ok" style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, borderRadius: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 999, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icone nome="ok" tam={26} esp={2} /></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, color: "var(--cor-tinta)" }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{nome || "O assistente"} está pronto para atender</div>
          <div style={{ fontSize: 13, color: "var(--cor-texto)" }}>Faça uma conversa de teste antes de ligar para os pacientes, se quiser.</div>
        </div>
      </div>
      <Resumo
        irPara={setPasso}
        itens={[
          ["Nome e tom", `${nome} · ${tom}`, 1],
          ["Modelo", `${MODELOS.find((m) => m.id === modelo)?.nome ?? modelo} (OpenCode Go)`, 2],
          ["Regras", `${nRegras} ativas · 2 obrigatórias`, 3],
          ["Horário", `${dias.map((d) => DIAS[d]).join(", ")} · ${abre}–${fecha}`, 4],
          ["Fora do horário", foraHorario ? "Atende e deixa na fila da recepção" : "Só avisa que está fechada", 4],
        ]}
      />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Botao tipo="secundario" tam="G" icone="chat" onClick={() => setTeste(true)}>Fazer conversa de teste</Botao>
        <Botao tipo="suave" tam="G" icone="plugue" href="/configuracao/canais">Conectar WhatsApp e Telegram</Botao>
      </div>
      <Modal open={teste} onCancel={() => setTeste(false)} footer={null} width={480} styles={{ body: { padding: 0 } }} title="Conversa de teste" destroyOnClose>
        <ChatPanel altura={600} />
      </Modal>
    </Casca>
  );
}
