"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Col, Empty, List, Row, Tag, Typography } from "antd";
import AppShell from "@/components/AppShell";
import ChatPanel from "@/components/ChatPanel";
import { api } from "@/lib/api";
import { useRequireRole } from "@/app/providers";
import type { Appointment } from "@/lib/types";

const STATUS_COLOR: Record<string, string> = {
  agendado: "blue",
  confirmado: "green",
  concluido: "default",
  cancelado: "red",
  faltou: "orange",
};

export default function ClientePage() {
  const user = useRequireRole("cliente");
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const load = useCallback(async () => {
    try {
      setAppointments(await api.myAppointments());
    } catch {
      /* o paciente pode ainda não ter cadastro vinculado */
    }
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  if (!user) return null;

  return (
    <AppShell title="Área do paciente">
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={15}>
          <ChatPanel />
        </Col>
        <Col xs={24} lg={9}>
          <Card title="Minhas consultas" extra={<a onClick={() => void load()}>Atualizar</a>}>
            {appointments.length === 0 ? (
              <Empty description="Nenhuma consulta agendada. Peça ao SorriDente no chat!" />
            ) : (
              <List
                dataSource={appointments}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <>
                          {new Date(item.start).toLocaleString("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}{" "}
                          <Tag color={STATUS_COLOR[item.status]}>{item.status}</Tag>
                        </>
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
    </AppShell>
  );
}
