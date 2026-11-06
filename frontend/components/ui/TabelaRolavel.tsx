"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "antd";
import { Icone } from "@/components/ui";

/**
 * Envolve uma tabela antd larga e oferece, no celular, setas para rolar as
 * colunas para os lados (além do arraste nativo). No desktop não muda nada.
 */
export default function TabelaRolavel({ children }: { children: ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pode, setPode] = useState(false);
  const [noInicio, setNoInicio] = useState(true);
  const [noFim, setNoFim] = useState(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    // acha o contêiner que rola de fato (antd usa .ant-table-content/body;
    // tabelas comuns usam um envoltório com overflow-x, ex. .sd-tabela-rolo)
    const alvo = (): HTMLElement => {
      const els = Array.from(wrap.querySelectorAll<HTMLElement>("*"));
      const rolavel = els.find((el) => {
        const o = getComputedStyle(el).overflowX;
        return (o === "auto" || o === "scroll") && el.scrollWidth > el.clientWidth + 2;
      });
      return rolavel ?? wrap;
    };

    const atualizar = () => {
      const el = alvo();
      setPode(el.scrollWidth > el.clientWidth + 2);
      setNoInicio(el.scrollLeft <= 1);
      setNoFim(el.scrollLeft >= el.scrollWidth - el.clientWidth - 1);
    };
    atualizar();

    // captura eventos de scroll de qualquer contêiner interno (content/body)
    wrap.addEventListener("scroll", atualizar, { capture: true, passive: true });
    const ro = new ResizeObserver(() => atualizar());
    ro.observe(wrap);
    return () => {
      wrap.removeEventListener("scroll", atualizar, true);
      ro.disconnect();
    };
  }, []);

  function rolar(dir: -1 | 1) {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const el = Array.from(wrap.querySelectorAll<HTMLElement>("*")).find((c) => {
      const o = getComputedStyle(c).overflowX;
      return (o === "auto" || o === "scroll") && c.scrollWidth > c.clientWidth + 2;
    }) ?? wrap;
    el.scrollBy({ left: dir * Math.max(Math.round(el.clientWidth * 0.8), 200), behavior: "smooth" });
  }

  return (
    <div ref={wrapRef} className="sd-tabela-rolavel">
      <div className="sd-tabela-area">
        {children}
        {pode && !noInicio && (
          <Button
            className="sd-seta sd-seta-esq"
            shape="circle"
            icon={<Icone nome="esq" tam={14} />}
            aria-label="Voltar para as colunas anteriores"
            onClick={() => rolar(-1)}
          />
        )}
        {pode && !noFim && (
          <Button
            className="sd-seta sd-seta-dir"
            shape="circle"
            icon={<Icone nome="dir" tam={14} />}
            aria-label="Ver mais colunas"
            onClick={() => rolar(1)}
          />
        )}
      </div>
    </div>
  );
}
