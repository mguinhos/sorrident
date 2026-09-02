"use client";

import { Avatar, Button, Layout, Space, Tag, Typography } from "antd";
import { LogoutOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers";
import NotificationBell from "./NotificationBell";

const ROLE_LABEL: Record<string, string> = {
  gestor: "Gestor",
  medico: "Médico(a)",
  cliente: "Paciente",
};

interface Props {
  title: string;
  subtitle?: string;
  showNotifications?: boolean;
  children: React.ReactNode;
}

/** Moldura comum das páginas autenticadas. */
export default function AppShell({ title, subtitle, showNotifications = false, children }: Props) {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f7fb" }}>
      <Layout.Header
        style={{
          background: "#fff",
          borderBottom: "1px solid #e8ebf2",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Space size={12}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            🦷 SorriDente
          </Typography.Title>
          <Typography.Text type="secondary">{title}</Typography.Text>
          {subtitle && <Tag color="blue">{subtitle}</Tag>}
        </Space>
        <Space size={16}>
          {showNotifications && <NotificationBell />}
          <Space size={8}>
            <Avatar style={{ background: "#1677ff" }}>
              {(user?.display_name || "?").charAt(0).toUpperCase()}
            </Avatar>
            <Space direction="vertical" size={0}>
              <Typography.Text strong style={{ lineHeight: 1.1 }}>
                {user?.display_name}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: 1.1 }}>
                {ROLE_LABEL[user?.role ?? ""] ?? ""}
              </Typography.Text>
            </Space>
          </Space>
          <Button
            icon={<LogoutOutlined />}
            onClick={() => {
              logout();
              router.replace("/");
            }}
          >
            Sair
          </Button>
        </Space>
      </Layout.Header>
      <Layout.Content style={{ padding: 20 }}>{children}</Layout.Content>
    </Layout>
  );
}
