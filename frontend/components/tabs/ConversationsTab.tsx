"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Input,
  List,
  Row,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
  message as antdMessage,
} from "antd";
import { RobotOutlined, SendOutlined, UserOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";
import type { ChatMessage, Conversation } from "@/lib/types";

const CHANNEL_COLOR: Record<string, string> = {
  telegram: "#229ED9",
  whatsapp: "#25D366",
  web: "#1677ff",
};

/** Histórico de conversas de todos os canais, com resposta humana. */
export default function ConversationsTab() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    setConversations(await api.listConversations());
  }, []);

  const openConversation = useCallback(async (conversation: Conversation) => {
    const data = await api.getConversation(conversation.id);
    setSelected(data.conversation);
    setMessages(data.messages);
    await api.markConversationRead(conversation.id);
    void loadList();
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, [loadList]);

  useEffect(() => {
    void loadList();
    const source = api.openEventStream();
    source.addEventListener("message.created", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as {
        conversation: Conversation;
        message: ChatMessage;
      };
      void loadList();
      setSelected((current) => {
        if (current && current.id === data.conversation.id) {
          setMessages((prev) =>
            prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message],
          );
        }
        return current;
      });
    });
    source.onerror = () => source.close();
    const timer = setInterval(() => void loadList(), 20000);
    return () => {
      source.close();
      clearInterval(timer);
    };
  }, [loadList]);

  const visibleMessages = useMemo(
    () => messages.filter((m) => m.author !== "tool" && m.author !== "system"),
    [messages],
  );

  async function reply() {
    if (!selected || !draft.trim()) return;
    setSending(true);
    try {
      const result = await api.replyConversation(selected.id, draft.trim());
      if (!result.delivered) {
        antdMessage.warning(
          "Mensagem registrada, mas o canal está desligado — o paciente verá ao reconectar.",
        );
      }
      setDraft("");
      await openConversation(selected);
    } catch (e) {
      antdMessage.error(e instanceof Error ? e.message : "Falha ao responder.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Row gutter={16}>
      <Col xs={24} md={8}>
        <Card title="Conversas" styles={{ body: { padding: 0, maxHeight: "72vh", overflowY: "auto" } }}>
          <List
            dataSource={conversations}
            locale={{ emptyText: <Empty description="Nenhuma conversa ainda" /> }}
            renderItem={(item) => (
              <List.Item
                onClick={() => void openConversation(item)}
                style={{
                  cursor: "pointer",
                  padding: "10px 16px",
                  background: selected?.id === item.id ? "#e6f4ff" : undefined,
                }}
              >
                <List.Item.Meta
                  avatar={
                    <Badge count={item.unread_for_staff} size="small">
                      <Avatar style={{ background: CHANNEL_COLOR[item.channel] ?? "#888" }}>
                        {item.display_name.charAt(0).toUpperCase()}
                      </Avatar>
                    </Badge>
                  }
                  title={
                    <Space size={6}>
                      <Typography.Text strong>{item.display_name}</Typography.Text>
                      <Tag color={CHANNEL_COLOR[item.channel]}>{item.channel}</Tag>
                      {item.handoff && <Tag color="green">humano</Tag>}
                    </Space>
                  }
                  description={
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {new Date(item.last_message_at).toLocaleString("pt-BR")}
                    </Typography.Text>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      </Col>

      <Col xs={24} md={16}>
        <Card
          title={
            selected ? (
              <Space>
                <Typography.Text strong>{selected.display_name}</Typography.Text>
                <Tag color={CHANNEL_COLOR[selected.channel]}>{selected.channel}</Tag>
              </Space>
            ) : (
              "Selecione uma conversa"
            )
          }
          extra={
            selected && (
              <Space>
                <Tooltip title="Com o atendimento humano ligado, o agente para de responder.">
                  <Space size={6}>
                    <RobotOutlined />
                    <Switch
                      checkedChildren={<UserOutlined />}
                      unCheckedChildren={<RobotOutlined />}
                      checked={selected.handoff}
                      onChange={async (value) => {
                        const updated = await api.setHandoff(selected.id, value);
                        setSelected(updated);
                        void loadList();
                      }}
                    />
                  </Space>
                </Tooltip>
              </Space>
            )
          }
          styles={{ body: { padding: 0, display: "flex", flexDirection: "column", height: "72vh" } }}
        >
          <div ref={scrollRef} className="sd-chat-scroll" style={{ flex: 1, background: "#f7f9fc" }}>
            {!selected ? (
              <Empty style={{ margin: "auto" }} description="Escolha uma conversa à esquerda" />
            ) : (
              visibleMessages.map((m) => (
                <div
                  key={m.id}
                  className={`sd-bubble ${
                    m.author === "user"
                      ? "sd-bubble-bot"
                      : m.author === "human_agent"
                        ? "sd-bubble-staff"
                        : "sd-bubble-user"
                  }`}
                  style={m.author === "user" ? { alignSelf: "flex-start" } : { alignSelf: "flex-end" }}
                >
                  <Typography.Text
                    style={{ fontSize: 11, display: "block", opacity: 0.7, color: "inherit" }}
                  >
                    {m.author === "user"
                      ? selected.display_name
                      : m.author === "human_agent"
                        ? "Equipe"
                        : "SorriDente"}{" "}
                    · {new Date(m.created_at).toLocaleTimeString("pt-BR")}
                  </Typography.Text>
                  {m.content}
                </div>
              ))
            )}
          </div>
          {selected && (
            <div style={{ padding: 12, borderTop: "1px solid #eef1f6", background: "#fff" }}>
              <Space.Compact style={{ width: "100%" }}>
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={
                    selected.handoff
                      ? "Responder como equipe da clínica…"
                      : "Ligue o atendimento humano para assumir a conversa"
                  }
                  onPressEnter={() => void reply()}
                />
                <Button type="primary" icon={<SendOutlined />} loading={sending} onClick={() => void reply()}>
                  Responder
                </Button>
              </Space.Compact>
            </div>
          )}
        </Card>
      </Col>
    </Row>
  );
}
