"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Icone } from "@/components/ui";
import { CONFIG_PADRAO, CORES_QUIOSQUE, emitirSenha, lerConfigQuiosque, type ConfigQuiosque, type Senha, type TipoAtendimento } from "@/lib/senhas";

const u = (n: number) => `calc(${n} * var(--u))`;

function Cartao({ t, onEscolher }: { t: TipoAtendimento; onEscolher: () => void }) {
  const [fundo, cor] = t.prioridade ? ["var(--cor-erro-fundo)", "var(--cor-erro-forte)"] : ["var(--cor-primaria-suave)", "var(--cor-primaria)"];
  return (
    <button
      type="button"
      onClick={onEscolher}
      className="sd-quiosque-cartao"
      style={{ borderColor: t.prioridade ? "var(--cor-erro-borda)" : "var(--cor-borda)" }}
      aria-label={`${t.nome}: ${t.desc}`}
    >
      <span style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
        <span style={{ width: u(96), height: u(96), borderRadius: u(24), background: fundo, color: cor, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icone nome={t.icone} tam={52} esp={1.7} style={{ width: u(52), height: u(52) }} />
        </span>
        <span style={{ fontSize: u(22), fontWeight: 700, color: cor, background: fundo, padding: `${u(8)} ${u(16)}`, borderRadius: 999, letterSpacing: ".04em" }}>{t.sigla}</span>
      </span>
      <span style={{ display: "flex", flexDirection: "column", gap: u(8), textAlign: "left" }}>
        <span style={{ fontSize: u(44), fontWeight: 700, letterSpacing: "-0.02em" }}>{t.nome}</span>
        <span style={{ fontSize: u(26), color: "var(--cor-suave)" }}>{t.desc}</span>
      </span>
    </button>
  );
}

/** Quiosque de senha: cartões de toque grandes; a sigla vira o começo do código da senha. */
export default function Quiosque() {
  const [config, setConfig] = useState<ConfigQuiosque>(CONFIG_PADRAO);
  const [senha, setSenha] = useState<Senha | null>(null);

  useEffect(() => setConfig(lerConfigQuiosque()), []);

  useEffect(() => {
    if (!senha) return;
    const t = setTimeout(() => setSenha(null), 9000);
    return () => clearTimeout(t);
  }, [senha]);

  const [c1, c2] = CORES_QUIOSQUE[config.cor];
  const tipos = config.tipos.filter((t) => t.ativo);

  return (
    <main className="sd-quiosque">
      <header style={{ background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`, padding: `${u(72)} ${u(64)}`, display: "flex", alignItems: "center", gap: u(32) }}>
        {config.mostrarLogo && (
          <div style={{ width: u(128), height: u(128), borderRadius: 999, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Image src="/logo.svg" alt="" width={104} height={104} style={{ width: u(104), height: u(104) }} priority />
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: u(8), color: "#fff" }}>
          <h1 style={{ margin: 0, fontSize: u(64), fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1 }}>{config.clinica}</h1>
          <div style={{ fontSize: u(32), opacity: 0.92 }}>{config.mensagem}</div>
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: u(40), padding: u(64), minHeight: 0 }}>
        <h2 style={{ margin: 0, fontSize: u(52), fontWeight: 700, letterSpacing: "-0.02em" }}>Qual o tipo de atendimento?</h2>
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gridAutoRows: "1fr", gap: u(32), minHeight: 0 }}>
          {tipos.map((t) => (
            <Cartao key={t.sigla} t={t} onEscolher={() => setSenha(emitirSenha(t))} />
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: u(24), padding: `${u(32)} ${u(40)}`, borderRadius: u(24), background: "var(--cor-primaria-suave)" }}>
          <div style={{ width: u(64), height: u(64), borderRadius: 999, background: "#fff", color: "var(--cor-primaria)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icone nome="seta" tam={32} esp={2} style={{ width: u(32), height: u(32) }} />
          </div>
          <div style={{ fontSize: u(28), lineHeight: 1.4 }}>Toque em uma opção para receber sua senha. O atendimento começa em ordem de chegada.</div>
        </div>
      </div>

      {senha && (
        <div className="sd-quiosque-senha" role="dialog" aria-modal="true" aria-label={`Sua senha é ${senha.codigo}`}>
          <div style={{ background: "#fff", borderRadius: u(40), padding: u(72), display: "flex", flexDirection: "column", alignItems: "center", gap: u(24), width: u(820), boxShadow: "0 30px 80px rgba(4,22,64,.34)" }}>
            <div style={{ fontSize: u(32), color: "var(--cor-suave)" }}>Sua senha é</div>
            <div style={{ fontSize: u(200), fontWeight: 800, color: "var(--cor-primaria)", letterSpacing: "-0.04em", lineHeight: 1 }}>{senha.codigo}</div>
            <div style={{ fontSize: u(36), fontWeight: 700 }}>{senha.tipo}</div>
            <div style={{ fontSize: u(28), color: "var(--cor-suave)", textAlign: "center", lineHeight: 1.4 }}>Aguarde na sala de espera. Sua senha vai aparecer na TV.</div>
            <button type="button" onClick={() => setSenha(null)} style={{ font: "inherit", marginTop: u(16), height: u(96), padding: `0 ${u(56)}`, borderRadius: u(24), border: 0, background: "var(--cor-primaria)", color: "#fff", fontSize: u(32), fontWeight: 700, cursor: "pointer" }}>
              Pronto
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
