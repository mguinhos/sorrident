"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Slider, message } from "antd";
import Casca from "@/components/assistente/Casca";
import { MiniPainel } from "@/components/assistente/Miniaturas";
import { SeloFlutuante, TV3D } from "@/components/assistente/Modelos3D";
import { Aviso, Botao, Campo, Escolha, GrupoEscolha, Icone, Opcao } from "@/components/ui";
import { PAINEL_PADRAO, chamarProxima, gravarConfigPainel, lerConfigPainel, type ConfigPainel } from "@/lib/senhas";
import { falarSenha, tocarAviso } from "@/lib/som";

const PASSOS = ["Tela e local", "O que mostrar", "Som da chamada", "Concluir"];

/** Configuração do painel de senha da sala de espera, com a TV 3D mostrando o painel. */
export default function ConfigPainelSenha() {
  const router = useRouter();
  const [passo, setPasso] = useState(1);
  const [cfg, setCfg] = useState<ConfigPainel>(PAINEL_PADRAO);
  const [origem, setOrigem] = useState("");

  useEffect(() => {
    setCfg(lerConfigPainel());
    setOrigem(window.location.origin);
  }, []);

  const muda = (p: Partial<ConfigPainel>) => setCfg({ ...cfg, ...p });
  const tela = <MiniPainel op={{ nome: cfg.mostrarNome, ultimas: cfg.mostrarUltimas, proximas: cfg.mostrarProximas, relogio: cfg.mostrarRelogio }} />;
  const ouvir = () => {
    tocarAviso(cfg.aviso, cfg.volume / 100);
    if (cfg.voz) setTimeout(() => falarSenha("A12", "guichê 1", cfg.volume / 100), 900);
  };

  const comum = {
    fluxo: "Configuração do painel de senha",
    sub: "A TV da sala de espera que chama os pacientes",
    passos: PASSOS,
    atual: passo,
    aoSair: () => {
      gravarConfigPainel(cfg);
      router.push("/gestor/configuracoes");
    },
    aoVoltar: passo > 1 ? () => setPasso(passo - 1) : undefined,
    aoProximo: () => {
      if (passo < PASSOS.length) return setPasso(passo + 1);
      gravarConfigPainel(cfg);
      message.success("Painel de senha configurado.");
      router.push("/gestor/configuracoes");
    },
  };

  if (passo === 1) {
    return (
      <Casca {...comum} titulo="Qual tela e onde ela fica" descricao="Diga como é a TV da sala de espera. O SorriDente ajusta o painel ao formato da tela." previa={<TV3D tela={tela} />} previaRotulo="TV da sala de espera">
        <Campo rotulo="Nome deste painel" id="local" ajuda="Ajuda a reconhecer o painel se a clínica tiver mais de uma TV.">
          <Input id="local" size="large" autoFocus prefix={<Icone nome="tv" tam={18} cor="var(--cor-sutil)" />} value={cfg.nomeLocal} onChange={(e) => muda({ nomeLocal: e.target.value })} />
        </Campo>
        <GrupoEscolha rotulo="Tipo de tela">
          <Escolha titulo="TV deitada (16:9)" desc="O mais comum. Senha grande à esquerda, histórico à direita" icone="tv" selo="Recomendado" ativo={cfg.formato === "tv"} onClick={() => muda({ formato: "tv" })} />
          <Escolha titulo="Monitor em pé (9:16)" desc="Para corredores estreitos ou ao lado do balcão" icone="tv" ativo={cfg.formato === "retrato"} onClick={() => muda({ formato: "retrato" })} />
        </GrupoEscolha>
        <GrupoEscolha rotulo="Chamar senhas de" linha>
          <div style={{ flex: 1 }}><Escolha titulo="Toda a clínica" desc="Guichês e consultórios" icone="predio" altura={64} ativo={cfg.escopo === "clinica"} onClick={() => muda({ escopo: "clinica" })} /></div>
          <div style={{ flex: 1 }}><Escolha titulo="Só alguns locais" desc="Escolha na lista" icone="lista" altura={64} ativo={cfg.escopo === "locais"} onClick={() => muda({ escopo: "locais" })} /></div>
        </GrupoEscolha>
      </Casca>
    );
  }

  if (passo === 2) {
    return (
      <Casca {...comum} titulo="O que aparece na TV" descricao="Ligue só o que ajuda o paciente. Menos informação = leitura mais rápida de longe." previa={<TV3D tela={tela} />} previaRotulo="Prévia ao vivo">
        <Opcao titulo="Nome do paciente" desc="Mostra só o primeiro nome e a inicial: “Mariana C.”" icone="pessoas" ligado={cfg.mostrarNome} onChange={(v) => muda({ mostrarNome: v })} />
        <Opcao titulo="Para onde ir" desc="Guichê ou consultório em destaque, com seta" icone="seta" ligado travado />
        <Opcao titulo="Últimas chamadas" desc="Lista ao lado para quem se distraiu" icone="lista" ligado={cfg.mostrarUltimas} onChange={(v) => muda({ mostrarUltimas: v })} />
        <Opcao titulo="Próximas senhas" desc="Faixa embaixo com as 3 próximas" icone="relogio" ligado={cfg.mostrarProximas} onChange={(v) => muda({ mostrarProximas: v })} />
        <Opcao titulo="Data e hora" desc="Relógio no canto superior" icone="agenda" ligado={cfg.mostrarRelogio} onChange={(v) => muda({ mostrarRelogio: v })} />
        <Aviso icone="cadeado">Para proteger a privacidade, o painel nunca mostra sobrenome completo, telefone ou procedimento detalhado.</Aviso>
      </Casca>
    );
  }

  if (passo === 3) {
    return (
      <Casca {...comum} titulo="Como a chamada soa" descricao="Um som curto chama a atenção sem assustar. A voz é opcional e ajuda na acessibilidade." previa={<TV3D tela={tela} selo={<SeloFlutuante texto="Chamando A12 · Guichê 1" icone="som" tom="info" />} />} previaRotulo="Chamada em andamento">
        <GrupoEscolha rotulo="Aviso sonoro">
          <Escolha titulo="Campainha suave" desc="Dois toques curtos, discretos" icone="sino" selo="Recomendado" altura={64} ativo={cfg.aviso === "campainha"} onClick={() => muda({ aviso: "campainha" })} />
          <Escolha titulo="Gongo" desc="Mais alto, para salas grandes ou barulhentas" icone="megafone" altura={64} ativo={cfg.aviso === "gongo"} onClick={() => muda({ aviso: "gongo" })} />
          <Escolha titulo="Sem som" desc="Só a tela pisca ao chamar" icone="tv" altura={64} ativo={cfg.aviso === "nenhum"} onClick={() => muda({ aviso: "nenhum" })} />
        </GrupoEscolha>
        <Campo rotulo="Volume">
          <div style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 48 }}>
            <Icone nome="som" tam={20} cor="var(--cor-suave)" />
            <Slider style={{ flex: 1 }} min={0} max={100} value={cfg.volume} onChange={(v) => muda({ volume: v })} aria-label="Volume" />
            <div className="sd-num" style={{ width: 44, textAlign: "right", fontSize: 14, fontWeight: 600 }}>{cfg.volume}%</div>
          </div>
        </Campo>
        <Opcao
          titulo="Voz lê a senha em voz alta"
          desc="“Senha A 12, guichê 1.” Ajuda quem tem baixa visão"
          icone="som"
          ligado={cfg.voz}
          onChange={(v) => muda({ voz: v })}
          extra={<Botao tipo="secundario" icone="som" style={{ height: 44, marginRight: 8 }} onClick={ouvir}>Ouvir</Botao>}
        />
      </Casca>
    );
  }

  const endereco = `${origem}/painel`;
  return (
    <Casca {...comum} titulo="Ligue o painel na TV" descricao="Use o navegador da própria TV (ou de um computador ligado nela). Não precisa instalar nada." previa={<TV3D tela={tela} selo={<SeloFlutuante texto="Painel pronto" />} />} previaRotulo="Painel no ar">
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 20, borderRadius: 14, background: "var(--cor-primaria-suave)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 700 }}>
          <span style={{ width: 26, height: 26, borderRadius: 999, background: "var(--cor-primaria)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>1</span>
          No navegador da TV, abra o endereço
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, height: 48, borderRadius: 12, background: "#fff", border: "1px solid var(--cor-borda)", display: "flex", alignItems: "center", padding: "0 14px", fontSize: 16, fontWeight: 600, fontFamily: "var(--fonte-mono)", overflow: "hidden", whiteSpace: "nowrap" }}>{endereco}</div>
          <Botao tipo="secundario" icone="copiar" style={{ height: 48 }} onClick={() => { void navigator.clipboard?.writeText(endereco); message.success("Endereço copiado."); }}>Copiar</Botao>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 700, marginTop: 6 }}>
          <span style={{ width: 26, height: 26, borderRadius: 999, background: "var(--cor-primaria)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>2</span>
          Deixe a TV em tela cheia (tecla F11)
        </div>
      </div>
      <Aviso icone="alerta" tom="alerta">Enquanto a fila de senhas não tem endpoint na API, quiosque e TV precisam usar o mesmo navegador (por exemplo, um computador ligado à TV com o quiosque em outra janela).</Aviso>
      <Botao
        tipo="secundario"
        tam="G"
        icone="megafone"
        style={{ alignSelf: "flex-start" }}
        onClick={() => {
          gravarConfigPainel(cfg);
          const s = chamarProxima("Guichê 1", cfg.mostrarNome ? "Paciente T." : undefined);
          message.success(s ? `Chamada de teste enviada: ${s.codigo}.` : "Não há senhas na fila para testar.");
        }}
      >
        Fazer uma chamada de teste
      </Botao>
    </Casca>
  );
}
