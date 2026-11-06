"use client";

import { Fragment, type ReactNode } from "react";

/** Renderiza os padrões de markdown usados pelo SorriDente nas bolhas do chat:
 *  `**negrito**`, `*itálico*`, listas `-`, `1.` e títulos `###`.
 *  Como tudo vira elementos React (nunca `dangerouslySetInnerHTML`), o texto é
 *  escapado por padrão — não há risco de XSS vindo da resposta do modelo. */

function renderInline(texto: string): ReactNode[] {
  return texto
    .split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
    .filter(Boolean)
    .map((parte, i) => {
      if (parte.startsWith("**") && parte.endsWith("**") && parte.length > 4) {
        return <strong key={i}>{parte.slice(2, -2)}</strong>;
      }
      if (parte.startsWith("*") && parte.endsWith("*") && parte.length > 2) {
        return <em key={i}>{parte.slice(1, -1)}</em>;
      }
      return <Fragment key={i}>{parte}</Fragment>;
    });
}

export default function Markdown({ texto }: { texto: string }) {
  const linhas = texto.split("\n");
  const blocos: ReactNode[] = [];
  let i = 0;

  while (i < linhas.length) {
    const item = linhas[i].trim();

    if (!item) {
      i += 1;
      continue;
    }

    // Lista não ordenada: -, * , • ou ·
    const lista = item.match(/^[-*•·]\s+(.*)$/);
    if (lista) {
      const itens: ReactNode[] = [];
      while (i < linhas.length) {
        const m = linhas[i].trim().match(/^[-*•·]\s+(.*)$/);
        if (!m) break;
        itens.push(<li key={i}>{renderInline(m[1])}</li>);
        i += 1;
      }
      blocos.push(
        <ul key={`u-${i}`} className="sd-markdown-lista">
          {itens}
        </ul>,
      );
      continue;
    }

    // Lista ordenada: 1. / 1)
    const ordenada = item.match(/^\d+[.)]\s+(.*)$/);
    if (ordenada) {
      const itens: ReactNode[] = [];
      while (i < linhas.length) {
        const m = linhas[i].trim().match(/^\d+[.)]\s+(.*)$/);
        if (!m) break;
        itens.push(<li key={i}>{renderInline(m[1])}</li>);
        i += 1;
      }
      blocos.push(
        <ol key={`o-${i}`} className="sd-markdown-lista">
          {itens}
        </ol>,
      );
      continue;
    }

    // Títulos (### até #)
    const titulo = item.match(/^(#{1,3})\s+(.*)$/);
    if (titulo) {
      const nivel = titulo[1].length;
      const conteudo = renderInline(titulo[2]);
      blocos.push(
        nivel === 1 ? (
          <h3 key={i} className="sd-markdown-titulo">{conteudo}</h3>
        ) : nivel === 2 ? (
          <h4 key={i} className="sd-markdown-titulo">{conteudo}</h4>
        ) : (
          <h5 key={i} className="sd-markdown-titulo">{conteudo}</h5>
        ),
      );
      i += 1;
      continue;
    }

    // Parágrafo
    blocos.push(
      <p key={i} className="sd-markdown-paragrafo">
        {renderInline(item)}
      </p>,
    );
    i += 1;
  }

  return <div className="sd-markdown">{blocos}</div>;
}
