"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Icone } from "@/components/ui";
import { PAINEL_PADRAO, lerConfigPainel, useSenhas, type ConfigPainel } from "@/lib/senhas";
import { falarSenha, tocarAviso } from "@/lib/som";

const u = (n: number) => `calc(${n} * var(--u))`;

/** Painel de chamada da sala de espera: senha e destino em destaque, últimas e próximas senhas. */
export default function PainelChamada() {
  const { chamadas, fila } = useSenhas();
  const [relogio, setRelogio] = useState<Date | null>(null);
  const anterior = useRef<string | undefined>(undefined);
  const atual = chamadas[0];
  const [cfg, setCfg] = useState<ConfigPainel>(PAINEL_PADRAO);

  useEffect(() => setCfg(lerConfigPainel()), []);

  useEffect(() => {
    setRelogio(new Date());
    const t = setInterval(() => setRelogio(new Date()), 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (anterior.current && atual && anterior.current !== atual.codigo + atual.chamada) {
      tocarAviso(cfg.aviso, cfg.volume / 100);
      if (cfg.voz && atual.destino) setTimeout(() => falarSenha(atual.codigo, atual.destino ?? "", cfg.volume / 100), 900);
    }
    anterior.current = atual ? atual.codigo + atual.chamada : undefined;
  }, [atual, cfg]);

  const dataHora = relogio
    ? `${relogio.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" }).replace("-feira", "").replace(/^./, (c) => c.toUpperCase())} · ${relogio.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
    : "";

  return (
    <main className="sd-painel">
      <header style={{ height: u(104), flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${u(48)}`, background: "#fff", borderBottom: "1px solid var(--cor-borda)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: u(16) }}>
          <Image src="/logo.svg" alt="" width={56} height={56} style={{ width: u(56), height: u(56) }} priority />
          <div style={{ display: "flex", flexDirection: "column", gap: u(2) }}>
            <div style={{ fontSize: u(28), fontWeight: 700 }}>SorriDente</div>
            <div style={{ fontSize: u(18), color: "var(--cor-suave)" }}>Painel de chamadas · {cfg.nomeLocal.toLowerCase()}</div>
          </div>
        </div>
        {cfg.mostrarRelogio && <div className="sd-num" style={{ display: "flex", alignItems: "center", gap: u(12), fontSize: u(30), fontWeight: 700 }}>
          <Icone nome="relogio" tam={30} cor="var(--cor-suave)" style={{ width: u(30), height: u(30) }} />
          {dataHora}
        </div>}
      </header>

      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: u(32), padding: `${u(40)} ${u(48)}` }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: u(32) }}>
          <section aria-live="assertive" style={{ flex: 1, background: "#fff", border: "1px solid var(--cor-borda)", borderRadius: u(32), boxShadow: "var(--sombra)", padding: `${u(56)} ${u(64)}`, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: u(12), fontSize: u(22), fontWeight: 700, color: "var(--cor-primaria)", letterSpacing: ".08em", textTransform: "uppercase" }}>
              <Icone nome="megafone" tam={28} style={{ width: u(28), height: u(28) }} />
              Chamando agora
            </div>
            {atual ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: u(64) }}>
                  <div style={{ fontSize: u(260), fontWeight: 800, color: "var(--cor-primaria)", letterSpacing: "-0.04em", lineHeight: 0.9 }}>{atual.codigo}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: u(12) }}>
                    {cfg.mostrarNome && atual.paciente && <div style={{ fontSize: u(72), fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}>{atual.paciente}</div>}
                    <div style={{ fontSize: u(34), color: "var(--cor-suave)" }}>{atual.tipo}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: u(24) }}>
                  <div style={{ flex: 1.3, display: "flex", alignItems: "center", gap: u(24), padding: `${u(28)} ${u(36)}`, borderRadius: u(24), background: "var(--cor-primaria)" }}>
                    <Icone nome="seta" tam={56} cor="#fff" esp={2.2} style={{ width: u(56), height: u(56) }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: u(4) }}>
                      <div style={{ fontSize: u(24), color: "rgba(255,255,255,.85)" }}>Dirija-se ao</div>
                      <div style={{ fontSize: u(64), fontWeight: 800, color: "#fff", lineHeight: 1 }}>{atual.destino}</div>
                    </div>
                  </div>
                  {atual.depois && (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: u(4), padding: `${u(28)} ${u(36)}`, borderRadius: u(24), background: "var(--cor-primaria-suave)" }}>
                      <div style={{ fontSize: u(24), color: "var(--cor-suave)" }}>Depois, atendimento no</div>
                      <div style={{ fontSize: u(48), fontWeight: 700, color: "var(--cor-primaria)", lineHeight: 1.1 }}>{atual.depois}</div>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: u(24), color: "var(--cor-suave)" }}>Por favor, dirija-se ao local indicado e aguarde ser chamado.</div>
              </>
            ) : (
              <div style={{ fontSize: u(48), color: "var(--cor-suave)" }}>Aguardando a próxima chamada…</div>
            )}
          </section>

          {cfg.mostrarProximas && <div style={{ display: "flex", alignItems: "center", gap: u(24) }}>
            <div style={{ width: u(180), fontSize: u(20), fontWeight: 700, color: "var(--cor-suave)", letterSpacing: ".08em", textTransform: "uppercase", lineHeight: 1.3 }}>Próximas senhas</div>
            {fila.slice(0, 3).map((s) => {
              const urg = s.sigla === "UR";
              return (
                <div key={s.codigo} style={{ flex: 1, display: "flex", alignItems: "center", gap: u(20), padding: `${u(24)} ${u(32)}`, borderRadius: u(24), background: "#fff", border: `1px solid ${urg ? "var(--cor-erro-borda)" : "var(--cor-borda)"}`, boxShadow: "var(--sombra)" }}>
                  <div style={{ fontSize: u(44), fontWeight: 800, color: urg ? "var(--cor-erro-forte)" : "var(--cor-primaria)" }}>{s.codigo}</div>
                  <div style={{ fontSize: u(24), color: "var(--cor-suave)" }}>{s.tipo}</div>
                </div>
              );
            })}
            {fila.length === 0 && <div style={{ fontSize: u(24), color: "var(--cor-suave)" }}>Nenhuma senha na fila.</div>}
          </div>}
        </div>

        {cfg.mostrarUltimas && <aside style={{ width: u(560), flexShrink: 0, background: "#fff", border: "1px solid var(--cor-borda)", borderRadius: u(32), boxShadow: "var(--sombra)", padding: u(40), display: "flex", flexDirection: "column", gap: u(12) }}>
          <div style={{ fontSize: u(20), fontWeight: 700, color: "var(--cor-suave)", letterSpacing: ".08em", textTransform: "uppercase", paddingBottom: u(8) }}>Últimas chamadas</div>
          {chamadas.slice(1, 6).map((s) => (
            <div key={s.codigo + s.chamada} style={{ display: "flex", alignItems: "center", gap: u(24), padding: `${u(22)} 0`, borderTop: "1px solid var(--cor-divisoria)" }}>
              <div style={{ width: u(130), fontSize: u(40), fontWeight: 800, letterSpacing: "-0.01em" }}>{s.codigo}</div>
              <div style={{ flex: 1, fontSize: u(26), color: "var(--cor-texto)" }}>{s.destino}</div>
              <div className="sd-num" style={{ fontSize: u(22), color: "var(--cor-sutil)" }}>{s.chamada}</div>
            </div>
          ))}
        </aside>}
      </div>
    </main>
  );
}
