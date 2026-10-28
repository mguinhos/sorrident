import Image from "next/image";

/** Loading de rota: leve, centrado, no tom claro do sistema. */
export default function Carregando({ mensagem = "Carregando…" }: { mensagem?: string }) {
  return (
    <div className="sd-carregando" role="status" aria-live="polite" aria-busy="true">
      <div className="sd-carregando-logo">
        <Image src="/logo.svg" alt="" width={64} height={64} priority />
      </div>
      <strong className="sd-carregando-nome">SorriDente</strong>
      <span className="sd-carregando-msg">{mensagem}</span>
      <div className="sd-carregando-trilho" aria-hidden>
        <span />
      </div>
    </div>
  );
}
