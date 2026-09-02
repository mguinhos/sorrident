"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Drawer, Empty, List, Space, Tag, Typography, notification as antdNotification } from "antd";
import { BellOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";
import type { Notification } from "@/lib/types";

const LEVEL_COLOR: Record<string, string> = {
  info: "blue",
  sucesso: "green",
  alerta: "orange",
  erro: "red",
};

/** Sino de notificações alimentado por SSE (`/api/events`). */
export default function NotificationBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [toast, contextHolder] = antdNotification.useNotification();

  const load = useCallback(async () => {
    try {
      setItems(await api.listNotifications());
    } catch {
      /* silencioso: o sino não deve quebrar a página */
    }
  }, []);

  useEffect(() => {
    void load();
    const source = api.openEventStream();
    source.addEventListener("notification.created", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as Notification;
      setItems((prev) => [data, ...prev].slice(0, 100));
      toast.open({
        message: data.title,
        description: data.message,
        placement: "bottomRight",
        duration: 5,
      });
    });
    source.addEventListener("message.created", () => void load());
    source.onerror = () => source.close();
    return () => source.close();
  }, [load, toast]);

  const unread = items.filter((n) => !n.read).length;

  return (
    <>
      {contextHolder}
      <Badge count={unread} size="small">
        <Button icon={<BellOutlined />} onClick={() => setOpen(true)} />
      </Badge>
      <Drawer
        title="Notificações"
        open={open}
        onClose={() => setOpen(false)}
        width={420}
        extra={
          <Button
            size="small"
            onClick={async () => {
              await api.readAllNotifications();
              void load();
            }}
          >
            Marcar todas como lidas
          </Button>
        }
      >
        {items.length === 0 ? (
          <Empty description="Nenhuma notificação" />
        ) : (
          <List
            dataSource={items}
            renderItem={(item) => (
              <List.Item
                onClick={async () => {
                  if (!item.read) {
                    await api.readNotification(item.id);
                    void load();
                  }
                }}
                style={{ cursor: "pointer", opacity: item.read ? 0.6 : 1 }}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Tag color={LEVEL_COLOR[item.level]}>{item.level}</Tag>
                      <Typography.Text strong>{item.title}</Typography.Text>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={0}>
                      <Typography.Text>{item.message}</Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(item.created_at).toLocaleString("pt-BR")}
                      </Typography.Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Drawer>
    </>
  );
}
