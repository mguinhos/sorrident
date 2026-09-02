"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Space,
  Typography,
  message as antdMessage,
} from "antd";
import { api } from "@/lib/api";

const DIAS = [
  { label: "Segunda", value: 0 },
  { label: "Terça", value: 1 },
  { label: "Quarta", value: 2 },
  { label: "Quinta", value: 3 },
  { label: "Sexta", value: 4 },
  { label: "Sábado", value: 5 },
  { label: "Domingo", value: 6 },
];

/** Dados da clínica, expediente e persona do agente. */
export default function SettingsTab() {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void api.getSettings().then((data) => form.setFieldsValue(data));
  }, [form]);

  async function save() {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await api.updateSettings(values);
      antdMessage.success("Configurações atualizadas.");
    } catch (e) {
      antdMessage.error(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Form form={form} layout="vertical">
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Dados da clínica">
            <Form.Item name="clinic_name" label="Nome">
              <Input />
            </Form.Item>
            <Form.Item name="address" label="Endereço">
              <Input />
            </Form.Item>
            <Form.Item name="phone" label="Telefone">
              <Input />
            </Form.Item>
            <Form.Item name="email" label="E-mail">
              <Input />
            </Form.Item>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Expediente e agenda">
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="opening_hour" label="Abertura">
                  <Input placeholder="08:00" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="closing_hour" label="Fechamento">
                  <Input placeholder="18:00" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="lunch_start" label="Início do almoço">
                  <Input placeholder="12:00" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="lunch_end" label="Fim do almoço">
                  <Input placeholder="13:00" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="slot_minutes" label="Intervalo entre horários (minutos)">
              <InputNumber min={10} max={120} step={5} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="inactivity_minutes"
              label="Encerrar atendimento após (minutos sem interação)"
              extra="O agente se despede e fecha a conversa; o paciente pode reabrir escrevendo de novo."
            >
              <InputNumber min={1} max={240} step={5} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="working_days" label="Dias de atendimento">
              <Checkbox.Group options={DIAS} />
            </Form.Item>
          </Card>
        </Col>

        <Col span={24}>
          <Card title="Persona do agente SorriDente">
            <Typography.Paragraph type="secondary">
              Esta instrução entra no início do prompt de sistema, antes das regras de atendimento.
            </Typography.Paragraph>
            <Form.Item name="persona">
              <Input.TextArea rows={4} />
            </Form.Item>
            <Space>
              <Button type="primary" loading={saving} onClick={() => void save()}>
                Salvar configurações
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </Form>
  );
}
