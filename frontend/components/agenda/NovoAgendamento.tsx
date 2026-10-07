"use client";

import { useCallback, useEffect, useState } from "react";
import { DatePicker, Form, Input, Modal, Select, message } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { api } from "@/lib/api";
import type { Dentist, Patient, Procedure, Slot } from "@/lib/types";

interface Props {
  aberto: boolean;
  aoFechar: () => void;
  aoCriar?: () => void;
  diaInicial?: Dayjs;
}

/** Cria uma consulta escolhendo entre os horários realmente livres (RN-03). */
export default function NovoAgendamento({ aberto, aoFechar, aoCriar, diaInicial }: Props) {
  const [form] = Form.useForm();
  const [pacientes, setPacientes] = useState<Patient[]>([]);
  const [dentistas, setDentistas] = useState<Dentist[]>([]);
  const [procedimentos, setProcedimentos] = useState<Procedure[]>([]);
  const [horarios, setHorarios] = useState<Slot[]>([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    void Promise.all([api.listPatients(), api.listDentists(true), api.listProcedures(true)])
      .then(([p, d, pr]) => {
        setPacientes(p);
        setDentistas(d);
        setProcedimentos(pr);
      })
      .catch(() => undefined);
    if (diaInicial) form.setFieldValue("day", diaInicial);
  }, [aberto, diaInicial, form]);

  const buscarHorarios = useCallback(async () => {
    const dia: Dayjs | undefined = form.getFieldValue("day");
    if (!dia) return setHorarios([]);
    const dur = procedimentos.find((p) => p.id === form.getFieldValue("procedure_id"))?.duration_minutes ?? 0;
    try {
      setHorarios(await api.slots(dia.format("YYYY-MM-DD"), form.getFieldValue("dentist_id") ?? "", dur));
    } catch {
      setHorarios([]);
    }
  }, [form, procedimentos]);

  async function salvar() {
    const v = await form.validateFields();
    setSalvando(true);
    try {
      await api.createAppointment({
        patient_id: v.patient_id,
        start: v.start,
        dentist_id: v.dentist_id ?? "",
        procedure_id: v.procedure_id ?? "",
        notes: v.notes ?? "",
      });
      message.success("Consulta agendada.");
      form.resetFields();
      aoFechar();
      aoCriar?.();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Não foi possível agendar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal title="Novo agendamento" open={aberto} onCancel={aoFechar} onOk={() => void salvar()} okText="Agendar" cancelText="Cancelar" confirmLoading={salvando} destroyOnClose>
      <Form form={form} layout="vertical" preserve={false} requiredMark={false}>
        <Form.Item name="patient_id" label="Paciente" rules={[{ required: true, message: "Escolha o paciente" }]}>
          <Select showSearch optionFilterProp="label" placeholder="Busque pelo nome" options={pacientes.map((p) => ({ label: `${p.name} — ${p.phone}`, value: p.id }))} />
        </Form.Item>
        <Form.Item name="procedure_id" label="Procedimento">
          <Select allowClear placeholder="Consulta padrão (40 min)" options={procedimentos.map((p) => ({ label: `${p.name} (${p.duration_minutes} min)`, value: p.id }))} onChange={() => void buscarHorarios()} />
        </Form.Item>
        <Form.Item name="dentist_id" label="Profissional">
          <Select allowClear placeholder="Qualquer profissional disponível" options={dentistas.map((d) => ({ label: d.name, value: d.id }))} onChange={() => void buscarHorarios()} />
        </Form.Item>
        <Form.Item name="day" label="Dia" rules={[{ required: true, message: "Escolha o dia" }]}>
          <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" disabledDate={(d) => d.isBefore(dayjs().startOf("day"))} onChange={() => void buscarHorarios()} />
        </Form.Item>
        <Form.Item name="start" label="Horário livre" rules={[{ required: true, message: "Escolha um horário" }]}>
          <Select
            placeholder={horarios.length ? "Selecione" : "Escolha o dia para ver os horários"}
            options={horarios.map((s) => ({ label: `${dayjs(s.start).format("HH:mm")} — ${s.dentist_name}`, value: s.start }))}
          />
        </Form.Item>
        <Form.Item name="notes" label="Observações">
          <Input.TextArea rows={2} />
        </Form.Item>
        <div className="sd-campo-ajuda">Só aparecem horários livres, dentro do expediente da clínica.</div>
      </Form>
    </Modal>
  );
}
