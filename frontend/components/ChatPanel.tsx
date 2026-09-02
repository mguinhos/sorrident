"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Avatar, Button, Card, Input, Space, Spin, Tag, Typography } from "antd";
import { SendOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";
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

/** Janela de conversa do paciente com o agente SorriDente. */
export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [handoff, setHandoff] = useState(false);
  const [erro, setErro] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await api.chatHistory(sessionId());
      setMessages(data.messages);
      setHandoff(data.handoff);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível carregar a conversa.");
    } finally {
      setLoading(false);
      scrollToEnd();
    }
  }, [scrollToEnd]);

  useEffect(() => {
    void load();
  }, [load]);

  // Enquanto o atendimento estiver com um humano, busca respostas periodicamente.
  useEffect(() => {
    if (!handoff) return;
    const timer = setInterval(() => void load(), 6000);
    return () => clearInterval(timer);
  }, [handoff, load]);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft("");
    setErro("");
    const optimistic: ChatMessage = {
      id: `tmp-${Date.now()}`,
      conversation_id: "",
      author: "user",
      content: text,
      tool_name: "",
      tool_payload: {},
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    scrollToEnd();
    setSending(true);
    try {
      const answer = await api.sendChat(sessionId(), text);
      setHandoff(answer.handoff);
      await load();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao enviar a mensagem.");
    } finally {
      setSending(false);
      scrollToEnd();
    }
  }

  return (
    <Card
      title={
        <Space>
          <Avatar style={{ background: "#1677ff" }}>🦷</Avatar>
          <Space direction="vertical" size={0}>
            <Typography.Text strong>SorriDente</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {handoff ? "Atendimento com a equipe da clínica" : "Assistente virtual · online"}
            </Typography.Text>
          </Space>
          {handoff && <Tag color="green">humano</Tag>}
        </Space>
      }
      styles={{ body: { padding: 0, display: "flex", flexDirection: "column", height: "70vh" } }}
    >
      <div ref={scrollRef} className="sd-chat-scroll" style={{ flex: 1, background: "#f7f9fc" }}>
        {loading ? (
          <Spin style={{ margin: "auto" }} />
        ) : messages.length === 0 ? (
          <div className="sd-bubble sd-bubble-bot">
            Olá! Eu sou o SorriDente 🦷 Posso agendar, remarcar ou cancelar sua consulta e tirar
            dúvidas sobre o tratamento. Como posso ajudar?
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`sd-bubble ${
                m.author === "user"
                  ? "sd-bubble-user"
                  : m.author === "human_agent"
                    ? "sd-bubble-staff"
                    : "sd-bubble-bot"
              }`}
            >
              {m.author === "human_agent" && (
                <Typography.Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                  Equipe SorriDente
                </Typography.Text>
              )}
              {m.content}
            </div>
          ))
        )}
        {sending && (
          <div className="sd-bubble sd-bubble-bot">
            <Spin size="small" /> digitando…
          </div>
        )}
      </div>

      {erro && <Alert type="error" message={erro} banner />}

      <div style={{ padding: 12, borderTop: "1px solid #eef1f6", background: "#fff" }}>
        <Space.Compact style={{ width: "100%" }}>
          <Input.TextArea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escreva sua mensagem…"
            autoSize={{ minRows: 1, maxRows: 4 }}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <Button type="primary" icon={<SendOutlined />} loading={sending} onClick={() => void send()}>
            Enviar
          </Button>
        </Space.Compact>
      </div>
    </Card>
  );
}
