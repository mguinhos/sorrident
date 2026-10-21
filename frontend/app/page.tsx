"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Alert, Button, Form, Input, Segmented } from "antd";
import { HOME_BY_ROLE, useAuth } from "./providers";
import type { Role } from "@/lib/types";

const PERFIS: { label: string; value: Role; hint: string; demo: [string, string] }[] = [
  { label: "Cliente", value: "cliente", hint: "Converse com o SorriDente e agende sua consulta.", demo: ["cliente", "cliente123"] },
  { label: "Gestor", value: "gestor", hint: "Painel da clínica: agenda, conversas, financeiro e configurações.", demo: ["gestor", "gestor123"] },
  { label: "Médico", value: "medico", hint: "Sua agenda do dia e o prontuário dos pacientes.", demo: ["medico", "medico123"] },
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
    <main className="sd-login">
      <div className="sd-login-padrao" aria-hidden />
      <div className="sd-login-brilho" aria-hidden style={{ left: -140, top: -120, width: 520, height: 520, background: "radial-gradient(circle,rgba(255,255,255,.30),transparent 62%)" }} />
      <div className="sd-login-brilho" aria-hidden style={{ right: -160, bottom: -180, width: 620, height: 620, background: "radial-gradient(circle,rgba(255,255,255,.20),transparent 62%)" }} />
      <div className="sd-login-brilho" aria-hidden style={{ inset: 0, borderRadius: 0, background: "radial-gradient(760px 400px at 50% 50%,rgba(255,255,255,.10),transparent 70%)" }} />

      <section className="sd-login-cartao" aria-labelledby="titulo-login">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Image src="/logo.svg" alt="" width={54} height={54} priority />
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <h1 id="titulo-login" style={{ margin: 0, fontSize: 23, fontWeight: 800, letterSpacing: "-0.3px" }}>SorriDente</h1>
            <span style={{ fontSize: 12.5, color: "var(--cor-suave)" }}>Clínica ortodôntica · acesso ao sistema</span>
          </div>
        </div>

        <Segmented
          block
          value={perfil}
          onChange={(v) => setPerfil(v as Role)}
          options={PERFIS.map((p) => ({ label: p.label, value: p.value }))}
          aria-label="Perfil de acesso"
        />
        <p style={{ margin: 0, fontSize: 13, color: "var(--cor-suave)", lineHeight: 1.5 }}>{perfilAtual.hint}</p>

        {erro && <Alert type="error" message={erro} showIcon />}

        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Form.Item name="username" label={<b>Usuário</b>} style={{ margin: 0 }} rules={[{ required: true, message: "Informe o usuário" }]}>
            <Input placeholder="usuário" style={{ height: 46 }} autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" label={<b>Senha</b>} style={{ margin: 0 }} rules={[{ required: true, message: "Informe a senha" }]}>
            <Input.Password placeholder="senha" style={{ height: 46 }} autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={carregando} style={{ fontWeight: 700 }}>
            Entrar como {perfilAtual.label.toLowerCase()}
          </Button>
        </Form>
      </section>
    </main>
  );
}
