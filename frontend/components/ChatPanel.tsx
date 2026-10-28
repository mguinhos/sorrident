"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { Alert, Input, Spin } from "antd";
import { Icone } from "@/components/ui";
import { api } from "@/lib/api";
import { hora } from "@/lib/formato";
import type { ChatMessage } from "@/lib/types";

const SESSION_KEY = "sorridente.chat.session";

function sessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = window.localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = Math.random().toString(36).slice(2, 12);
    window.localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

const ATALHOS = [
  { texto: "Ver horários", icone: "agenda", mensagem: "Quais horários estão disponíveis esta semana?", destaque: true },
  { texto: "Dúvidas frequentes", icone: "livro", mensagem: "Quais são as dúvidas mais frequentes?", destaque: true },
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

/** Chat do paciente com o assistente: cabeçalho com status, bolhas com direção, atalhos e envio. */
export default function ChatPanel({ acaoTopo, altura = "100%" }: { acaoTopo?: ReactNode; altura?: string | number }) {
  const [mensagens, setMensagens] = useState<ChatMessage[]>([]);
  const [rascunho, setRascunho] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [humano, setHumano] = useState(false);
  const [erro, setErro] = useState("");
  const rolagem = useRef<HTMLDivElement>(null);

  const rolarAoFim = useCallback(() => {
    requestAnimationFrame(() => {
      const el = rolagem.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  const carregar = useCallback(async () => {
    try {
      const dados = await api.chatHistory(sessionId());
      setMensagens(dados.messages ?? []);
      setHumano(dados.handoff);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível carregar a conversa.");
    } finally {
      setCarregando(false);
      rolarAoFim();
    }
  }, [rolarAoFim]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Com atendimento humano, busca as respostas periodicamente.
  useEffect(() => {
    if (!humano) return;
    const t = setInterval(() => void carregar(), 6000);
    return () => clearInterval(t);
  }, [humano, carregar]);

  async function enviar(texto = rascunho) {
    const t = texto.trim();
    if (!t || enviando) return;
    setRascunho("");
    setErro("");
    setMensagens((prev) => [
      ...prev,
      { id: `tmp-${Date.now()}`, conversation_id: "", author: "user", content: t, tool_name: "", tool_payload: {}, created_at: new Date().toISOString() },
    ]);
    rolarAoFim();
    setEnviando(true);
    try {
      const r = await api.sendChat(sessionId(), t);
      setHumano(r.handoff);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao enviar a mensagem.");
    } finally {
      setEnviando(false);
      rolarAoFim();
    }
  }

  const visiveis = mensagens.filter((m) => m.author === "user" || m.author === "assistant" || m.author === "human_agent");

  return (
    <section className="sd-chat" style={{ height: altura }} aria-label="Conversa com o SorriDente">
      <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 16px 14px", background: "#fff", borderBottom: "1px solid var(--cor-borda)" }}>
        <Image src="/logo.svg" alt="" width={40} height={40} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>SorriDente</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--cor-suave)" }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: "#16a34a" }} />
            {humano ? "Atendimento com a equipe da clínica" : "Assistente virtual · online agora"}
          </div>
        </div>
        {acaoTopo}
      </header>

      <div ref={rolagem} className="sd-chat-rolagem" aria-live="polite">
        <div style={{ alignSelf: "center", fontSize: 12, fontWeight: 600, color: "var(--cor-suave)", background: "#e9eef5", padding: "4px 10px", borderRadius: 999 }}>Hoje</div>
        {carregando ? (
          <Spin style={{ margin: "auto" }} />
        ) : (
          <>
            {visiveis.length === 0 && (
              <>
                <DoBot avatar={false}>Olá! Sou o SorriDente. Como posso ajudar hoje?</DoBot>
                <DoBot>Posso agendar consultas, tirar dúvidas e chamar a recepção quando precisar.</DoBot>
              </>
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
                  {m.content}
                </DoBot>
              ),
            )}
            {enviando && <DoBot><span style={{ color: "var(--cor-suave)" }}>digitando…</span></DoBot>}
          </>
        )}
      </div>

      {erro && <Alert type="error" message={erro} banner />}

      <footer style={{ display: "flex", flexDirection: "column", gap: 12, padding: "12px 16px 20px", background: "#fff", borderTop: "1px solid var(--cor-borda)" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {ATALHOS.map((a) => (
            <button
              key={a.texto}
              type="button"
              onClick={() => void enviar(a.mensagem)}
              disabled={enviando}
              style={{ font: "inherit", height: 36, padding: "0 14px", borderRadius: 999, border: "1px solid #b8d4f1", background: "#fff", color: a.destaque ? "var(--cor-primaria)" : "var(--cor-tinta)", display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", cursor: "pointer" }}
            >
              <Icone nome={a.icone} tam={15} />
              {a.texto}
            </button>
          ))}
        </div>
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
            placeholder="Escreva uma mensagem…"
            aria-label="Mensagem"
            style={{ flex: 1, height: 48, borderRadius: 999, background: "var(--cor-fundo)", paddingInline: 18, fontSize: 15 }}
          />
          <button
            type="submit"
            aria-label="Enviar"
            disabled={enviando || !rascunho.trim()}
            style={{ width: 48, height: 48, borderRadius: 999, border: 0, background: "var(--cor-primaria)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: enviando || !rascunho.trim() ? 0.6 : 1 }}
          >
            <Icone nome="enviar" tam={20} cor="#fff" />
          </button>
        </form>
      </footer>
    </section>
  );
}
