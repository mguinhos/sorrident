"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  Drawer,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Timeline,
  Typography,
  message as antdMessage,
} from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";
import type { Patient } from "@/lib/types";

/** CRUD de pacientes com ficha e histórico de consultas. */
export default function PatientsTab() {
  const [items, setItems] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Patient | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.listPatients(search));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    const values = await form.validateFields();
    try {
      if (editing) await api.updatePatient(editing.id, values);
      else await api.createPatient(values);
      antdMessage.success("Paciente salvo.");
      setOpen(false);
      setEditing(null);
      form.resetFields();
      void load();
    } catch (e) {
      antdMessage.error(e instanceof Error ? e.message : "Falha ao salvar.");
    }
  }

  return (
    <Card
      title="Pacientes"
      extra={
        <Space>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Buscar por nome, telefone ou CPF"
            style={{ width: 280 }}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(null);
              form.resetFields();
              setOpen(true);
            }}
          >
            Novo paciente
          </Button>
        </Space>
      }
    >
      <Table
        rowKey="id"
        loading={loading}
        dataSource={items}
        scroll={{ x: 800 }}
        columns={[
          { title: "Nome", dataIndex: "name" },
          { title: "Telefone", dataIndex: "phone" },
          { title: "CPF", dataIndex: "document" },
          {
            title: "Convênio",
            dataIndex: "insurance_provider",
            render: (v: string) => (v ? <Tag color="blue">{v}</Tag> : <Tag>particular</Tag>),
          },
          { title: "Tratamento", dataIndex: "treatment" },
          {
            title: "Canais",
            render: (_: unknown, row: Patient) => (
              <Space size={4}>
                {row.telegram_id && <Tag color="#229ED9">telegram</Tag>}
                {!row.telegram_id && <Tag>web</Tag>}
              </Space>
            ),
          },
          {
            title: "Ações",
            render: (_: unknown, row: Patient) => (
              <Space>
                <Button size="small" onClick={async () => setDetail(await api.getPatient(row.id))}>
                  Ficha
                </Button>
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
                  title="Remover paciente?"
                  onConfirm={async () => {
                    await api.deletePatient(row.id);
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
        title={editing ? "Editar paciente" : "Novo paciente"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="name" label="Nome completo" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Telefone">
            <Input placeholder="(11) 90000-0000" />
          </Form.Item>
          <Form.Item name="email" label="E-mail">
            <Input />
          </Form.Item>
          <Form.Item name="document" label="CPF">
            <Input />
          </Form.Item>
          <Form.Item name="birth_date" label="Nascimento (AAAA-MM-DD)">
            <Input placeholder="1990-05-20" />
          </Form.Item>
          <Form.Item name="insurance_provider" label="Convênio">
            <Input placeholder="Amil Dental / particular" />
          </Form.Item>
          <Form.Item name="insurance_card" label="Número da carteirinha">
            <Input />
          </Form.Item>
          <Form.Item name="responsible_name" label="Responsável (se menor de idade)">
            <Input />
          </Form.Item>
          <Form.Item name="treatment" label="Tratamento em curso">
            <Input placeholder="Aparelho fixo metálico" />
          </Form.Item>
          <Form.Item name="notes" label="Observações">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={detail?.name}
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        width={460}
      >
        {detail && (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Space direction="vertical" size={2}>
              <Typography.Text type="secondary">Telefone</Typography.Text>
              <Typography.Text>{detail.phone || "—"}</Typography.Text>
              <Typography.Text type="secondary">E-mail</Typography.Text>
              <Typography.Text>{detail.email || "—"}</Typography.Text>
              <Typography.Text type="secondary">CPF</Typography.Text>
              <Typography.Text>{detail.document || "—"}</Typography.Text>
              <Typography.Text type="secondary">Convênio / carteirinha</Typography.Text>
              <Typography.Text>
                {detail.insurance_provider || "particular"}
                {detail.insurance_card ? ` · ${detail.insurance_card}` : ""}
              </Typography.Text>
              <Typography.Text type="secondary">Tratamento</Typography.Text>
              <Typography.Text>{detail.treatment || "—"}</Typography.Text>
              <Typography.Text type="secondary">Observações</Typography.Text>
              <Typography.Paragraph>{detail.notes || "—"}</Typography.Paragraph>
            </Space>
            <Typography.Title level={5}>Histórico de consultas</Typography.Title>
            <Timeline
              items={(detail.appointments ?? []).map((a) => ({
                color: a.status === "cancelado" ? "red" : a.status === "concluido" ? "gray" : "blue",
                children: (
                  <>
                    <Typography.Text strong>
                      {new Date(a.start).toLocaleString("pt-BR")}
                    </Typography.Text>
                    <br />
                    {a.procedure_name} · {a.dentist_name} <Tag>{a.status}</Tag>
                  </>
                ),
              }))}
            />
          </Space>
        )}
      </Drawer>
    </Card>
  );
}
