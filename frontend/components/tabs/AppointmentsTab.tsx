"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message as antdMessage,
} from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { api } from "@/lib/api";
import type { Appointment, Dentist, Patient, Procedure, Slot } from "@/lib/types";

const STATUS = ["agendado", "confirmado", "concluido", "cancelado", "faltou"] as const;
const STATUS_COLOR: Record<string, string> = {
  agendado: "blue",
  confirmado: "green",
  concluido: "default",
  cancelado: "red",
  faltou: "orange",
};

/** Lista e cria agendamentos usando os horários realmente livres. */
export default function AppointmentsTab() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [appointments, patientList, dentistList, procedureList] = await Promise.all([
        api.listAppointments({ status: statusFilter }),
        api.listPatients(),
        api.listDentists(true),
        api.listProcedures(true),
      ]);
      setItems(appointments);
      setPatients(patientList);
      setDentists(dentistList);
      setProcedures(procedureList);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadSlots = useCallback(async (day: Dayjs | null, dentistId: string, procedureId: string) => {
    if (!day) return setSlots([]);
    const duration = procedures.find((p) => p.id === procedureId)?.duration_minutes ?? 0;
    setSlots(await api.slots(day.format("YYYY-MM-DD"), dentistId ?? "", duration));
  }, [procedures]);

  async function submit() {
    const values = await form.validateFields();
    try {
      await api.createAppointment({
        patient_id: values.patient_id,
        start: values.start,
        dentist_id: values.dentist_id ?? "",
        procedure_id: values.procedure_id ?? "",
        notes: values.notes ?? "",
      });
      antdMessage.success("Agendamento criado.");
      setOpen(false);
      form.resetFields();
      void load();
    } catch (e) {
      antdMessage.error(e instanceof Error ? e.message : "Não foi possível agendar.");
    }
  }

  return (
    <Card
      title="Agendamentos"
      extra={
        <Space>
          <Select
            allowClear
            placeholder="Filtrar por status"
            style={{ width: 180 }}
            value={statusFilter || undefined}
            onChange={(v) => setStatusFilter(v ?? "")}
            options={STATUS.map((s) => ({ label: s, value: s }))}
          />
          <Button icon={<ReloadOutlined />} onClick={() => void load()} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            Novo agendamento
          </Button>
        </Space>
      }
    >
      <Table
        rowKey="id"
        loading={loading}
        dataSource={items}
        scroll={{ x: 900 }}
        columns={[
          {
            title: "Data e hora",
            dataIndex: "start",
            sorter: (a, b) => a.start.localeCompare(b.start),
            render: (v: string) => new Date(v).toLocaleString("pt-BR"),
          },
          { title: "Paciente", dataIndex: "patient_name" },
          { title: "Profissional", dataIndex: "dentist_name" },
          { title: "Procedimento", dataIndex: "procedure_name" },
          { title: "Origem", dataIndex: "origin", render: (v: string) => <Tag>{v}</Tag> },
          {
            title: "Status",
            dataIndex: "status",
            render: (value: string, row: Appointment) => (
              <Select
                size="small"
                value={value}
                style={{ width: 130 }}
                options={STATUS.map((s) => ({ label: s, value: s }))}
                onChange={async (status) => {
                  await api.setAppointmentStatus(row.id, status);
                  antdMessage.success("Status atualizado.");
                  void load();
                }}
              />
            ),
          },
          {
            title: "Ações",
            render: (_: unknown, row: Appointment) => (
              <Popconfirm
                title="Cancelar este agendamento?"
                okText="Cancelar consulta"
                cancelText="Voltar"
                onConfirm={async () => {
                  await api.cancelAppointment(row.id, "Cancelado pela clínica");
                  void load();
                }}
              >
                <Button size="small" danger disabled={row.status === "cancelado"}>
                  Cancelar
                </Button>
              </Popconfirm>
            ),
          },
        ]}
      />

      <Modal
        title="Novo agendamento"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void submit()}
        okText="Agendar"
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="patient_id" label="Paciente" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Selecione o paciente"
              options={patients.map((p) => ({ label: `${p.name} — ${p.phone}`, value: p.id }))}
            />
          </Form.Item>
          <Form.Item name="procedure_id" label="Procedimento">
            <Select
              allowClear
              placeholder="Consulta padrão"
              options={procedures.map((p) => ({
                label: `${p.name} (${p.duration_minutes} min)`,
                value: p.id,
              }))}
              onChange={() =>
                void loadSlots(form.getFieldValue("day"), form.getFieldValue("dentist_id"), form.getFieldValue("procedure_id"))
              }
            />
          </Form.Item>
          <Form.Item name="dentist_id" label="Profissional">
            <Select
              allowClear
              placeholder="Qualquer profissional disponível"
              options={dentists.map((d) => ({ label: d.name, value: d.id }))}
              onChange={() =>
                void loadSlots(form.getFieldValue("day"), form.getFieldValue("dentist_id"), form.getFieldValue("procedure_id"))
              }
            />
          </Form.Item>
          <Form.Item name="day" label="Dia" rules={[{ required: true, message: "Escolha o dia" }]}>
            <DatePicker
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              disabledDate={(d) => d.isBefore(dayjs().startOf("day"))}
              onChange={(d) =>
                void loadSlots(d, form.getFieldValue("dentist_id"), form.getFieldValue("procedure_id"))
              }
            />
          </Form.Item>
          <Form.Item
            name="start"
            label="Horário disponível"
            rules={[{ required: true, message: "Escolha um horário" }]}
          >
            <Select
              placeholder={slots.length ? "Selecione" : "Escolha o dia para ver os horários"}
              options={slots.map((s) => ({
                label: `${dayjs(s.start).format("HH:mm")} — ${s.dentist_name}`,
                value: s.start,
              }))}
            />
          </Form.Item>
          <Form.Item name="notes" label="Observações">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Os horários listados já consideram a agenda ocupada e o expediente da clínica.
          </Typography.Text>
        </Form>
      </Modal>
    </Card>
  );
}
