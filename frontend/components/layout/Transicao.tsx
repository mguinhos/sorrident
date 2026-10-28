import Image from "next/image";

/** Transição curta entre telas públicas (ex.: apresentação → login). */
export default function Transicao({ mensagem = "Abrindo o acesso…" }: { mensagem?: string }) {
  return (
    <div className="sd-transicao" role="status" aria-live="polite" aria-busy="true">
      <span className="sd-transicao-bolha" style={{ left: -180, top: -220, width: 620, height: 620, opacity: 0.07 }} />
      <span className="sd-transicao-bolha" style={{ right: -180, bottom: -200, width: 560, height: 560, opacity: 0.08 }} />

      <div className="sd-transicao-centro">
        <div className="sd-transicao-logo">
          <Image src="/logo.svg" alt="" width={84} height={84} priority />
        </div>
        <div className="sd-transicao-nome">SorriDente</div>
        <div className="sd-transicao-msg">{mensagem}</div>
      </div>

      <div className="sd-transicao-trilho" aria-hidden>
        <span />
      </div>
    </div>
  );
}
