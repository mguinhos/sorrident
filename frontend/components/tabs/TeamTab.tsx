"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Space,
  Switch,
  Table,
  Tag,
  message as antdMessage,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";
import type { Dentist, Procedure } from "@/lib/types";

/** Cadastro de profissionais e de procedimentos ofertados. */
export default function TeamTab() {
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [dentistOpen, setDentistOpen] = useState(false);
  const [procedureOpen, setProcedureOpen] = useState(false);
  const [editingDentist, setEditingDentist] = useState<Dentist | null>(null);
  const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(null);
  const [dentistForm] = Form.useForm();
  const [procedureForm] = Form.useForm();

  const load = useCallback(async () => {
    const [d, p] = await Promise.all([api.listDentists(), api.listProcedures()]);
    setDentists(d);
    setProcedures(p);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveDentist() {
    const values = await dentistForm.validateFields();
    try {
      if (editingDentist) await api.updateDentist(editingDentist.id, values);
      else await api.createDentist(values);
      antdMessage.success("Profissional salvo.");
      setDentistOpen(false);
      void load();
    } catch (e) {
      antdMessage.error(e instanceof Error ? e.message : "Falha ao salvar.");
    }
  }

  async function saveProcedure() {
    const values = await procedureForm.validateFields();
    try {
      if (editingProcedure) await api.updateProcedure(editingProcedure.id, values);
      else await api.createProcedure(values);
      antdMessage.success("Procedimento salvo.");
      setProcedureOpen(false);
      void load();
    } catch (e) {
      antdMessage.error(e instanceof Error ? e.message : "Falha ao salvar.");
    }
  }

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={12}>
        <Card
          title="Profissionais"
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingDentist(null);
                dentistForm.resetFields();
                setDentistOpen(true);
              }}
            >
              Novo
            </Button>
          }
        >
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={dentists}
            columns={[
              {
                title: "Nome",
                dataIndex: "name",
                render: (v: string, row: Dentist) => (
                  <Space>
                    <span style={{ width: 10, height: 10, borderRadius: 5, background: row.color, display: "inline-block" }} />
                    {v}
                  </Space>
                ),
              },
              { title: "CRO", dataIndex: "cro" },
              {
                title: "Ativo",
                dataIndex: "active",
                render: (v: boolean, row: Dentist) => (
                  <Switch
                    size="small"
                    checked={v}
                    onChange={async (checked) => {
                      await api.updateDentist(row.id, { active: checked });
                      void load();
                    }}
                  />
                ),
              },
              {
                title: "",
                render: (_: unknown, row: Dentist) => (
                  <Space>
                    <Button
                      size="small"
                      onClick={() => {
                        setEditingDentist(row);
                        dentistForm.setFieldsValue(row);
                        setDentistOpen(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Popconfirm
                      title="Remover profissional?"
                      onConfirm={async () => {
                        await api.deleteDentist(row.id);
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
      </Col>

      <Col xs={24} lg={12}>
        <Card
          title="Procedimentos"
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingProcedure(null);
                procedureForm.resetFields();
                setProcedureOpen(true);
              }}
            >
              Novo
            </Button>
          }
        >
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={procedures}
            columns={[
              { title: "Procedimento", dataIndex: "name" },
              {
                title: "Duração",
                dataIndex: "duration_minutes",
                render: (v: number) => <Tag>{v} min</Tag>,
              },
              {
                title: "Preço",
                dataIndex: "price",
                render: (v: number) =>
                  v === 0 ? <Tag color="green">gratuito</Tag> : `R$ ${v.toFixed(2)}`,
              },
              {
                title: "",
                render: (_: unknown, row: Procedure) => (
                  <Space>
                    <Button
                      size="small"
                      onClick={() => {
                        setEditingProcedure(row);
                        procedureForm.setFieldsValue(row);
                        setProcedureOpen(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Popconfirm
                      title="Remover procedimento?"
                      onConfirm={async () => {
                        await api.deleteProcedure(row.id);
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
      </Col>

      <Modal
        title={editingDentist ? "Editar profissional" : "Novo profissional"}
        open={dentistOpen}
        onCancel={() => setDentistOpen(false)}
        onOk={() => void saveDentist()}
        destroyOnClose
      >
        <Form form={dentistForm} layout="vertical" preserve={false}>
          <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="cro" label="CRO">
            <Input />
          </Form.Item>
          <Form.Item name="specialty" label="Especialidade" initialValue="Ortodontia">
            <Input />
          </Form.Item>
          <Form.Item name="color" label="Cor na agenda" initialValue="#1677ff">
            <Input type="color" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingProcedure ? "Editar procedimento" : "Novo procedimento"}
        open={procedureOpen}
        onCancel={() => setProcedureOpen(false)}
        onOk={() => void saveProcedure()}
        destroyOnClose
      >
        <Form form={procedureForm} layout="vertical" preserve={false}>
          <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Descrição">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="duration_minutes" label="Duração (minutos)" initialValue={30}>
            <InputNumber min={10} max={480} step={10} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="price" label="Preço (R$)" initialValue={0}>
            <InputNumber min={0} step={10} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </Row>
  );
}
