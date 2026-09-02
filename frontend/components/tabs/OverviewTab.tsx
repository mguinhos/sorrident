"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Col, List, Progress, Row, Space, Statistic, Table, Tag, Typography } from "antd";
import {
  CalendarOutlined,
  MessageOutlined,
  TeamOutlined,
  ScheduleOutlined,
} from "@ant-design/icons";
import { api } from "@/lib/api";
import type { DashboardData } from "@/lib/types";

const STATUS_COLOR: Record<string, string> = {
  agendado: "blue",
  confirmado: "green",
  concluido: "default",
  cancelado: "red",
  faltou: "orange",
};

/** Visão geral: indicadores, volume por dia e próximas consultas. */
export default function OverviewTab() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api.dashboard());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => clearInterval(timer);
  }, [load]);

  const max = Math.max(1, ...(data?.series_14d.map((d) => d.total) ?? [1]));

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <Card loading={loading}>
            <Statistic title="Consultas hoje" value={data?.appointments_today ?? 0} prefix={<CalendarOutlined />} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={loading}>
            <Statistic title="Consultas na semana" value={data?.appointments_week ?? 0} prefix={<ScheduleOutlined />} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={loading}>
            <Statistic title="Pacientes" value={data?.patients_total ?? 0} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title="Mensagens não lidas"
              value={data?.unread_messages ?? 0}
              prefix={<MessageOutlined />}
              valueStyle={{ color: (data?.unread_messages ?? 0) > 0 ? "#fa8c16" : undefined }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="Consultas por dia (últimos 14 dias)" loading={loading}>
            <Space direction="vertical" style={{ width: "100%" }} size={6}>
              {(data?.series_14d ?? []).map((point) => (
                <Row key={point.date} align="middle" gutter={8}>
                  <Col span={5}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {new Date(`${point.date}T00:00`).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </Typography.Text>
                  </Col>
                  <Col span={16}>
                    <Progress percent={(point.total / max) * 100} showInfo={false} size="small" />
                  </Col>
                  <Col span={3}>
                    <Typography.Text strong>{point.total}</Typography.Text>
                  </Col>
                </Row>
              ))}
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Card title="Situação dos agendamentos" loading={loading}>
              <Space wrap>
                {Object.entries(data?.by_status ?? {}).map(([status, total]) => (
                  <Tag key={status} color={STATUS_COLOR[status]} style={{ padding: "4px 10px" }}>
                    {status}: <strong>{total}</strong>
                  </Tag>
                ))}
              </Space>
            </Card>
            <Card title="Conversas por canal" loading={loading}>
              <List
                size="small"
                dataSource={Object.entries(data?.by_channel ?? {})}
                renderItem={([channel, total]) => (
                  <List.Item>
                    <Typography.Text>{channel}</Typography.Text>
                    <Typography.Text strong>{total}</Typography.Text>
                  </List.Item>
                )}
              />
            </Card>
          </Space>
        </Col>
      </Row>

      <Card title="Próximas consultas" loading={loading}>
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={data?.next_appointments ?? []}
          columns={[
            {
              title: "Quando",
              dataIndex: "start",
              render: (v: string) => new Date(v).toLocaleString("pt-BR"),
            },
            { title: "Paciente", dataIndex: "patient_name" },
            { title: "Profissional", dataIndex: "dentist_name" },
            { title: "Procedimento", dataIndex: "procedure_name" },
            {
              title: "Status",
              dataIndex: "status",
              render: (v: string) => <Tag color={STATUS_COLOR[v]}>{v}</Tag>,
            },
            { title: "Origem", dataIndex: "origin", render: (v: string) => <Tag>{v}</Tag> },
          ]}
        />
      </Card>
    </Space>
  );
}
