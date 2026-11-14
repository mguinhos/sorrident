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
import InputMascarado from "@/components/ui/InputMascarado";

const DIAS = [
  { label: "Seg", value: 0 },
  { label: "Ter", value: 1 },
  { label: "Qua", value: 2 },
  { label: "Qui", value: 3 },
  { label: "Sex", value: 4 },
  { label: "Sáb", value: 5 },
  { label: "Dom", value: 6 },
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
      <Row gutter={[16, 16]} align="stretch">
        <Col xs={24} lg={12}>
          <Card title="Dados da clínica" style={{ height: "100%" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 42 }}>
              <Form.Item name="clinic_name" label="Nome" style={{ marginBottom: 0 }}>
                <Input placeholder="Clínica Ortodôntica SorriDente" />
              </Form.Item>
              <Form.Item name="address" label="Endereço" style={{ marginBottom: 0 }}>
                <Input placeholder="R. Enesto de Paula Santos, 960" />
              </Form.Item>
              <Form.Item name="phone" label="Telefone" style={{ marginBottom: 0 }}>
                <InputMascarado tipo="telefone" placeholder="(11) 4002-8922" />
              </Form.Item>
              <Form.Item name="email" label="E-mail" style={{ marginBottom: 0 }}>
                <Input placeholder="contato@sorridente.com.br" />
              </Form.Item>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Expediente e agenda" style={{ height: "100%" }}>
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
            >
              <InputNumber min={1} max={240} step={5} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="working_days" label="Dias de atendimento">
              <Checkbox.Group options={DIAS} style={{ display: "flex", flexWrap: "wrap", rowGap: 10, columnGap: 12 }} />
            </Form.Item>
          </Card>
        </Col>

        <Col span={24}>
          <Card title="Atendimento humano">
            <Row gutter={12}>
              <Col xs={24} md={12} xl={8}>
                <Form.Item
                  name="notify_whatsapp_phone"
                  label="WhatsApp"
                >
                  <Input placeholder="5511999999999" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12} xl={8}>
                <Form.Item
                  name="handoff_eta_minutes"
                  label="Tempo de espera (minutos)"
                >
                  <InputNumber min={1} max={60} step={1} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={24} xl={8}>
                <Form.Item
                  name="handoff_notice_cooldown_minutes"
                  label="Intervalo entre os avisos (minutos)"
                >
                  <InputNumber min={1} max={240} step={5} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col span={24}>
          <Card title="Persona do agente SorriDente">
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
