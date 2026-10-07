"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ColorPicker, Form, Input, Select, message } from "antd";
import Topo, { Conteudo } from "@/components/layout/Topo";
import { Avatar, Aviso, Botao, Cartao, Etiqueta } from "@/components/ui";
import { api } from "@/lib/api";
import type { Dentist } from "@/lib/types";

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const EXPEDIENTE = [["08:00", "12:00"], ["13:00", "18:00"]];

interface Valores {
  name: string;
  cpf?: string;
  nascimento?: string;
  phone: string;
  email: string;
  cro: string;
  specialty: string;
  color: string;
  usuario?: string;
  perfil?: string;
  senha?: string;
}

/** Cadastro do odontologista: dados pessoais, profissionais e dias de atendimento (grava na API). */
export default function CadastroOdontologista() {
  const { id } = useParams<{ id: string }>();
  const novo = id === "novo";
  const router = useRouter();
  const [form] = Form.useForm<Valores>();
  const [dias, setDias] = useState<number[]>([0, 1, 3]);
  const [salvando, setSalvando] = useState(false);
  const [atual, setAtual] = useState<Dentist | null>(null);
  const nomeDigitado = Form.useWatch("name", form);
  const nome = nomeDigitado || "Novo profissional";
  const especialidade = Form.useWatch("specialty", form);
  const cro = Form.useWatch("cro", form);
  const cor = Form.useWatch("color", form) || "#0065C4";

  useEffect(() => {
    if (novo) return;
    api.listDentists().then((ds) => {
      const d = ds.find((x) => x.id === id);
      if (!d) return;
      setAtual(d);
      form.setFieldsValue({ name: d.name, phone: d.phone, email: d.email, cro: d.cro, specialty: d.specialty, color: d.color });
      setDias(Object.keys(d.availability ?? {}).map(Number));
    }).catch(() => undefined);
  }, [id, novo, form]);

  async function salvar() {
    const v = await form.validateFields();
    const corHex = typeof v.color === "string" ? v.color : "#0065C4";
    const dados: Partial<Dentist> = {
      name: v.name, phone: v.phone ?? "", email: v.email ?? "", cro: v.cro, specialty: v.specialty ?? "", color: corHex,
      availability: Object.fromEntries(dias.map((d) => [String(d), EXPEDIENTE])),
    };
    setSalvando(true);
    try {
      if (novo) await api.createDentist(dados);
      else await api.updateDentist(id, dados);
      message.success("Cadastro salvo.");
      router.push("/gestor/equipe");
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  const grade3 = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "0 14px" } as const;

  return (
    <>
      <Topo
        titulo="Cadastro do odontologista"
        migalha={["Equipe e serviços", "Profissionais"]}
        acoes={
          <>
            <Botao tipo="secundario" href="/gestor/equipe">Cancelar</Botao>
            <Botao icone="check" loading={salvando} onClick={() => void salvar()}>Salvar cadastro</Botao>
          </>
        }
      />
      <Conteudo gap={16}>
        <div className="sd-form">
        <Form form={form} layout="vertical" requiredMark={false} initialValues={{ color: "#0065C4", perfil: "medico" }} component={false}>
          <div className="sd-linha sd-linha-quebra" style={{ gap: 16, alignItems: "flex-start" }}>
            <div className="sd-coluna" style={{ flex: 1, gap: 16 }}>
              <Cartao pad={22} gap={4} titulo={<span style={{ fontSize: 15 }}>Dados pessoais</span>}>
                <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: "0 14px", marginTop: 10 }}>
                  <Form.Item name="name" label={<b>Nome completo</b>} rules={[{ required: true, message: "Informe o nome" }]}><Input size="large" /></Form.Item>
                  <Form.Item name="cpf" label={<b>CPF</b>}><Input size="large" placeholder="000.000.000-00" /></Form.Item>
                </div>
                <div style={grade3}>
                  <Form.Item name="nascimento" label={<b>Data de nascimento</b>}><Input size="large" placeholder="dd/mm/aaaa" /></Form.Item>
                  <Form.Item name="phone" label={<b>Telefone</b>}><Input size="large" /></Form.Item>
                  <Form.Item name="email" label={<b>E-mail</b>} rules={[{ type: "email", message: "E-mail inválido" }]}><Input size="large" /></Form.Item>
                </div>
              </Cartao>

              <Cartao pad={22} gap={4} titulo={<span style={{ fontSize: 15 }}>Dados profissionais</span>}>
                <div style={{ ...grade3, marginTop: 10 }}>
                  <Form.Item name="cro" label={<b>CRO</b>} rules={[{ required: true, message: "Informe o CRO" }]}><Input size="large" /></Form.Item>
                  <Form.Item name="specialty" label={<b>Especialidade</b>}><Input size="large" /></Form.Item>
                  <Form.Item name="color" label={<b>Cor na agenda</b>} getValueFromEvent={(c) => c.toHexString().toUpperCase()}>
                    <ColorPicker showText size="large" disabledAlpha />
                  </Form.Item>
                </div>
                <div className="sd-campo-rotulo" style={{ marginBottom: 8 }}>Dias de atendimento</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} role="group" aria-label="Dias de atendimento">
                  {DIAS.map((d, i) => {
                    const on = dias.includes(i);
                    return (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setDias(on ? dias.filter((x) => x !== i) : [...dias, i].sort())}
                        style={{ font: "inherit", height: 36, minWidth: 52, padding: "0 14px", borderRadius: 999, border: 0, cursor: "pointer", fontSize: 13, fontWeight: 600, ...(on ? { background: "var(--cor-primaria)", color: "#fff" } : { background: "var(--cor-neutro-fundo)", color: "var(--cor-suave)" }) }}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
                <div className="sd-campo-ajuda" style={{ marginTop: 8 }}>Expediente padrão: 08h–12h e 13h–18h.</div>
              </Cartao>

              <Cartao pad={22} gap={4} titulo={<span style={{ fontSize: 15 }}>Acesso ao sistema</span>}>
                <div style={{ ...grade3, marginTop: 10 }}>
                  <Form.Item name="usuario" label={<b>Usuário</b>}><Input size="large" placeholder="nome.sobrenome" /></Form.Item>
                  <Form.Item name="perfil" label={<b>Perfil</b>}>
                    <Select size="large" options={[{ value: "medico", label: "Médico(a)" }, { value: "gestor", label: "Gestor" }]} />
                  </Form.Item>
                  <Form.Item name="senha" label={<b>Senha inicial</b>}><Input.Password size="large" /></Form.Item>
                </div>
                <Aviso icone="cadeado">A criação do login pela tela depende de um endpoint de usuários que a API ainda não oferece.</Aviso>
              </Cartao>
            </div>

            <div className="sd-coluna" style={{ width: 400, maxWidth: "100%", flexShrink: 0, gap: 16 }}>
              <Cartao pad={24} gap={8} style={{ alignItems: "center", textAlign: "center" }}>
                <Avatar nome={nomeDigitado || "?"} tam={96} fundo={cor} cor="#fff" />
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 8 }}>{nome}</div>
                <div style={{ fontSize: 13, color: "var(--cor-suave)" }}>{[especialidade, cro].filter(Boolean).join(" · ") || "Especialidade · CRO"}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <Etiqueta texto={atual && !atual.active ? "inativo" : "ativo"} tom={atual && !atual.active ? "neutro" : "ok"} />
                  <Etiqueta texto={dias.length ? "agenda aberta" : "sem agenda"} tom="neutro" />
                </div>
              </Cartao>
              <Cartao pad={22} gap={10} titulo={<span style={{ fontSize: 15 }}>Resumo da agenda</span>}>
                {[["Dias por semana", String(dias.length)], ["Duração média", "40 min"], ["Horas semanais", `${dias.length * 9} h`]].map(([r, v]) => (
                  <div key={r} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "var(--cor-suave)" }}>{r}</span>
                    <b>{v}</b>
                  </div>
                ))}
              </Cartao>
            </div>
          </div>
        </Form>
        </div>
      </Conteudo>
    </>
  );
}
