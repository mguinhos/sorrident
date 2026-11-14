"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Alert, Input, Spin } from "antd";
import { Icone } from "@/components/ui";
import Markdown from "./Markdown";
import { useAuth } from "@/app/providers";
import { api } from "@/lib/api";
import { hora } from "@/lib/formato";
import type { ChatMessage } from "@/lib/types";

/** Visitantes anônimos não salvam conversa: cada carregamento gera uma sessão
 *  nova, então o chat sempre começa do zero. Clientes logados usam o id do
 *  usuário no backend, então o histórico deles continua sendo restaurado. */
function gerarSessao(): string {
  if (typeof window === "undefined") return "ssr";
  return Math.random().toString(36).slice(2, 12);
}

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

const ATALHOS = [
  { texto: "Marcar consulta", icone: "dente", mensagem: "Quero marcar uma consulta", destaque: true },
  { texto: "Ver horários", icone: "agenda", mensagem: "Quais horários estão disponíveis esta semana?", destaque: true },
  { texto: "Dúvidas frequentes", icone: "livro", mensagem: "Quais são as dúvidas mais frequentes?", destaque: true },
  { texto: "Cancelar consulta", icone: "relogio", mensagem: "Quero cancelar minha consulta", destaque: false },

  { texto: "Falar com atendente", icone: "pessoas", mensagem: "Quero falar com um atendente.", destaque: false },
];

function DoBot({ children, avatar = true, equipe = false }: { children: ReactNode; avatar?: boolean; equipe?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", maxWidth: 360 }}>
      {avatar ? <Image src="/logo.svg" alt="" width={28} height={28} style={{ flexShrink: 0 }} /> : <span style={{ width: 28, flexShrink: 0 }} />}
      <div className="sd-bolha sd-bolha-bot" style={equipe ? { background: "var(--cor-sucesso-fundo)", borderColor: "#b7e2c6" } : undefined}>
        {equipe && <div style={{ fontSize: 11, fontWeight: 700, color: "var(--cor-sucesso)", marginBottom: 2 }}>Equipe da clínica</div>}
        {children}
      </div>
    </div>
  );
}

/** Chat do paciente com o assistente: cabeçalho com status, bolhas com direção, atalhos e envio.
 *  `lado` é o painel lateral opcional (ex.: Meus agendamentos) exibido ao lado do chat. */

function ofertaDeHorarios(texto: string): boolean {
  const t = texto.toLowerCase();
  return /disponív|horário|agenda livre|livre|esta semana|qual dia|período|opções|escolha/.test(t);
}

function opcoesClicaveis(texto: string): string[] {
  const set = new Set<string>();
  // FAQ: cada pergunta da lista vira botão
  if (/dúvidas mais frequentes|duvidas mais frequentes/i.test(texto)) {
    for (const m of texto.matchAll(/^\s*[•\-*]\s*(.+)$/gm)) {
      const q = m[1].trim();
      if (q) set.add(q);
    }
  }
  // Dias (dd/mm) em mensagens de disponibilidade de dias
  if (/dias com horários livres/i.test(texto)) {
    for (const m of texto.matchAll(/\b\d{2}\/\d{2}\b/g)) set.add(m[0]);
  }
  // Horários livres nos próximos dias: datas e horários clicáveis
  if (/horários livres nos próximos dias|horarios livres nos proximos dias/i.test(texto)) {
    for (const m of texto.matchAll(/\b\d{2}\/\d{2}\b/g)) set.add(m[0]);
    const hs = [...texto.matchAll(/\d{2}:\d{2}/g)].map((m) => m[0]);
    const hset = new Set(hs);
    if (hset.size >= 1) for (const h of hset) set.add(h);
  }
  // Horários em mensagens de disponibilidade de horários
  if (/horários livres em|horarios livres em/i.test(texto)) {
    const hs = [...texto.matchAll(/\d{2}:\d{2}/g)].map((m) => m[0]);
    const hset = new Set(hs);
    if (hset.size >= 1) for (const h of hset) set.add(h);
  }
  // Datas completas, horários e profissionais (escolha real: >=2 do mesmo tipo)
  const datas = new Set<string>();
  const horarios = new Set<string>();
  const profissionais = new Set<string>();
  for (const m of texto.matchAll(/\b\d{2}\/\d{2}\/\d{4}\b/g)) datas.add(m[0]);
  for (const m of texto.matchAll(/\d{2}:\d{2}/g)) horarios.add(m[0]);
  for (const m of texto.matchAll(/Dra?\.?\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ]*(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ]*)?/g)) {
    profissionais.add(m[0].trim());
  }
  if (datas.size >= 2) for (const d of datas) set.add(d);
  if (horarios.size >= 2 && !/dias com horários livres|horários livres|horarios livres/i.test(texto)) for (const h of horarios) set.add(h);
  // Marcador oculto de profissionais (fluxo pré-programado)
  const mProf = texto.match(/\[\[profissionais:\s*(.+?)\]\]/);
  if (mProf && !/marquei com|deseja confirmar/i.test(texto)) {
    for (const nome of mProf[1].split(",")) {
      const n = nome.trim();
      if (n) set.add(n);
    }
  }
  if (profissionais.size >= 2 && !/marquei com|deseja confirmar/i.test(texto)) for (const p of profissionais) set.add(p);
  // Escolha de período: botões clicáveis
  if (/qual período/i.test(texto) || /periodo você prefere/i.test(texto)) {
    set.add("manhã");
    set.add("tarde");
  }
  return [...set];
}

