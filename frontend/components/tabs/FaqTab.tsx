"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message as antdMessage,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";
import type { FAQ } from "@/lib/types";

/** Base de dúvidas frequentes usada pelo agente nas respostas. */
export default function FaqTab() {
  const [items, setItems] = useState<FAQ[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FAQ | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setItems(await api.listFaqs());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    const values = await form.validateFields();
    try {
      if (editing) await api.updateFaq(editing.id, values);
      else await api.createFaq({ ...values, tags: values.tags ?? [] });
      antdMessage.success("Dúvida salva.");
      setOpen(false);
      void load();
    } catch (e) {
      antdMessage.error(e instanceof Error ? e.message : "Falha ao salvar.");
    }
  }

  return (
    <Card
      title={
        <Space direction="vertical" size={0}>
          <Typography.Text strong>Dúvidas frequentes</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            O agente consulta esta base antes de responder sobre preços, convênios e tratamento.
          </Typography.Text>
        </Space>
      }
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
          Nova dúvida
        </Button>
      }
    >
      <Table
        rowKey="id"
        dataSource={items}
        expandable={{
          expandedRowRender: (row) => <Typography.Paragraph>{row.answer}</Typography.Paragraph>,
        }}
        columns={[
          { title: "Pergunta", dataIndex: "question" },
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
            title: "Ativa",
            dataIndex: "active",
            render: (value: boolean, row: FAQ) => (
              <Switch
                size="small"
                checked={value}
                onChange={async (checked) => {
                  await api.updateFaq(row.id, { active: checked });
                  void load();
                }}
              />
            ),
          },
          {
            title: "",
            render: (_: unknown, row: FAQ) => (
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
                  title="Remover dúvida?"
                  onConfirm={async () => {
                    await api.deleteFaq(row.id);
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

      <Modal
        title={editing ? "Editar dúvida" : "Nova dúvida"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="question" label="Pergunta" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="answer" label="Resposta" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="tags" label="Tags (ajudam o agente a encontrar)">
            <Select mode="tags" tokenSeparators={[","]} placeholder="preço, convênio, aparelho" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
