"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  message as antdMessage,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import Topo, { Conteudo } from "@/components/layout/Topo";
import { api } from "@/lib/api";
import { useAuth } from "@/app/providers";
import type { Role, User } from "@/lib/types";

const PAPEL: Record<Role, { rotulo: string; cor: string }> = {
  cliente: { rotulo: "Cliente", cor: "blue" },
  medico: { rotulo: "Dentista", cor: "green" },
  gestor: { rotulo: "Gestor", cor: "purple" },
};

/** Sistema de gerenciamento de usuários do Administrador: criar, ler, editar e excluir. */
export default function UsuariosPage() {
  const { user: atual } = useAuth();
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<User | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [form] = Form.useForm();

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      setUsuarios(await api.listUsers());
    } catch (e) {
      antdMessage.error(e instanceof Error ? e.message : "Falha ao carregar usuários.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  function abrirNovo() {
    setEditando(null);
    form.resetFields();
    form.setFieldsValue({ role: "cliente", active: true });
    setAberto(true);
  }

  function abrirEdicao(registro: User) {
    setEditando(registro);
    form.resetFields();
    form.setFieldsValue({
      username: registro.username,
      display_name: registro.display_name,
      role: registro.role,
      active: registro.active,
      password: "",
    });
    setAberto(true);
  }

  async function salvar() {
    const valores = await form.validateFields();
    setSalvando(true);
    try {
      if (editando) {
        await api.updateUser(editando.id, {
          ...(valores.username !== editando.username ? { username: valores.username } : {}),
          ...(valores.password ? { password: valores.password } : {}),
          display_name: valores.display_name,
          role: valores.role,
          active: valores.active,
        });
        antdMessage.success("Usuário atualizado.");
      } else {
        await api.createUser(valores);
        antdMessage.success("Usuário criado.");
      }
      setAberto(false);
      void carregar();
    } catch (e) {
      antdMessage.error(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(registro: User) {
    try {
      await api.deleteUser(registro.id);
      antdMessage.success("Usuário excluído.");
      void carregar();
    } catch (e) {
      antdMessage.error(e instanceof Error ? e.message : "Falha ao excluir.");
    }
  }

  const colunas = [
    { title: "Nome de exibição", dataIndex: "display_name", render: (t: string, r: User) => <b>{t || r.username}</b> },
    { title: "Usuário", dataIndex: "username" },
    {
      title: "Perfil",
      dataIndex: "role",
      render: (papel: Role) => <Tag color={PAPEL[papel].cor}>{PAPEL[papel].rotulo}</Tag>,
    },
    {
      title: "Situação",
      dataIndex: "active",
      render: (ativo: boolean) => (
        <Tag color={ativo ? "success" : "default"}>{ativo ? "Ativo" : "Desativado"}</Tag>
      ),
    },
    {
      title: "Ações",
      key: "acoes",
      render: (_: unknown, r: User) => (
        <Space size={4}>
          <Button size="small" onClick={() => abrirEdicao(r)}>
            Editar
          </Button>
          <Popconfirm
            title="Excluir usuário"
            description={`Excluir ${r.display_name || r.username}? Esta ação não pode ser desfeita.`}
            onConfirm={() => void excluir(r)}
            okText="Excluir"
            okButtonProps={{ danger: true }}
            cancelText="Cancelar"
            disabled={r.id === atual?.id}
          >
            <Button size="small" danger disabled={r.id === atual?.id}>
              Excluir
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Topo
        titulo="Usuários"
        sub="Crie, edite, consulte e exclua os usuários do sistema"
        acoes={<Button type="primary" icon={<PlusOutlined />} onClick={abrirNovo}>Novo usuário</Button>}
      />
      <Conteudo>
        <Table
          rowKey="id"
          loading={carregando}
          dataSource={usuarios}
          columns={colunas}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
        />

        <Modal
          title={editando ? "Editar usuário" : "Novo usuário"}
          open={aberto}
          onCancel={() => setAberto(false)}
          onOk={() => void salvar()}
          okText={editando ? "Salvar" : "Criar"}
          cancelText="Cancelar"
          confirmLoading={salvando}
          destroyOnClose
        >
          <Form form={form} layout="vertical" requiredMark={false} style={{ marginTop: 16 }}>
            <Form.Item name="display_name" label="Nome de exibição" rules={[{ required: true, message: "Informe o nome" }]}>
              <Input placeholder="Ex.: Maria da Silva" />
            </Form.Item>
            <Form.Item name="username" label="Usuário (login)" rules={[{ required: true, message: "Informe o usuário" }]}>
              <Input placeholder="ex.: maria.silva ou email" autoComplete="off" />
            </Form.Item>
            <Form.Item
              name="password"
              label={editando ? "Nova senha (deixe em branco para manter)" : "Senha"}
              rules={editando ? [] : [{ required: true, message: "Defina uma senha" }, { min: 6, message: "Mínimo de 6 caracteres" }]}
            >
              <Input.Password placeholder="senha" autoComplete="new-password" />
            </Form.Item>
            <Form.Item name="role" label="Perfil" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: "cliente", label: "Cliente — acompanha consultas pelo portal" },
                  { value: "medico", label: "Dentista — agenda e prontuário" },
                  { value: "gestor", label: "Gestor — administração da clínica" },
                ]}
              />
            </Form.Item>
            <Form.Item name="active" label="Conta ativa" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Form>
        </Modal>
      </Conteudo>
    </>
  );
}
