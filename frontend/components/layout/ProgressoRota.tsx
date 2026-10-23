"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Barra fina no topo que dá feedback nas trocas de rota.
 * - clique em link interno: começa a andar antes de a página mudar
 * - rota nova: completa até 100%, varre a tela e desaparece
 */
export default function ProgressoRota() {
  const pathname = usePathname();
  const [ativo, setAtivo] = useState(false);
  const [progresso, setProgresso] = useState(0);

  const primeira = useRef(true);
  const visivel = useRef(false);
  const intervalo = useRef<number>();
  const esconder = useRef<number>();

  function limpar() {
    window.clearInterval(intervalo.current);
    window.clearTimeout(esconder.current);
    intervalo.current = undefined;
    esconder.current = undefined;
  }

  function semAnimacao() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function iniciar() {
    if (visivel.current || semAnimacao()) return;
    limpar();
    visivel.current = true;
    setAtivo(true);
    setProgresso(8);
    intervalo.current = window.setInterval(() => {
      setProgresso((p) => (p >= 90 ? p : p + Math.max(1, (90 - p) * 0.18)));
    }, 160);
  }

  function completar() {
    limpar();
    setProgresso(100);
    esconder.current = window.setTimeout(() => {
      visivel.current = false;
      setAtivo(false);
      setProgresso(0);
    }, 420);
  }

  // clique em link interno: antecipa o feedback antes da navegação
  useEffect(() => {
    function aoClicar(ev: MouseEvent) {
      if (ev.defaultPrevented || ev.button !== 0) return;
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      const link = (ev.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || (link.target && link.target !== "_self")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      iniciar();
    }
    document.addEventListener("click", aoClicar, true);
    return () => document.removeEventListener("click", aoClicar, true);
  }, []);

  // a rota mudou: completa a barra (ou faz a varredura rápida)
  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    if (semAnimacao()) return;

    const jaVisivel = visivel.current;
    limpar();
    visivel.current = true;
    if (!jaVisivel) {
      setAtivo(true);
      setProgresso(0);
    }
    const quadro = window.requestAnimationFrame(() => completar());
    return () => {
      window.cancelAnimationFrame(quadro);
      limpar();
    };
  }, [pathname]);

  useEffect(() => limpar, []);

  if (!ativo) return null;

  return (
    <div
      className="sd-progresso"
      role="progressbar"
      aria-label="Carregando página"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progresso)}
    >
      <span style={{ width: `${progresso}%` }} />
    </div>
  );
}
