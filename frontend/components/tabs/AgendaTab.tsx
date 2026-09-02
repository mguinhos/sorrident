"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Calendar, Card, Col, DatePicker, Empty, List, Radio, Row, Select, Space, Tag, Typography } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { api } from "@/lib/api";
import type { Appointment, Dentist } from "@/lib/types";

const STATUS_BADGE: Record<string, "success" | "processing" | "default" | "error" | "warning"> = {
  agendado: "processing",
  confirmado: "success",
  concluido: "default",
  cancelado: "error",
  faltou: "warning",
};

interface Props {
  dentistId?: string;
}

/** Agenda visual: calendário mensal + lista do dia selecionado. */
export default function AgendaTab({ dentistId = "" }: Props) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [filter, setFilter] = useState(dentistId);
  const [selected, setSelected] = useState<Dayjs>(dayjs());
  const [month, setMonth] = useState<Dayjs>(dayjs());

  const load = useCallback(async () => {
    const start = month.startOf("month");
    const days = month.daysInMonth() + 7;
    setAppointments(await api.agenda(start.format("YYYY-MM-DD"), days));
  }, [month]);

  useEffect(() => {
    void load();
    if (!dentistId) void api.listDentists(true).then(setDentists);
  }, [load, dentistId]);

  const visible = useMemo(
    () => appointments.filter((a) => (filter ? a.dentist_id === filter : true) && a.status !== "cancelado"),
    [appointments, filter],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const item of visible) {
      const key = item.start.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return map;
  }, [visible]);

  const dayItems = (byDay.get(selected.format("YYYY-MM-DD")) ?? []).sort((a, b) =>
    a.start.localeCompare(b.start),
  );

  return (
    <Row gutter={16}>
      <Col xs={24} lg={16}>
        <Card
          title="Agenda"
          extra={
            !dentistId && (
              <Select
                allowClear
                style={{ width: 220 }}
                placeholder="Todos os profissionais"
                value={filter || undefined}
                onChange={(v) => setFilter(v ?? "")}
                options={dentists.map((d) => ({ label: d.name, value: d.id }))}
              />
            )
          }
        >
          <Calendar
            value={selected}
            onSelect={(value, info) => {
              setSelected(value);
              if (info.source === "month" || !value.isSame(month, "month")) setMonth(value);
            }}
            onPanelChange={(value) => setMonth(value)}
            cellRender={(current, info) => {
              if (info.type !== "date") return null;
              const items = byDay.get(current.format("YYYY-MM-DD")) ?? [];
              if (items.length === 0) return null;
              return (
                <Space direction="vertical" size={0} style={{ width: "100%" }}>
                  {items.slice(0, 3).map((item) => (
                    <Badge
                      key={item.id}
                      status={STATUS_BADGE[item.status]}
                      text={
                        <span style={{ fontSize: 11 }}>
                          {dayjs(item.start).format("HH:mm")} {item.patient_name.split(" ")[0]}
                        </span>
                      }
                    />
                  ))}
                  {items.length > 3 && (
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      +{items.length - 3} consultas
                    </Typography.Text>
                  )}
                </Space>
              );
            }}
          />
        </Card>
      </Col>
      <Col xs={24} lg={8}>
        <Card title={`Consultas de ${selected.format("DD/MM/YYYY")}`}>
          {dayItems.length === 0 ? (
            <Empty description="Nenhuma consulta neste dia" />
          ) : (
            <List
              dataSource={dayItems}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <Space>
                        <Typography.Text strong>{dayjs(item.start).format("HH:mm")}</Typography.Text>
                        <Typography.Text>{item.patient_name}</Typography.Text>
                        <Tag color={item.status === "confirmado" ? "green" : "blue"}>{item.status}</Tag>
                      </Space>
                    }
                    description={
                      <Typography.Text type="secondary">
                        {item.procedure_name} · {item.dentist_name}
                      </Typography.Text>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </Col>
    </Row>
  );
}
