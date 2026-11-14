"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { CloseOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { Icone } from "@/components/ui";
import type { InputRef } from "antd";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Patient } from "@/lib/types";
import TabelaRolavel from "@/components/ui/TabelaRolavel";
import InputMascarado from "@/components/ui/InputMascarado";

/** CRUD de pacientes com ficha e histórico de consultas. */
const COR_CONVENIO: Record<string, string> = {
  amil: "#461bff",
  "amil dental": "#461bff",
  bradesco: "#d60719",
  "bradesco dental": "#d60719",
  sulamerica: "#002855",
  "sulamérica": "#002855",
  "sulamérica odonto": "#002855",
  odontoprev: "#0366ff",
  unimed: "#007e4c",
  "unimed dental": "#007e4c",
  hapvida: "#0039a0",
  "hapvida odonto": "#0039a0",
};

function corConvenio(nome: string): string {
  const key = (nome || "").trim().toLowerCase();
  return COR_CONVENIO[key] || "#1677ff";
}

export default function PatientsTab({ prontuarioBase }: { prontuarioBase?: string } = {}) {
  const router = useRouter();
  const [items, setItems] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Patient | null>(null);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const buscaRef = useRef<InputRef>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    if (buscaAberta) buscaRef.current?.focus();
  }, [buscaAberta]);

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
            ref={buscaRef}
            allowClear
            prefix={<span style={{ marginRight: 6 }}><SearchOutlined /></span>}
            placeholder="Buscar pelo nome" style={{ width: 280, paddingLeft: 12 }}
            className={buscaAberta ? undefined : "sd-busca-recolhida"}
            onChange={(e) => setSearch(e.target.value)}
          />
          {buscaAberta ? (
            <Button
              className="sd-so-mobile"
              icon={<CloseOutlined />}
              aria-label="Fechar busca"
              onClick={() => {
                setBuscaAberta(false);
                setSearch("");
              }}
            />
          ) : (
            <Button className="sd-so-mobile" icon={<SearchOutlined />} aria-label="Buscar" onClick={() => setBuscaAberta(true)} />
          )}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            className="sd-btn-so-icone"
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
      <TabelaRolavel>
        <Table
        rowKey="id"
        loading={loading}
        dataSource={items}
        scroll={{ x: 800 }}
        columns={[
          {
            title: "Nome",
            dataIndex: "name",
            render: (v: string) => {
              const partes = (v || "").trim().split(/\s+/);
              const curto = partes.length > 1 ? `${partes[0]} ${partes[partes.length - 1]}` : partes[0];
              return (
                <span
                  title={v}
                  style={{ cursor: "pointer", color: "var(--cor-primaria)", fontWeight: 600 }}
                  onClick={() => antdMessage.info(v)}
                >
                  {curto}
                </span>
              );
            },
          },
          { title: "Telefone", dataIndex: "phone" },
          { title: "CPF", dataIndex: "document" },
          {
            title: "Convênio",
            dataIndex: "insurance_provider",
            render: (v: string) => (v ? <Tag style={{ fontWeight: 700, background: corConvenio(v), color: "#fff", border: "none" }}>{v}</Tag> : <Tag color="default" style={{ fontWeight: 700, background: "#e5e7eb", color: "#374151" }}>Particular</Tag>),
          },
          {
            title: "Ações",
            render: (_: unknown, row: Patient) => (
              <Space>
                {prontuarioBase && (
                  <Button size="small" type="primary" onClick={() => router.push(`${prontuarioBase}/${row.id}`)}>
                    Prontuário
                  </Button>
                )}
                <Button size="small" onClick={async () => setDetail(await api.getPatient(row.id))}>
                  Ficha
                </Button>
                <Button
                  size="small"
                  icon={<Icone nome="editar" tam={14} />}
                  onClick={() => {
                    setEditing(row);
                    form.setFieldsValue(row);
                    setOpen(true);
                  }}
                />

                <Popconfirm
                  title="Remover paciente?"
                  onConfirm={async () => {
                    await api.deletePatient(row.id);
                    void load();
                  }}
                >
                  <Button size="small" danger icon={<Icone nome="lixeira" tam={14} />}>
                    
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      </TabelaRolavel>

      <Modal
        title={editing ? "Editar paciente" : "Novo paciente"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="name" label="Nome completo" rules={[{ required: true }]}>
            <Input placeholder="Seu nome completo" />
          </Form.Item>
          <Form.Item name="phone" label="Telefone">
            <InputMascarado tipo="telefone" placeholder="(11) 90000-0000" />
          </Form.Item>
          <Form.Item name="email" label="E-mail">
            <Input placeholder="voce@email.com" />
          </Form.Item>
          <Form.Item name="document" label="CPF">
            <InputMascarado tipo="cpf" placeholder="000.000.000-00" />
          </Form.Item>
          <Form.Item name="birth_date" label="Data de Nascimento">
            <Input placeholder="dd/mm/yyyy" />
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
                <span style={{ fontWeight: 700, color: "#d46b08" }}>{detail.insurance_provider || "Particular"}</span>
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
