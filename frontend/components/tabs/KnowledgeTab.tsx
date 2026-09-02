"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Typography,
  message as antdMessage,
} from "antd";
import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";
import type { KnowledgeDocument, KnowledgeHit, KnowledgeOverview } from "@/lib/types";

const SOURCE_COLOR: Record<string, string> = {
  manual: "blue",
  faq: "green",
  procedimento: "purple",
  clinica: "gold",
};

/** Base de conhecimento consultada pelo agente por RAG. */
export default function KnowledgeTab() {
  const [data, setData] = useState<KnowledgeOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeDocument | null>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<KnowledgeHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api.knowledge());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    const values = await form.validateFields();
    try {
      if (editing) await api.updateDocument(editing.id, values);
      else await api.createDocument({ ...values, tags: values.tags ?? [] });
      antdMessage.success("Documento salvo e reindexado.");
      setOpen(false);
      void load();
    } catch (e) {
      antdMessage.error(e instanceof Error ? e.message : "Falha ao salvar.");
    }
  }

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const result = await api.searchKnowledge(query, 5);
      setHits(result.results);
    } finally {
      setSearching(false);
    }
  }

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        message="É daqui que o agente tira as respostas."
        description="Antes de responder qualquer pergunta sobre a clínica, o SorriDente busca nesta base (recuperação híbrida: TF-IDF + BM25) e responde apenas com o que encontrar. Dúvidas frequentes, procedimentos e dados da clínica entram no índice automaticamente."
      />

      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <Card loading={loading}>
            <Statistic title="Documentos indexados" value={data?.indexed_documents ?? 0} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={loading}>
            <Statistic title="Trechos no índice" value={data?.indexed_chunks ?? 0} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={loading}>
            <Statistic title="Termos no vocabulário" value={data?.vocabulary ?? 0} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Button
              block
              icon={<ReloadOutlined />}
              onClick={async () => {
                const result = await api.reindexKnowledge();
                antdMessage.success(`Índice reconstruído: ${result.indexed_chunks} trechos.`);
                void load();
              }}
            >
              Reindexar agora
            </Button>
          </Card>
        </Col>
      </Row>

      <Card title="Testar a recuperação">
        <Space.Compact style={{ width: "100%", maxWidth: 640 }}>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex.: posso comer castanha com aparelho?"
            onPressEnter={() => void search()}
          />
          <Button type="primary" icon={<SearchOutlined />} loading={searching} onClick={() => void search()}>
            Buscar
          </Button>
        </Space.Compact>

        {hits !== null && (
          <List
            style={{ marginTop: 16 }}
            dataSource={hits}
            locale={{ emptyText: <Empty description="Nada encontrado para esta pergunta" /> }}
            renderItem={(hit) => (
              <List.Item>
                <List.Item.Meta
                  title={
                    <Space>
                      <Typography.Text strong>{hit.title}</Typography.Text>
                      <Tag color={SOURCE_COLOR[hit.source]}>{hit.source}</Tag>
                      <Tag>relevância {hit.score.toFixed(3)}</Tag>
                    </Space>
                  }
                  description={<Typography.Paragraph style={{ marginBottom: 0 }}>{hit.content}</Typography.Paragraph>}
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      <Card
        title="Documentos da clínica"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(null);
              form.resetFields();
              setOpen(true);
            }}
          >
            Novo documento
          </Button>
        }
      >
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data?.documents ?? []}
          expandable={{
            expandedRowRender: (row) => (
              <Typography.Paragraph style={{ whiteSpace: "pre-wrap" }}>{row.content}</Typography.Paragraph>
            ),
          }}
          columns={[
            { title: "Título", dataIndex: "title" },
            {
              title: "Tags",
              dataIndex: "tags",
              render: (tags: string[]) => (
                <Space size={4} wrap>
                  {tags.map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                </Space>
              ),
            },
            {
              title: "Ativo",
              dataIndex: "active",
              render: (value: boolean, row: KnowledgeDocument) => (
                <Switch
                  size="small"
                  checked={value}
                  onChange={async (checked) => {
                    await api.updateDocument(row.id, { active: checked });
                    void load();
                  }}
                />
              ),
            },
            {
              title: "",
              render: (_: unknown, row: KnowledgeDocument) => (
                <Space>
                  <Button
                    size="small"
                    onClick={() => {
                      setEditing(row);
                      form.setFieldsValue(row);
                      setOpen(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Popconfirm
                    title="Remover documento?"
                    onConfirm={async () => {
                      await api.deleteDocument(row.id);
                      void load();
                    }}
                  >
                    <Button size="small" danger>
                      Remover
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={editing ? "Editar documento" : "Novo documento"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void submit()}
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="title" label="Título" rules={[{ required: true }]}>
            <Input placeholder="Ex.: Orientações após a instalação do aparelho" />
          </Form.Item>
          <Form.Item
            name="content"
            label="Conteúdo"
            rules={[{ required: true }]}
            extra="Separe assuntos por linha em branco: cada bloco vira um trecho recuperável."
          >
            <Input.TextArea rows={10} />
          </Form.Item>
          <Form.Item name="tags" label="Tags">
            <Select mode="tags" tokenSeparators={[","]} placeholder="cuidados, higiene, pós-consulta" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
