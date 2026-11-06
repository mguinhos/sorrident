"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Col, Form, Input, Row } from "antd";
import { Icone } from "@/components/ui";
import { HOME_BY_ROLE, useAuth } from "@/app/providers";
import { api } from "@/lib/api";

/** Cadastro do paciente — necessário apenas para acompanhar consultas no painel.
 *  O chat continua livre sem conta. */
export default function CadastroPage() {
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const { user, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace(HOME_BY_ROLE[user.role]);
  }, [user, router]);

  if (user) return null;

  async function onFinish(values: { nome: string; usuario: string; email: string; telefone?: string; documento?: string; senha: string }) {
    setCarregando(true);
    setErro("");
    try {
      await api.register({
        username: values.usuario.trim(),
        password: values.senha,
        display_name: values.nome.trim(),
        email: values.email.trim(),
        phone: (values.telefone ?? "").trim(),
        document: (values.documento ?? "").trim(),
      });
      const logged = await login(values.usuario.trim(), values.senha);
      router.replace(HOME_BY_ROLE[logged.role]);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao criar a conta.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="sd-login">
      <Link href="/" className="sd-login-voltar" aria-label="Voltar à página de apresentação">
        <Icone nome="esq" tam={16} />
      </Link>
      <div className="sd-login-padrao" aria-hidden />
      <div className="sd-login-brilho" aria-hidden style={{ left: -140, top: -120, width: 520, height: 520, background: "radial-gradient(circle,rgba(255,255,255,.30),transparent 62%)" }} />
      <div className="sd-login-brilho" aria-hidden style={{ right: -160, bottom: -180, width: 620, height: 620, background: "radial-gradient(circle,rgba(255,255,255,.20),transparent 62%)" }} />

      <section className="sd-login-cartao" aria-labelledby="titulo-cadastro">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Image src="/logo.svg" alt="" width={54} height={54} priority />
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <h1 id="titulo-cadastro" style={{ margin: 0, fontSize: 23, fontWeight: 800, letterSpacing: "-0.3px" }}>Criar conta</h1>
            <span style={{ fontSize: 12.5, color: "var(--cor-suave)" }}>Para acompanhar suas consultas no portal</span>
          </div>
        </div>

        {erro && <Alert type="error" message={erro} showIcon />}

        <Form layout="vertical" onFinish={onFinish} requiredMark={false} className="sd-cadastro-form">
          <Row gutter={[{ xs: 0, sm: 12 }, { xs: 18, sm: 12 }]}>
            <Col xs={24} sm={12}>
              <Form.Item name="nome" label={<b>Nome completo</b>} style={{ margin: 0 }} rules={[{ required: true, message: "Informe seu nome" }]}>
                <Input placeholder="Seu nome" style={{ height: 44 }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="usuario" label={<b>Usuário</b>} style={{ margin: 0 }} rules={[{ required: true, message: "Crie um usuário de acesso" }]}>
                <Input placeholder="nome de usuário" style={{ height: 44 }} autoComplete="username" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[{ xs: 0, sm: 12 }, { xs: 18, sm: 12 }]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="email"
                label={<b>E-mail</b>}
                style={{ margin: 0 }}
                rules={[
                  { required: true, message: "Informe seu e-mail" },
                  { type: "email", message: "E-mail inválido" },
                ]}
              >
                <Input placeholder="voce@email.com" style={{ height: 44 }} autoComplete="email" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="documento" label={<b>CPF</b>} style={{ margin: 0 }}>
                <Input placeholder="000.000.000-00" style={{ height: 44 }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[{ xs: 0, sm: 12 }, { xs: 18, sm: 12 }]}>
            <Col xs={24} sm={12}>
              <Form.Item name="telefone" label={<b>Telefone</b>} style={{ margin: 0 }}>
                <Input placeholder="(11) 99999-9999" style={{ height: 44 }} autoComplete="tel" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="senha"
                label={<b>Senha</b>}
                style={{ margin: 0 }}
                rules={[{ required: true, message: "Crie uma senha" }, { min: 6, message: "Use ao menos 6 caracteres" }]}
              >
                <Input.Password placeholder="senha com 6+ caracteres" style={{ height: 44 }} autoComplete="new-password" />
              </Form.Item>
            </Col>
          </Row>
          <Button type="primary" htmlType="submit" size="large" block loading={carregando} style={{ fontWeight: 700, marginTop: 4 }}>
            Criar conta
          </Button>
        </Form>

        <p style={{ margin: 0, fontSize: 13, color: "var(--cor-suave)", textAlign: "center" }}>
          Já tem conta? <Link href="/login" className="sd-link">Entrar</Link>
        </p>
      </section>
    </main>
  );
}
