"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button, Input, Switch, message } from "antd";
import Casca from "@/components/assistente/Casca";
import { MiniQuiosque } from "@/components/assistente/Miniaturas";
import { SeloFlutuante, Totem3D } from "@/components/assistente/Modelos3D";
import Resumo from "@/components/assistente/Resumo";
import { Botao, Campo, Escolha, GrupoEscolha, Icone, Opcao } from "@/components/ui";
import { api } from "@/lib/api";
import { CONFIG_PADRAO, CORES_QUIOSQUE, gravarConfigQuiosque, lerConfigQuiosque, type ConfigQuiosque } from "@/lib/senhas";

const PASSOS = ["Boas-vindas", "Dados da clínica", "Aparência do quiosque", "Tipos de atendimento", "Concluir"];

function ItemLista({ icone, titulo, desc }: { icone: string; titulo: string; desc: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 14, border: "1px solid var(--cor-borda)", minHeight: 64 }}>
      <div className="sd-escolha-icone"><Icone nome={icone} tam={20} /></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{titulo}</div>
        <div style={{ fontSize: 13, color: "var(--cor-suave)" }}>{desc}</div>
      </div>
    </div>
  );
}

/** Primeiro acesso + configuração do quiosque, com totem 3D ao vivo. */
export default function PrimeiroAcesso() {
  const router = useRouter();
  const [passo, setPasso] = useState(1);
  const [cfg, setCfg] = useState<ConfigQuiosque>(CONFIG_PADRAO);
  const [clinica, setClinica] = useState({ nome: "", cnpj: "", telefone: "", endereco: "" });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setCfg(lerConfigQuiosque());
    api.getSettings()
      .then((s) => setClinica((c) => ({ ...c, nome: s.clinic_name, telefone: s.phone, endereco: s.address })))
      .catch(() => undefined);
  }, []);

  const [c1, c2, nomeCor] = CORES_QUIOSQUE[cfg.cor];
  const ativos = cfg.tipos.filter((t) => t.ativo);
  const nomeExibido = clinica.nome || cfg.clinica;
  const tela = <MiniQuiosque nome={nomeExibido} saudacao={cfg.mensagem} tipos={ativos} cor={c1} cor2={c2} retrato={cfg.retrato} logo={cfg.mostrarLogo} />;

  async function concluir() {
    setSalvando(true);
    try {
      gravarConfigQuiosque({ ...cfg, clinica: nomeExibido });
      await api.updateSettings({ clinic_name: clinica.nome, phone: clinica.telefone, address: clinica.endereco });
      message.success("Clínica e quiosque configurados.");
      router.push("/gestor");
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Não foi possível salvar os dados da clínica.");
    } finally {
      setSalvando(false);
    }
  }

  const comum = {
    fluxo: "Primeiro acesso",
    sub: "Vamos deixar a clínica e o quiosque prontos",
    passos: PASSOS,
    atual: passo,
    aoSair: () => {
      gravarConfigQuiosque({ ...cfg, clinica: nomeExibido });
      router.push("/gestor/configuracoes");
    },
    aoVoltar: passo > 1 ? () => setPasso(passo - 1) : undefined,
    aoProximo: () => (passo < PASSOS.length ? setPasso(passo + 1) : void concluir()),
    carregando: salvando,
  };

  if (passo === 1) {
    return (
      <Casca
        {...comum}
        titulo="Boas-vindas ao SorriDente!"
        descricao="Em poucos passos você configura a clínica e o quiosque onde o paciente retira a senha ao chegar. É isto que vamos fazer:"
        previa={<Totem3D tela={tela} />}
        previaRotulo="Quiosque de senha"
        textoProximo="Começar"
        extraRodape={<Button type="text" size="large" onClick={() => router.push("/gestor")} style={{ minWidth: 120, height: 48, color: "var(--cor-suave)" }}>Pular por agora</Button>}
      >
        <ItemLista icone="predio" titulo="Dados da clínica" desc="Nome, telefone e endereço que o paciente vê" />
        <ItemLista icone="paleta" titulo="Aparência do quiosque" desc="Cores, mensagem e orientação da tela" />
        <ItemLista icone="lista" titulo="Tipos de atendimento" desc="Os botões que o paciente toca para pegar a senha" />
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--cor-suave)", marginTop: 4 }}>
          <Icone nome="relogio" tam={16} />
          Leva cerca de 3 minutos. Dá para mudar tudo depois em Configurações.
        </div>
      </Casca>
    );
  }

  if (passo === 2) {
    return (
      <Casca {...comum} titulo="Dados da clínica" descricao="Essas informações aparecem para o paciente no quiosque, no chat e nos lembretes." previa={<Totem3D tela={tela} />} previaRotulo="Quiosque com o nome da clínica">
        <Campo rotulo="Nome da clínica" id="clinica" ajuda="Aparece no topo do quiosque e nas mensagens.">
          <Input id="clinica" size="large" autoFocus prefix={<Icone nome="predio" tam={18} cor="var(--cor-sutil)" />} value={clinica.nome} onChange={(e) => setClinica({ ...clinica, nome: e.target.value })} placeholder="Clínica Sorriso Boa Vista" />
        </Campo>
        <div style={{ display: "flex", gap: 14 }}>
          <Campo rotulo="CNPJ" id="cnpj" style={{ flex: 1 }}>
            <Input id="cnpj" size="large" value={clinica.cnpj} onChange={(e) => setClinica({ ...clinica, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
          </Campo>
          <Campo rotulo="Telefone / WhatsApp" id="tel" style={{ flex: 1 }}>
            <Input id="tel" size="large" prefix={<Icone nome="telefone" tam={18} cor="var(--cor-sutil)" />} value={clinica.telefone} onChange={(e) => setClinica({ ...clinica, telefone: e.target.value })} />
          </Campo>
        </div>
        <Campo rotulo="Endereço" id="end">
          <Input id="end" size="large" value={clinica.endereco} onChange={(e) => setClinica({ ...clinica, endereco: e.target.value })} />
        </Campo>
        <Campo rotulo="Logotipo">
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderRadius: 12, border: "1.5px dashed #c9d6e6", background: "#fafcff" }}>
            <div style={{ width: 44, height: 44, borderRadius: 999, background: "#fff", border: "1px solid var(--cor-borda)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Image src="/logo.svg" alt="" width={34} height={34} />
            </div>
            <div style={{ flex: 1, fontSize: 13, color: "var(--cor-suave)" }}>Usando o logotipo padrão do SorriDente</div>
            <Botao tipo="secundario" icone="subir" style={{ height: 44 }} onClick={() => message.info("O envio de logotipo próprio ainda não está disponível na API.")}>Trocar</Botao>
          </div>
        </Campo>
      </Casca>
    );
  }

  if (passo === 3) {
    return (
      <Casca {...comum} titulo="Aparência do quiosque" descricao="Escolha como a tela de senha vai ficar. A prévia ao lado muda na hora." previa={<Totem3D tela={tela} />} previaRotulo="Prévia ao vivo">
        <GrupoEscolha rotulo="Cor do topo" linha>
          {(Object.keys(CORES_QUIOSQUE) as ConfigQuiosque["cor"][]).map((k) => {
            const [a, b, nome] = CORES_QUIOSQUE[k];
            const on = cfg.cor === k;
            return (
              <button key={k} type="button" role="radio" aria-checked={on} onClick={() => setCfg({ ...cfg, cor: k })} className="sd-escolha" style={{ flex: 1, flexDirection: "column", alignItems: "stretch", gap: 8, padding: 10, minHeight: 0, position: "relative" }}>
                {on && <span style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: 999, background: "var(--cor-primaria)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icone nome="check" tam={13} cor="#fff" esp={2.6} /></span>}
                <span style={{ height: 44, borderRadius: 9, background: `linear-gradient(135deg, ${a}, ${b})` }} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{nome}</span>
              </button>
            );
          })}
        </GrupoEscolha>
        <Campo rotulo="Mensagem de boas-vindas" id="msg" ajuda="Curta e direta: o paciente lê em pé, a um passo da tela.">
          <Input id="msg" size="large" maxLength={60} value={cfg.mensagem} onChange={(e) => setCfg({ ...cfg, mensagem: e.target.value })} />
        </Campo>
        <GrupoEscolha rotulo="Orientação da tela" linha>
          <div style={{ flex: 1 }}><Escolha titulo="Retrato" desc="Totem ou tablet em pé" icone="tv" ativo={cfg.retrato} altura={64} onClick={() => setCfg({ ...cfg, retrato: true })} /></div>
          <div style={{ flex: 1 }}><Escolha titulo="Paisagem" desc="Tablet deitado no balcão" icone="tv" ativo={!cfg.retrato} altura={64} onClick={() => setCfg({ ...cfg, retrato: false })} /></div>
        </GrupoEscolha>
        <Opcao titulo="Mostrar o logotipo" desc="Exibe o logotipo ao lado do nome da clínica" icone="imagem" ligado={cfg.mostrarLogo} onChange={(v) => setCfg({ ...cfg, mostrarLogo: v })} />
      </Casca>
    );
  }

  if (passo === 4) {
    return (
      <Casca {...comum} titulo="Tipos de atendimento" descricao="Cada tipo ligado vira um botão grande no quiosque. Desligue o que a clínica não oferece." previa={<Totem3D tela={tela} />} previaRotulo={`${ativos.length} botões no quiosque`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {cfg.tipos.map((t, i) => {
            const [bg, fg] = t.prioridade ? ["var(--cor-erro-fundo)", "var(--cor-erro-forte)"] : ["var(--cor-primaria-suave)", "var(--cor-primaria)"];
            return (
              <div key={t.sigla} className="sd-opcao" style={{ opacity: t.ativo ? 1 : 0.6, padding: "8px 14px" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icone nome={t.icone} tam={18} /></div>
                <div style={{ width: 44, fontSize: 13, fontWeight: 700, color: fg, letterSpacing: ".04em" }}>{t.sigla}</div>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                    {t.nome}
                    {t.prioridade && <span className="sd-etiqueta sd-tom-erro" style={{ fontSize: 11 }}>Prioridade</span>}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--cor-suave)" }}>{t.desc}{t.prioridade && " · passa na frente"}</div>
                </div>
                <Switch checked={t.ativo} aria-label={t.nome} onChange={(v) => setCfg({ ...cfg, tipos: cfg.tipos.map((x, j) => (j === i ? { ...x, ativo: v } : x)) })} />
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Botao tipo="suave" icone="mais" style={{ height: 44 }} onClick={() => message.info("Novos tipos de atendimento chegam com o cadastro de serviços da API.")}>Adicionar tipo</Botao>
          <div style={{ fontSize: 12.5, color: "var(--cor-suave)" }}>A sigla vira o começo da senha: AV01, MA02…</div>
        </div>
      </Casca>
    );
  }

  return (
    <Casca
      {...comum}
      titulo="Pronto! Confira e conclua"
      descricao="Ao concluir, o quiosque já pode entregar senhas e você vai para o painel da clínica."
      previa={<Totem3D tela={tela} selo={<SeloFlutuante texto="Quiosque pronto" />} />}
      previaRotulo="Quiosque configurado"
    >
      <div className="sd-tom-ok" style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, borderRadius: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 999, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icone nome="ok" tam={26} esp={2} /></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, color: "var(--cor-tinta)" }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Tudo pronto para abrir as portas</div>
          <div style={{ fontSize: 13, color: "var(--cor-texto)" }}>Confira o resumo. Você pode alterar qualquer item agora ou depois.</div>
        </div>
      </div>
      <Resumo
        itens={[
          ["Clínica", nomeExibido, 2],
          ["Quiosque", `${cfg.retrato ? "Retrato" : "Paisagem"} · ${nomeCor}${cfg.mostrarLogo ? " · com logotipo" : ""}`, 3],
          ["Mensagem", cfg.mensagem, 3],
          ["Atendimentos", `${ativos.length} tipos${ativos.some((t) => t.prioridade) ? " · Urgência com prioridade" : ""}`, 4],
        ]}
        irPara={setPasso}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 14, border: "1px solid var(--cor-borda)" }}>
        <div className="sd-escolha-icone"><Icone nome="link" tam={20} /></div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Abra no tablet do quiosque</div>
          <div style={{ fontSize: 13, color: "var(--cor-suave)", fontFamily: "var(--fonte-mono)" }}>/quiosque</div>
        </div>
        <Botao tipo="secundario" icone="copiar" style={{ height: 44 }} onClick={() => { void navigator.clipboard?.writeText(`${window.location.origin}/quiosque`); message.success("Link copiado."); }}>Copiar link</Botao>
      </div>
    </Casca>
  );
}
