"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Descriptions, Empty, Space, Table, Tag, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";
import type { AgentTask, ModelInfo } from "@/lib/types";

const STATUS_COLOR: Record<string, string> = {
  done: "green",
  running: "blue",
  pending: "default",
  failed: "red",
  cancelled: "orange",
};

/** Observabilidade do agente: modelo ativo e turnos processados. */
export default function AgentTab() {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [model, setModel] = useState<ModelInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.agentTasks(50);
      setTasks(data.tasks);
      setModel(data.model);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 15000);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card title="Modelo em uso" loading={loading && !model}>
        {model && (
          <Descriptions column={{ xs: 1, md: 3 }} size="small">
            <Descriptions.Item label="Modelo">{model.display_name}</Descriptions.Item>
            <Descriptions.Item label="Identificador">{model.id}</Descriptions.Item>
            <Descriptions.Item label="Provedor">{model.provider}</Descriptions.Item>
            <Descriptions.Item label="Janela de contexto">
              {model.context_window.toLocaleString("pt-BR")} tokens
            </Descriptions.Item>
            <Descriptions.Item label="Saída máxima">
              {model.max_output_tokens.toLocaleString("pt-BR")} tokens
            </Descriptions.Item>
            <Descriptions.Item label="Capacidades">
              <Space size={4} wrap>
                {model.supports.map((s) => (
                  <Tag key={s} color="blue">
                    {s}
                  </Tag>
                ))}
              </Space>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      <Card
        title="Turnos processados"
        extra={<Button icon={<ReloadOutlined />} onClick={() => void load()} />}
      >
        <Table
          rowKey="id"
          size="small"
          loading={loading}
          dataSource={tasks}
          locale={{ emptyText: <Empty description="Nenhum turno processado ainda" /> }}
          expandable={{
            expandedRowRender: (row) => (
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={row.subtasks}
                columns={[
                  { title: "Etapa", dataIndex: "name" },
                  { title: "Tipo", dataIndex: "kind", render: (v: string) => <Tag>{v}</Tag> },
                  {
                    title: "Status",
                    dataIndex: "status",
                    render: (v: string) => <Tag color={STATUS_COLOR[v]}>{v}</Tag>,
                  },
                  { title: "Duração", dataIndex: "duration_ms", render: (v: number) => `${v} ms` },
                  {
                    title: "Argumentos",
                    dataIndex: "arguments",
                    render: (v: Record<string, unknown>) => (
                      <Typography.Text code style={{ fontSize: 11 }}>
                        {JSON.stringify(v)}
                      </Typography.Text>
                    ),
                  },
                ]}
              />
            ),
          }}
          columns={[
            { title: "Mensagem", dataIndex: "prompt", ellipsis: true },
            { title: "Resposta", dataIndex: "answer", ellipsis: true },
            {
              title: "Status",
              dataIndex: "status",
              render: (v: string) => <Tag color={STATUS_COLOR[v]}>{v}</Tag>,
            },
            { title: "Iterações", dataIndex: "iterations", width: 90 },
            {
              title: "Ferramentas",
              render: (_: unknown, row: AgentTask) =>
                row.subtasks.filter((s) => s.kind === "tool_call").length,
              width: 110,
            },
            { title: "Duração", dataIndex: "duration_ms", render: (v: number) => `${v} ms`, width: 100 },
          ]}
        />
      </Card>
    </Space>
  );
}
