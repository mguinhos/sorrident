"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Form, Input, Segmented, Space, Typography } from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { HOME_BY_ROLE, useAuth } from "./providers";
import type { Role } from "@/lib/types";

const PERFIS: { label: string; value: Role; hint: string; demo: [string, string] }[] = [
  { label: "Cliente", value: "cliente", hint: "Converse com o SorriDente e agende sua consulta.", demo: ["cliente", "cliente123"] },
  { label: "Gestor", value: "gestor", hint: "Dashboard completo, conversas, agenda e integrações.", demo: ["gestor", "gestor123"] },
  { label: "Médico", value: "medico", hint: "Sua agenda e o histórico dos pacientes.", demo: ["medico", "medico123"] },
];

export default function LoginPage() {
  const [perfil, setPerfil] = useState<Role>("cliente");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [form] = Form.useForm();
  const { user, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace(HOME_BY_ROLE[user.role]);
  }, [user, router]);

  const perfilAtual = PERFIS.find((p) => p.value === perfil)!;

  useEffect(() => {
    form.setFieldsValue({ username: perfilAtual.demo[0], password: perfilAtual.demo[1] });
  }, [perfil, form, perfilAtual]);

  async function onFinish(values: { username: string; password: string }) {
    setCarregando(true);
    setErro("");
    try {
      const logged = await login(values.username, values.password);
      router.replace(HOME_BY_ROLE[logged.role]);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao entrar.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="sd-login-bg">
      <Card style={{ width: 420, boxShadow: "0 12px 40px rgba(0,0,0,.18)" }}>
        <Space direction="vertical" size={4} style={{ width: "100%", marginBottom: 20 }}>
          <Typography.Title level={2} style={{ margin: 0 }}>
            🦷 SorriDente
          </Typography.Title>
          <Typography.Text type="secondary">Clínica Ortodôntica — acesso ao sistema</Typography.Text>
        </Space>

        <Segmented
          block
          value={perfil}
          onChange={(v) => setPerfil(v as Role)}
          options={PERFIS.map((p) => ({ label: p.label, value: p.value }))}
          style={{ marginBottom: 12 }}
        />
        <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
          {perfilAtual.hint}
        </Typography.Paragraph>

        {erro && <Alert type="error" message={erro} showIcon style={{ marginBottom: 12 }} />}

        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item name="username" label="Usuário" rules={[{ required: true, message: "Informe o usuário" }]}>
            <Input prefix={<UserOutlined />} placeholder="usuário" size="large" />
          </Form.Item>
          <Form.Item name="password" label="Senha" rules={[{ required: true, message: "Informe a senha" }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="senha" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={carregando}>
            Entrar como {perfilAtual.label.toLowerCase()}
          </Button>
        </Form>
      </Card>
    </div>
  );
}
