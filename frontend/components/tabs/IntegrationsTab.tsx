"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  Row,
  Space,
  Switch,
  Tag,
  Typography,
  message as antdMessage,
} from "antd";
import { ApiOutlined, MessageOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";

interface CredentialField {
  key: string;
  label: string;
  secret: boolean;
  required: boolean;
  placeholder: string;
  help_text: string;
  default: unknown;
}

interface IntegrationStatus {
  key: string;
  kind: string;
  name: string;
  description: string;
  configured: boolean;
  enabled: boolean;
  running: boolean;
  detail: string;
  last_error: string;
}

interface IntegrationView {
  key: string;
  kind: string;
  name: string;
  description: string;
  fields: CredentialField[];
  status: IntegrationStatus;
  values: Record<string, unknown>;
  active_inference: boolean;
}

const KIND_LABEL: Record<string, string> = {
  inference_provider: "Provedor de inferência",
  messaging_channel: "Canal de mensageria",
  calendar: "Agenda externa",
  payment: "Pagamentos",
};

const KIND_ICON: Record<string, React.ReactNode> = {
  inference_provider: <ThunderboltOutlined />,
  messaging_channel: <MessageOutlined />,
};

/**
 * Formulário dinâmico: os campos vêm do backend, então uma integração nova
 * (Ollama, OpenRouter, Instagram…) aparece aqui sem mudar o frontend.
 */
function IntegrationCard({ item, onChanged }: { item: IntegrationView; onChanged: () => void }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    form.setFieldsValue(item.values);
  }, [item, form]);

  async function save() {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const cleaned = Object.fromEntries(
        Object.entries(values).filter(([key, value]) => {
          const field = item.fields.find((f) => f.key === key);
          // Segredos mascarados não são reenviados: o backend mantém o valor salvo.
          if (field?.secret && typeof value === "string" && value.includes("…")) return false;
          return value !== undefined;
        }),
      );
      await api.saveIntegration(item.key, cleaned, item.kind === "messaging_channel" ? true : undefined);
      antdMessage.success(`${item.name} salvo em credentials.json.`);
      onChanged();
    } catch (e) {
      antdMessage.error(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    setTesting(true);
    try {
      const result = (await api.testIntegration(item.key)) as { ok: boolean; erro?: string };
      if (result.ok) antdMessage.success(`${item.name}: conexão bem-sucedida.`);
      else antdMessage.error(`${item.name}: ${result.erro ?? "falhou"}`);
      onChanged();
    } finally {
      setTesting(false);
    }
  }

  return (
    <Card
      title={
        <Space>
          {KIND_ICON[item.kind] ?? <ApiOutlined />}
          <Typography.Text strong>{item.name}</Typography.Text>
          <Tag>{KIND_LABEL[item.kind] ?? item.kind}</Tag>
          {item.active_inference && <Tag color="purple">ativo</Tag>}
        </Space>
      }
      extra={
        <Badge
          status={item.status.running ? "success" : item.status.configured ? "warning" : "default"}
          text={item.status.running ? "em execução" : item.status.configured ? "configurado" : "não configurado"}
        />
      }
    >
      <Typography.Paragraph type="secondary">{item.description}</Typography.Paragraph>
      {item.status.last_error && (
        <Alert type="error" showIcon message={item.status.last_error} style={{ marginBottom: 12 }} />
      )}

      <Form form={form} layout="vertical">
        {item.fields.map((field) =>
          typeof field.default === "boolean" ? (
            <Form.Item key={field.key} name={field.key} label={field.label} valuePropName="checked">
              <Switch />
            </Form.Item>
          ) : (
            <Form.Item
              key={field.key}
              name={field.key}
              label={field.label}
              extra={field.help_text}
              rules={field.required && !item.status.configured ? [{ required: true }] : []}
            >
              {field.secret ? (
                <Input.Password placeholder={field.placeholder} autoComplete="off" />
              ) : (
                <Input placeholder={field.placeholder} />
              )}
            </Form.Item>
          ),
        )}
      </Form>

      <Space wrap>
        <Button type="primary" loading={saving} onClick={() => void save()}>
          Salvar credenciais
        </Button>
        <Button loading={testing} onClick={() => void test()}>
          Testar conexão
        </Button>
        {item.kind === "messaging_channel" &&
          (item.status.running ? (
            <Button
              danger
              onClick={async () => {
                await api.disableIntegration(item.key);
                onChanged();
              }}
            >
              Parar
            </Button>
          ) : (
            <Button
              onClick={async () => {
                try {
                  await api.enableIntegration(item.key);
                  antdMessage.success(`${item.name} iniciado.`);
                } catch (e) {
                  antdMessage.error(e instanceof Error ? e.message : "Falha ao iniciar.");
                }
                onChanged();
              }}
            >
              Iniciar
            </Button>
          ))}
        {item.kind === "inference_provider" && !item.active_inference && (
          <Button
            onClick={async () => {
              await api.activateInference(item.key);
              antdMessage.success(`${item.name} passou a ser o provedor do agente.`);
              onChanged();
            }}
          >
            Usar este provedor
          </Button>
        )}
      </Space>

      {item.status.detail && (
        <Descriptions size="small" style={{ marginTop: 16 }} column={1}>
          <Descriptions.Item label="Detalhe">{item.status.detail}</Descriptions.Item>
        </Descriptions>
      )}
    </Card>
  );
}

/** Integrações do sistema, agrupadas por tipo. */
export default function IntegrationsTab() {
  const [items, setItems] = useState<IntegrationView[]>([]);

  const load = useCallback(async () => {
    const data = (await api.integrations()) as { integrations: IntegrationView[] };
    setItems(data.integrations);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const inference = items.filter((i) => i.kind === "inference_provider");
  const messaging = items.filter((i) => i.kind === "messaging_channel");

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        message="As credenciais são gravadas em credentials.json no servidor."
        description="O token do bot do Telegram e a chave do provedor de inferência nunca são devolvidos em texto puro: campos mascarados mantêm o valor salvo se você não digitar um novo."
      />

      <div>
        <Typography.Title level={5}>Provedores de inferência</Typography.Title>
        <Row gutter={[16, 16]}>
          {inference.map((item) => (
            <Col xs={24} lg={12} key={item.key}>
              <IntegrationCard item={item} onChanged={load} />
            </Col>
          ))}
        </Row>
      </div>

      <div>
        <Typography.Title level={5}>Canais de mensageria</Typography.Title>
        <Row gutter={[16, 16]}>
          {messaging.map((item) => (
            <Col xs={24} lg={12} key={item.key}>
              <IntegrationCard item={item} onChanged={load} />
            </Col>
          ))}
        </Row>
      </div>
    </Space>
  );
}
