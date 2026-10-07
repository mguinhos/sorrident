"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Switch, message } from "antd";
import Casca from "@/components/assistente/Casca";
import { AvisoChat, Bolha, MiniChat, QrCode } from "@/components/assistente/Miniaturas";
import { Celular3D, SeloFlutuante } from "@/components/assistente/Modelos3D";
import { Aviso, Botao, Campo, Escolha, Etiqueta, GrupoEscolha, Icone, MarcaCanal } from "@/components/ui";
import { api } from "@/lib/api";
import type { IntegrationStatus } from "@/lib/types";

const PASSOS = ["Escolher canal", "Conectar", "Testar", "Concluir"];
type Canal = "whatsapp" | "telegram";
type Teste = { ok: boolean; erro?: string } | null;

function Instrucao({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: 14, lineHeight: 1.45, color: "var(--cor-texto)" }}>
      <span style={{ width: 26, height: 26, borderRadius: 999, background: "var(--cor-primaria-suave)", color: "var(--cor-primaria)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{n}</span>
      <span style={{ paddingTop: 3 }}>{children}</span>
    </div>
  );
}

function TelaCamera() {
  const canto = (v: "top" | "bottom", h: "left" | "right") => (
    <span key={v + h} style={{ position: "absolute", [v]: 0, [h]: 0, width: 26, height: 26, [`border${v === "top" ? "Top" : "Bottom"}`]: "3px solid #fff", [`border${h === "left" ? "Left" : "Right"}`]: "3px solid #fff", [`border${v === "top" ? "Top" : "Bottom"}${h === "left" ? "Left" : "Right"}Radius`]: 10 }} />
  );
  return (
    <div style={{ width: "100%", height: "100%", background: "#0B141A", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ height: 14 }} />
      <div style={{ alignSelf: "stretch", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, color: "#fff", fontSize: 11, fontWeight: 700 }}>
        <Icone nome="esq" tam={14} cor="#fff" />
        Conectar um aparelho
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <div style={{ position: "relative", width: 150, height: 150, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {canto("top", "left")}{canto("top", "right")}{canto("bottom", "left")}{canto("bottom", "right")}
          <div style={{ padding: 8, background: "#fff", borderRadius: 6 }}><QrCode tam={110} /></div>
          <span style={{ position: "absolute", left: 12, right: 12, top: "58%", height: 2, background: "#25D366", boxShadow: "0 0 12px #25D366" }} />
        </div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,.85)", textAlign: "center", lineHeight: 1.4, padding: "0 20px" }}>Aponte o celular para o código na tela do computador</div>
      </div>
    </div>
  );
}

/** Integração do agente com WhatsApp e Telegram: escolher canal, conectar, testar e concluir. */
export default function ConfigCanais() {
  const router = useRouter();
  const [passo, setPasso] = useState(1);
  const [canal, setCanal] = useState<Canal>("whatsapp");
  const [apiOficial, setApiOficial] = useState(false);
  const [wa, setWa] = useState({ token: "", phone_number_id: "", verify_token: "" });
  const [botToken, setBotToken] = useState("");
  const [teste, setTeste] = useState<Teste>(null);
  const [status, setStatus] = useState<IntegrationStatus[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [avisarQueda, setAvisarQueda] = useState(true);

  const carregarStatus = () =>
    api.integrations().then((o) => setStatus(o.integrations.map((i) => i.status))).catch(() => setStatus([]));

  useEffect(() => {
    void carregarStatus();
  }, []);

  async function salvarConexao(): Promise<boolean> {
    setOcupado(true);
    try {
      if (canal === "telegram") {
        if (!botToken.trim()) {
          message.warning("Cole o token do bot para continuar.");
          return false;
        }
        await api.saveIntegration("telegram", { bot_token: botToken.trim() }, true);
      } else if (apiOficial) {
        if (!wa.token || !wa.phone_number_id) {
          message.warning("Informe o token de acesso e o Phone Number ID.");
          return false;
        }
        await api.saveIntegration("whatsapp", wa, true);
      }
      return true;
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Não foi possível salvar a conexão.");
      return false;
    } finally {
      setOcupado(false);
    }
  }

  async function testar() {
    setOcupado(true);
    try {
      setTeste((await api.testIntegration(canal)) as Teste);
    } catch (e) {
      setTeste({ ok: false, erro: e instanceof Error ? e.message : "Falha no teste." });
    } finally {
      setOcupado(false);
    }
  }

  const comum = {
    fluxo: "Conectar canais de mensagem",
    sub: "Leve o assistente para o WhatsApp e o Telegram",
    passos: PASSOS,
    atual: passo,
    carregando: ocupado,
    aoSair: () => router.push("/gestor/integracoes"),
    aoVoltar: passo > 1 ? () => setPasso(passo - 1) : undefined,
    aoProximo: async () => {
      if (passo === 2 && !(await salvarConexao())) return;
      if (passo === 2) {
        setTeste(null);
        void testar();
      }
      if (passo === 3) void carregarStatus();
      if (passo < PASSOS.length) setPasso(passo + 1);
      else router.push("/gestor/integracoes");
    },
  };

  if (passo === 1) {
    const tela = (
      <MiniChat nome="Clínica" sub="conta comercial" canal="whatsapp">
        <Bolha minha texto="Oi, vocês atendem sábado?" hora="08:02" />
        <Bolha texto="Oi! Atendemos sábado das 08h às 12h. Quer que eu veja um horário?" hora="08:02" />
      </MiniChat>
    );
    return (
      <Casca {...comum} titulo="Por qual canal os pacientes vão falar?" descricao="Escolha um canal para conectar agora. Você pode voltar e conectar o outro depois." previa={<Celular3D tela={tela} />} previaRotulo="Como o paciente vê">
        <GrupoEscolha>
          <Escolha titulo="WhatsApp" desc="Onde a maioria dos pacientes já conversa. Conecta pelo número da clínica." lateral={<MarcaCanal canal="whatsapp" />} selo="Mais usado" altura={88} ativo={canal === "whatsapp"} onClick={() => setCanal("whatsapp")} />
          <Escolha titulo="Telegram" desc="Gratuito e rápido de configurar com um robô (bot)." lateral={<MarcaCanal canal="telegram" />} altura={88} ativo={canal === "telegram"} onClick={() => setCanal("telegram")} />
        </GrupoEscolha>
        <div style={{ fontSize: 13, color: "var(--cor-suave)", display: "flex", alignItems: "center", gap: 8 }}>
          <Icone nome="chat" tam={16} />
          O chat do site da clínica já está ligado. Dá para conectar os dois canais, um de cada vez.
        </div>
        <Aviso icone="escudo">O assistente responde com as mesmas regras e horários em todos os canais.</Aviso>
      </Casca>
    );
  }

  if (passo === 2 && canal === "whatsapp") {
    return (
      <Casca {...comum} titulo="Conecte o WhatsApp da clínica" descricao="Leva menos de um minuto. O celular continua funcionando normalmente depois." previa={<Celular3D tela={<TelaCamera />} />} previaRotulo="No celular da clínica">
        {!apiOficial ? (
          <>
            <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
              <div className="sd-cartao" style={{ padding: 14, alignItems: "center", gap: 10, flexShrink: 0 }}>
                <QrCode tam={212} />
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--cor-suave)" }}><Icone nome="relogio" tam={14} />Novo código em 0:42</div>
              </div>
              <div style={{ flex: 1, minWidth: 240, display: "flex", flexDirection: "column", gap: 14 }}>
                <Instrucao n={1}>Abra o <b>WhatsApp Business</b> no celular da clínica</Instrucao>
                <Instrucao n={2}>Toque em <b>Mais opções</b> e depois em <b>Aparelhos conectados</b></Instrucao>
                <Instrucao n={3}>Toque em <b>Conectar um aparelho</b> e aponte a câmera para este código</Instrucao>
              </div>
            </div>
            <Aviso icone="alerta" tom="alerta">
              A conexão por QR code ainda não existe no backend (ele usa a API oficial do WhatsApp). Por enquanto, conecte pela API oficial abaixo.
            </Aviso>
          </>
        ) : (
          <>
            <Campo rotulo="Token de acesso" id="wa-token" ajuda="Gerado no painel da Meta for Developers. Guardado no cofre de segredos.">
              <Input.Password id="wa-token" size="large" value={wa.token} onChange={(e) => setWa({ ...wa, token: e.target.value })} style={{ fontFamily: "var(--fonte-mono)" }} />
            </Campo>
            <div style={{ display: "flex", gap: 14 }}>
              <Campo rotulo="Phone Number ID" id="wa-id" style={{ flex: 1 }}>
                <Input id="wa-id" size="large" value={wa.phone_number_id} onChange={(e) => setWa({ ...wa, phone_number_id: e.target.value })} />
              </Campo>
              <Campo rotulo="Verify token do webhook" id="wa-verify" style={{ flex: 1 }}>
                <Input id="wa-verify" size="large" value={wa.verify_token} onChange={(e) => setWa({ ...wa, verify_token: e.target.value })} />
              </Campo>
            </div>
          </>
        )}
        <div className="sd-opcao" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{apiOficial ? "Prefere o QR code?" : "Usa a API oficial do WhatsApp (Meta)?"}</div>
            <div style={{ fontSize: 12.5, color: "var(--cor-suave)" }}>{apiOficial ? "Volte para as instruções do celular." : "Conecte com token de acesso e Phone Number ID."}</div>
          </div>
          <Botao tipo="secundario" icone={apiOficial ? "qr" : "chave"} style={{ height: 44 }} onClick={() => setApiOficial(!apiOficial)}>
            {apiOficial ? "Ver QR code" : "Usar API oficial"}
          </Botao>
        </div>
      </Casca>
    );
  }

  if (passo === 2) {
    const tela = (
      <MiniChat nome="BotFather" sub="bot" canal="telegram">
        <Bolha minha texto="/newbot" hora="11:20" />
        <Bolha texto={<>Pronto! Seu bot foi criado. Use este token:<br /><span style={{ fontFamily: "var(--fonte-mono)", fontSize: 9, color: "#0058AB" }}>7402918536:AAH…Xq4</span></>} hora="11:20" />
      </MiniChat>
    );
    return (
      <Casca {...comum} titulo="Conecte o bot do Telegram" descricao="O Telegram usa um robô (bot) próprio da clínica. Você cria em 1 minuto pelo BotFather." previa={<Celular3D tela={tela} />} previaRotulo="No Telegram">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Instrucao n={1}>No Telegram, procure <b>@BotFather</b> e abra a conversa</Instrucao>
          <Instrucao n={2}>Envie <b>/newbot</b> e escolha um nome, por exemplo <b>Sorri da Clínica</b></Instrucao>
          <Instrucao n={3}>Copie o <b>token</b> que ele enviar e cole abaixo</Instrucao>
        </div>
        <Campo rotulo="Token do bot" id="bot" ajuda="O token fica guardado no cofre de segredos. Nunca compartilhe com ninguém.">
          <Input.Password id="bot" size="large" autoFocus prefix={<Icone nome="chave" tam={18} cor="var(--cor-sutil)" />} value={botToken} onChange={(e) => setBotToken(e.target.value)} placeholder="1234567890:AA…" style={{ fontFamily: "var(--fonte-mono)" }} />
        </Campo>
      </Casca>
    );
  }

  if (passo === 3) {
    const nomeCanal = canal === "whatsapp" ? "WhatsApp" : "Telegram";
    const tela = (
      <MiniChat nome="Clínica" sub={canal === "whatsapp" ? "conta comercial" : "bot"} canal={canal}>
        <Bolha texto="Teste do SorriDente: responda com qualquer mensagem." hora="14:05" />
        <Bolha minha texto="Oi, testando!" hora="14:05" />
        <Bolha texto="Oi! Aqui é o Sorri, da clínica. Está tudo funcionando por aqui." hora="14:05" />
      </MiniChat>
    );
    const linha = (texto: string, det: string, ok: boolean | null) => (
      <div style={{ minHeight: 52, display: "flex", alignItems: "center", gap: 12, padding: "6px 0", borderTop: "1px solid var(--cor-divisoria)" }}>
        <span className={`sd-tom-${ok === null ? "alerta" : ok ? "ok" : "erro"}`} style={{ width: 28, height: 28, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icone nome={ok === null ? "relogio" : ok ? "check" : "fechar"} tam={15} esp={2.4} />
        </span>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{texto}</div>
        <div style={{ fontSize: 13, color: "var(--cor-suave)" }}>{det}</div>
      </div>
    );
    return (
      <Casca {...comum} titulo="Vamos testar a conexão" descricao="O SorriDente verifica as credenciais com o serviço do canal. Depois, mande uma mensagem do seu celular para conferir a resposta." previa={<Celular3D tela={tela} />} previaRotulo="Seu celular">
        <div style={{ display: "flex", flexDirection: "column", border: "1px solid var(--cor-borda)", borderRadius: 14, padding: "4px 16px" }}>
          <div className="sd-maiusc" style={{ padding: "10px 0 8px" }}>Resultado do teste</div>
          {linha(`${nomeCanal} configurado`, canal === "whatsapp" && !apiOficial ? "conexão por QR indisponível" : "credenciais salvas", canal === "telegram" || apiOficial ? true : null)}
          {linha("Conexão com o serviço", teste === null ? "testando…" : teste.ok ? "ok" : teste.erro ?? "falhou", teste === null ? null : teste.ok)}
          {canal === "whatsapp" && linha("Templates de lembrete", "aguardando aprovação da Meta", null)}
        </div>
        <Botao tipo="secundario" icone="enviar" style={{ alignSelf: "flex-start", height: 44 }} loading={ocupado} onClick={() => void testar()}>Testar de novo</Botao>
        {canal === "whatsapp" && (
          <Aviso icone="relogio" tom="alerta">Os lembretes automáticos começam assim que a Meta aprovar os modelos de mensagem (costuma levar até 24 h). O atendimento já funciona.</Aviso>
        )}
      </Casca>
    );
  }

  const st = (k: string) => status.find((s) => s.key === k);
  const linhaCanal = (lateral: React.ReactNode, nome: string, det: string, ativo: boolean) => (
    <div style={{ minHeight: 72, display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 14, border: "1px solid var(--cor-borda)" }}>
      {lateral}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{nome}</div>
        <div style={{ fontSize: 13, color: "var(--cor-suave)" }}>{det}</div>
      </div>
      <Etiqueta texto={ativo ? "Ativo" : "Não configurado"} tom={ativo ? "ok" : "neutro"} />
    </div>
  );
  const nAtivos = 1 + (st("whatsapp")?.enabled ? 1 : 0) + (st("telegram")?.enabled ? 1 : 0);
  const tela = (
    <MiniChat nome="Clínica" sub="bot" canal="telegram">
      <Bolha texto="Oi! Aqui é o Sorri, da clínica. Como posso ajudar?" hora="14:06" />
      <AvisoChat texto="Canal ativo" tom="ok" icone="check" />
    </MiniChat>
  );
  return (
    <Casca {...comum} titulo="Canais conectados!" descricao="A partir de agora o assistente responde os pacientes nesses canais, com as mesmas regras." previa={<Celular3D tela={tela} selo={<SeloFlutuante texto={`${nAtivos} ${nAtivos === 1 ? "canal ativo" : "canais ativos"}`} />} />} previaRotulo="Tudo no ar">
      {linhaCanal(<MarcaCanal canal="whatsapp" />, "WhatsApp", st("whatsapp")?.detail || "Meta Cloud API", !!st("whatsapp")?.enabled)}
      {linhaCanal(<MarcaCanal canal="telegram" />, "Telegram", st("telegram")?.detail || "Bot do Telegram", !!st("telegram")?.enabled)}
      {linhaCanal(<span className="sd-escolha-icone" style={{ width: 48, height: 48 }}><Icone nome="chat" tam={24} /></span>, "Chat do site", "Área do paciente", true)}
      <div className="sd-opcao">
        <div className="sd-opcao-icone"><Icone nome="sino" tam={18} /></div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Avisar a recepção se um canal cair</div>
          <div style={{ fontSize: 12.5, color: "var(--cor-suave)" }}>Alerta no sino de notificações da equipe</div>
        </div>
        <Switch checked={avisarQueda} onChange={setAvisarQueda} aria-label="Avisar a recepção se um canal cair" />
      </div>
    </Casca>
  );
}
