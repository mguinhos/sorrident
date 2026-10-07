/**
 * Dados de demonstração das telas que ainda não têm endpoint na API
 * (prontuário clínico, financeiro, orçamentos, convênios, exames, painel de senha).
 * Concentrados aqui para serem trocados por chamadas reais quando o backend existir.
 */

/* ---------------------------------------------------------------- prontuário */
export type EstadoDente = "N" | "T" | "R" | "A" | "X";

export const ODONTOGRAMA = {
  atualizado: "07/10/2026 · Dra. Helena Martins",
  superior: "18N 17T 16R 15T 14T 13T 12A 11T 21T 22A 23T 24T 25T 26X 27R 28N".split(" "),
  inferior: "48N 47T 46R 45T 44T 43T 42A 41T 31T 32N 33T 34T 35T 36R 37T 38N".split(" "),
};

export const EVOLUCOES = [
  { data: "10/09", autor: "H. Martins", texto: "Troca do arco superior, fio 0.016 e amarração em corrente. Paciente sem queixas de dor.", tipo: "Manutenção", tom: "info" as const },
  { data: "13/08", autor: "H. Martins", texto: "Reativação e instalação de tubos nos primeiros molares. Orientada higiene com escova interdental.", tipo: "Ajuste", tom: "neutro" as const },
  { data: "12/02", autor: "R. Nogueira", texto: "Instalação de aparelho fixo superior e inferior (prescrição Roth). Documentação e moldagens anexadas.", tipo: "Instalação", tom: "ok" as const },
];

export const ANEXOS = ["Radiografia panorâmica", "Moldagem inicial", "Termo de consentimento"];

export const PLANO = {
  progresso: 60,
  etapas: [
    { texto: "Instalação do aparelho fixo", estado: "feito" as const },
    { texto: "Alinhamento e nivelamento", estado: "atual" as const },
    { texto: "Finalização e contenção", estado: "futuro" as const },
  ],
};

export const ALERTAS_CLINICOS = {
  alergias: "Nega alergias medicamentosas",
  observacoes: "Reabsorção radicular leve no 26 — acompanhar por radiografia",
};