function textoSemListaOpcoes(texto: string): string {
  const isDisp = /dias com horários livres|horários livres|horarios livres/i.test(texto);
  return texto
    .split("\n")
    .filter((linha) => !/^\s*[-*•]?\s*\d{2}\/\d{2}\/\d{4}\s*$/.test(linha))
    .filter((linha) => !/^\s*[-*•]?\s*\d{2}:\d{2}\s*$/.test(linha))
    .filter((linha) => !(isDisp && /^\s*[•\-*]?\s*\d{2}\/\d{2}\b/.test(linha)))
    .filter((linha) => !/^\s*Horários livres em/i.test(linha))
    .filter((linha) => !/^\s*\[\[profissionais:/.test(linha))
    .filter((linha) => !( /horários livres|horarios livres/i.test(texto) && /^\s*[•\-*]/.test(linha) ))
    .filter((linha) => !( /^\s*[•\-*]\s*.+$/.test(linha) && /dúvidas mais frequentes|duvidas mais frequentes/i.test(texto) ))
    .join("\n");
}

export default function ChatPanel({
  acaoTopo,
  altura = "100%",
  lado,
}: {
  acaoTopo?: ReactNode;
  altura?: string | number;
  lado?: ReactNode;
}) {
  const [mensagens, setMensagens] = useState<ChatMessage[]>([]);
  const [rascunho, setRascunho] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [humano, setHumano] = useState(false);
  const [erro, setErro] = useState("");
  const [avisoLogin, setAvisoLogin] = useState(false);
  const [maisOpcoes, setMaisOpcoes] = useState(false);
  // Visitante: o campo de texto só é aceito para responder um fluxo iniciado
  // pelos botões pré-programados.
  const [fluxoAtivo, setFluxoAtivo] = useState(false);
  const [sessao] = useState(gerarSessao);
  const { user } = useAuth();
  const rolagem = useRef<HTMLDivElement>(null);

  const boasVindas = `${saudacao()}! Como posso lhe ajudar? Posso tirar dúvidas, marcar consultas e ver seus exames.`;

  const rolarAoFim = useCallback(() => {
    requestAnimationFrame(() => {
      const el = rolagem.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  const carregar = useCallback(async () => {
    if (!user) return;
    try {
      const dados = await api.chatHistory(sessao);
      setMensagens(dados.messages ?? []);
      setHumano(dados.handoff);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível carregar a conversa.");
    } finally {
      setCarregando(false);
      rolarAoFim();
    }
  }, [sessao, rolarAoFim, user]);

  useEffect(() => {
    if (!user) {
      setCarregando(false);
      return;
    }
    void carregar();
  }, [carregar, user]);

  // Com atendimento humano, busca as respostas periodicamente.
  useEffect(() => {
    if (!humano) return;
    const t = setInterval(() => void carregar(), 6000);
    return () => clearInterval(t);
  }, [humano, carregar]);

  async function enviar(texto = rascunho, preProgramado = false) {
    const t = texto.trim();
    if (!t || enviando) return;
    // Visitante digitando fora de um fluxo pré-programado: orienta a entrar
    // para usar o chatbot completo.
    if (!user && !preProgramado && !fluxoAtivo) {
      setRascunho("");
      setAvisoLogin(true);
      return;
    }
    // Botão pré-programado no visitante abre o fluxo de perguntas/respostas.
    if (!user && preProgramado) setFluxoAtivo(true);
    setRascunho("");
    setErro("");
    setAvisoLogin(false);
    setMensagens((prev) => [
      ...prev,
      { id: `tmp-${Date.now()}`, conversation_id: "", author: "user", content: t, tool_name: "", tool_payload: {}, created_at: new Date().toISOString() },
    ]);
    rolarAoFim();
    setEnviando(true);
    try {
      const r = await api.sendChat(sessao, t);
      setHumano(r.handoff);
      if (user) {
        await carregar();
      } else {
        if (r.reply) {
          setMensagens((prev) => [
            ...prev,
            { id: `tmp-r-${Date.now()}`, conversation_id: "", author: "assistant", content: r.reply, tool_name: "", tool_payload: {}, created_at: new Date().toISOString() },
          ]);
        }
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao enviar a mensagem.");
    } finally {
      setEnviando(false);
      if (!user) setFluxoAtivo(true);
      rolarAoFim();
    }
  }

  const visiveis = mensagens.filter((m) => m.author === "user" || m.author === "assistant" || m.author === "human_agent");

  const chat = (
    <section className="sd-chat" style={{ height: altura }} aria-label="Conversa com o SorriDente">
      <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 16px 14px", background: "#fff", borderBottom: "1px solid var(--cor-borda)" }}>
        <Image src="/logo.svg" alt="" width={40} height={40} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <div className="sd-chat-titulo" style={{ fontSize: 17, fontWeight: 700 }}>SorriDente</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--cor-suave)" }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: "#16a34a" }} />
            {humano ? "Atendimento com a equipe da clínica" : user ? "Assistente virtual · online agora" : "Chat rápido"}
          </div>
        </div>
        {acaoTopo}
      </header>

      <div ref={rolagem} className="sd-chat-rolagem" aria-live="polite">
        <div style={{ alignSelf: "center", fontSize: 12, fontWeight: 600, color: "#fff", background: "var(--cor-primaria)", padding: "4px 10px", borderRadius: 999 }}>Hoje</div>
        {carregando ? (
          <Spin style={{ margin: "auto" }} />
        ) : (
          <>
            {visiveis.length === 0 && (
              <DoBot>
                {boasVindas}
                {!user && (
                  <>
                    {" "}
                    <Link href="/login" style={{ color: "var(--cor-primaria)", fontWeight: 700 }}>
                      Faça o Login
                    </Link>{" "}
                    para desbloquear o Agente e tirar dúvidas personalizadas.
                  </>
                )}
              </DoBot>
            )}
            {visiveis.map((m, i) =>
              m.author === "user" ? (
                <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, alignSelf: "flex-end" }}>
                  <div className="sd-bolha sd-bolha-eu">{m.content}</div>
                  <div style={{ fontSize: 11, color: "var(--cor-sutil)", display: "flex", alignItems: "center", gap: 3 }}>
                    {hora(m.created_at)}
                    <Icone nome="check" tam={12} cor="var(--cor-primaria)" esp={2.4} />
                  </div>
                </div>
              ) : (
                <DoBot key={m.id} avatar={visiveis[i + 1]?.author === "user" || i === visiveis.length - 1} equipe={m.author === "human_agent"}>
                  <Markdown texto={textoSemListaOpcoes(m.content)} />
                  {opcoesClicaveis(m.content).length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, alignItems: "flex-start" }}>
                      {opcoesClicaveis(m.content).map((op) => (
                        <button
                          key={op}
                          type="button"
                          onClick={() => setRascunho((prev) => (prev.trim() ? `${prev.trim()} ${op}` : op))}
                          style={{ font: "inherit", height: 30, padding: "0 12px", borderRadius: 999, border: "1px solid #b8d4f1", background: "#f0f6ff", color: "var(--cor-primaria)", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
                        >
                          {op}
                        </button>
                      ))}
                    </div>
                  )}
                </DoBot>
              ),
            )}
            {enviando && <DoBot><span style={{ color: "var(--cor-suave)" }}>digitando…</span></DoBot>}
          </>
        )}
      </div>

      {erro && <Alert type="error" message={erro} banner />}

      {avisoLogin && (
        <Alert
          type="warning"
          banner
          showIcon
          closable
          onClose={() => setAvisoLogin(false)}
          message={
            <span>
              Essa pergunta foge das opções acima. <Link href="/login" style={{ fontWeight: 700 }}>Faça login</Link> para
              acessar as funcionalidades completas do chatbot.
            </span>
          }
        />
      )}

      <footer style={{ display: "flex", flexDirection: "column", gap: 12, padding: "12px 16px 20px", background: "#fff", borderTop: "1px solid var(--cor-borda)" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {ATALHOS.slice(0, 3).map((a) => (
            <button
              key={a.texto}
              type="button"
              onClick={() => void enviar(a.mensagem, true)}
              disabled={enviando}
              style={{ font: "inherit", height: 36, padding: "0 14px", borderRadius: 999, border: "1px solid #b8d4f1", background: "#fff", color: a.destaque ? "var(--cor-primaria)" : "var(--cor-tinta)", display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", cursor: "pointer" }}
            >
              <Icone nome={a.icone} tam={15} />
              {a.texto}
            </button>
          ))}
          <button
            type="button"
            aria-expanded={maisOpcoes}
            aria-label={maisOpcoes ? "Recolher opções" : "Mais opções"}
            onClick={() => setMaisOpcoes((v) => !v)}
            style={{ font: "inherit", height: 36, padding: user ? "0 14px" : "0 12px", borderRadius: 999, border: "1px dashed #b8d4f1", background: "#fff", color: "var(--cor-suave)", display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", cursor: "pointer" }}
          >
            <Icone nome={maisOpcoes ? "fechar" : "mais"} tam={15} />
          </button>
        </div>
        {maisOpcoes && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: 10, borderRadius: 12, border: "1px solid var(--cor-borda)", background: "var(--cor-fundo)" }}>
            {ATALHOS.slice(3).map((a) => (
              <button
                key={a.texto}
                type="button"
                onClick={() => void enviar(a.mensagem, true)}
                disabled={enviando}
                style={{ font: "inherit", height: 34, padding: "0 14px", borderRadius: 999, border: "1px solid #b8d4f1", background: "#fff", color: a.destaque ? "var(--cor-primaria)" : "var(--cor-tinta)", display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", cursor: "pointer" }}
              >
                <Icone nome={a.icone} tam={15} />
                {a.texto}
              </button>
            ))}
          </div>
        )}
        <form
          style={{ display: "flex", gap: 8, alignItems: "center" }}
          onSubmit={(e) => {
            e.preventDefault();
            void enviar();
          }}
        >
          <Input
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            aria-label="Mensagem"
            placeholder={!user && !fluxoAtivo ? "Selecione um das opções acima para começar..." : "Escreva uma mensagem…"}
            disabled={!user && !fluxoAtivo}
            style={{ flex: 1, height: 48, borderRadius: 999, background: "var(--cor-fundo)", paddingInline: 18, fontSize: 15 }}
          />
          <button
            type="submit"
            aria-label="Enviar"
            disabled={enviando || !rascunho.trim() || (!user && !fluxoAtivo)}
            style={{ width: 48, height: 48, borderRadius: 999, border: 0, background: "var(--cor-primaria)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: enviando || !rascunho.trim() || (!user && !fluxoAtivo) ? 0.6 : 1 }}
          >
            <Icone nome="enviar" tam={20} cor="#fff" />
          </button>
        </form>
      </footer>
    </section>
  );

  if (!lado) return chat;
  return (
    <div className="sd-chat-com-lado" style={{ height: altura }}>
      {chat}
      <div className="sd-chat-lado">{lado}</div>
    </div>
  );
}
