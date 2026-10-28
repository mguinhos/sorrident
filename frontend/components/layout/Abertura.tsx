import Image from "next/image";

/** Splashscreen: abertura do sistema (logo, nome e carregamento). */
export default function Abertura({ mensagem = "Carregando agenda e conversas…" }: { mensagem?: string }) {
  return (
    <div className="sd-abertura" role="status" aria-live="polite">
      <span className="sd-abertura-bolha" style={{ left: -160, top: -200, width: 620, height: 620, opacity: 0.06 }} />
      <span className="sd-abertura-bolha" style={{ right: -160, bottom: -180, width: 560, height: 560, opacity: 0.07 }} />
      <span className="sd-abertura-bolha" style={{ right: 200, top: -120, width: 260, height: 260, opacity: 0.05 }} />
      <span className="sd-abertura-bolha" style={{ left: 120, bottom: 60, width: 200, height: 200, opacity: 0.05 }} />
      <div className="sd-abertura-centro">
        <div className="sd-abertura-logo">
          <Image src="/logo.svg" alt="" width={120} height={120} priority />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div className="sd-abertura-nome">SorriDente</div>
          <div className="sd-abertura-sub">Atendimento e gestão da clínica</div>
        </div>
      </div>
      <div className="sd-abertura-carga">
        <div className="sd-abertura-trilho"><span /></div>
        <div style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,.92)" }}>{mensagem}</div>
      </div>
      <div className="sd-abertura-rodape">versão 2.0 · conexão segura</div>
    </div>
  );
}
