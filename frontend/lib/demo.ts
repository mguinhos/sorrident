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

/* ---------------------------------------------------------------- exames */
export interface Exame {
  id: string;
  paciente: string;
  exame: string;
  data: string;
  status: "pronto" | "em análise" | "solicitado";
  profissional: string;
  laudo: string;
}

export const EXAMES: Exame[] = [
  { id: "e1", paciente: "Mariana Costa", exame: "Radiografia panorâmica", data: "22/09/2026", status: "pronto", profissional: "Dr. Rafael Nogueira", laudo: "Dentição permanente completa. Sem lesões periapicais visíveis. Terceiros molares em formação." },
  { id: "e2", paciente: "João Pedro Almeida", exame: "Documentação ortodôntica", data: "22/09/2026", status: "em análise", profissional: "Dra. Helena Martins", laudo: "" },
  { id: "e3", paciente: "Beatriz Souza", exame: "Tomografia (CBCT)", data: "21/09/2026", status: "pronto", profissional: "Dra. Helena Martins", laudo: "Sem alterações ósseas relevantes. Canal mandibular preservado." },
  { id: "e4", paciente: "Lucas Ferreira", exame: "Modelo 3D intraoral", data: "20/09/2026", status: "solicitado", profissional: "Dr. Rafael Nogueira", laudo: "" },
  { id: "e5", paciente: "Ana Clara Ribeiro", exame: "Radiografia periapical", data: "19/09/2026", status: "pronto", profissional: "Dra. Carla Lima", laudo: "Lesão cariosa incipiente na face distal do 36." },
  { id: "e6", paciente: "Pedro Henrique Santos", exame: "Telerradiografia", data: "18/09/2026", status: "pronto", profissional: "Dra. Helena Martins", laudo: "Padrão esquelético classe II leve." },
];

/* ---------------------------------------------------------------- pagamentos */
export interface Parcela {
  n: string;
  vencimento: string;
  valor: number;
  status: "pago" | "pendente" | "atrasado";
}

export const PLANO_PAGAMENTO = {
  paciente: "Mariana Costa",
  total: 4023,
  parcelas: [
    { n: "1/6", vencimento: "22/09/2026", valor: 800, status: "pago" },
    { n: "2/6", vencimento: "22/10/2026", valor: 268.58, status: "pago" },
    { n: "3/6", vencimento: "22/11/2026", valor: 268.58, status: "pendente" },
    { n: "4/6", vencimento: "22/12/2026", valor: 268.58, status: "pendente" },
    { n: "5/6", vencimento: "22/01/2027", valor: 268.58, status: "pendente" },
    { n: "6/6", vencimento: "22/02/2027", valor: 268.58, status: "pendente" },
  ] as Parcela[],
  pago: 1800,
  recebimentos: [
    { desc: "22/10 · Pix", valor: 268.58 },
    { desc: "22/09 · Cartão", valor: 800 },
    { desc: "22/09 · Entrada", valor: 731.42 },
  ],
};

export const FORMAS_PAGAMENTO = ["Pix", "Cartão (3x)", "Boleto", "Dinheiro", "Convênio"];

/* ---------------------------------------------------------------- convênios */
export interface Convenio {
  nome: string;
  cobertura: number;
  procedimentos: string;
  repasse: string;
  status: "ativo" | "em análise";
  coberturas: [string, "coberto" | "parcial" | "não coberto"][];
  resumo: { atendimentos: number; aReceber: number; glosas: number };
}

export const CONVENIOS: Convenio[] = [
  { nome: "Amil Dental", cobertura: 80, procedimentos: "12 de 18", repasse: "30 dias", status: "ativo",
    coberturas: [["Avaliação ortodôntica", "coberto"], ["Manutenção", "coberto"], ["Instalação de aparelho", "parcial"], ["Alinhadores invisíveis", "não coberto"]],
    resumo: { atendimentos: 37, aReceber: 9740, glosas: 320 } },
  { nome: "Bradesco Dental", cobertura: 70, procedimentos: "10 de 18", repasse: "45 dias", status: "ativo",
    coberturas: [["Avaliação ortodôntica", "coberto"], ["Manutenção", "coberto"], ["Instalação de aparelho", "não coberto"], ["Alinhadores invisíveis", "não coberto"]],
    resumo: { atendimentos: 21, aReceber: 5120, glosas: 0 } },
  { nome: "Odontoprev", cobertura: 60, procedimentos: "8 de 18", repasse: "30 dias", status: "ativo",
    coberturas: [["Avaliação ortodôntica", "coberto"], ["Manutenção", "parcial"], ["Instalação de aparelho", "não coberto"], ["Alinhadores invisíveis", "não coberto"]],
    resumo: { atendimentos: 14, aReceber: 2980, glosas: 150 } },
  { nome: "SulAmérica Odonto", cobertura: 75, procedimentos: "11 de 18", repasse: "30 dias", status: "em análise",
    coberturas: [["Avaliação ortodôntica", "coberto"], ["Manutenção", "coberto"], ["Instalação de aparelho", "parcial"], ["Alinhadores invisíveis", "não coberto"]],
    resumo: { atendimentos: 0, aReceber: 0, glosas: 0 } },
];

/* ---------------------------------------------------------------- financeiro */
export type Periodo = "Mês" | "Trimestre" | "Ano";

export const FINANCEIRO: Record<Periodo, { kpis: { rotulo: string; valor: string; delta: string; tom: "ok" | "info" | "alerta"; icone: string }[] }> = {
  "Mês": { kpis: [
    { rotulo: "Faturamento (mês)", valor: "R$ 48.320", delta: "+12,4%", tom: "ok", icone: "grafico" },
    { rotulo: "A receber", valor: "R$ 12.450", delta: "+3,1%", tom: "info", icone: "baixar" },
    { rotulo: "Ticket médio", valor: "R$ 386", delta: "+5,8%", tom: "ok", icone: "cartao" },
    { rotulo: "Inadimplência", valor: "3,2%", delta: "-0,7%", tom: "alerta", icone: "alerta" },
  ] },
  "Trimestre": { kpis: [
    { rotulo: "Faturamento (trimestre)", valor: "R$ 135.320", delta: "+9,1%", tom: "ok", icone: "grafico" },
    { rotulo: "A receber", valor: "R$ 28.900", delta: "+2,4%", tom: "info", icone: "baixar" },
    { rotulo: "Ticket médio", valor: "R$ 379", delta: "+3,2%", tom: "ok", icone: "cartao" },
    { rotulo: "Inadimplência", valor: "3,6%", delta: "-0,3%", tom: "alerta", icone: "alerta" },
  ] },
  "Ano": { kpis: [
    { rotulo: "Faturamento (ano)", valor: "R$ 402.880", delta: "+18,0%", tom: "ok", icone: "grafico" },
    { rotulo: "A receber", valor: "R$ 41.200", delta: "+6,5%", tom: "info", icone: "baixar" },
    { rotulo: "Ticket médio", valor: "R$ 371", delta: "+4,1%", tom: "ok", icone: "cartao" },
    { rotulo: "Inadimplência", valor: "4,0%", delta: "-1,2%", tom: "alerta", icone: "alerta" },
  ] },
};

export const RECEITA_MENSAL = [
  { mes: "Mai", valor: 31000, cor: "#bbd3ea" },
  { mes: "Jun", valor: 38000, cor: "#9fc1e4" },
  { mes: "Jul", valor: 35000, cor: "#7faedd" },
  { mes: "Ago", valor: 44000, cor: "#4c8fd0" },
  { mes: "Set", valor: 43000, cor: "#1e77c7" },
  { mes: "Out", valor: 48000, cor: "var(--gradiente)" },
];

export const RECEITA_SERVICO = [
  { servico: "Ortodontia", valor: 18400, pct: 88, cor: "var(--gradiente)" },
  { servico: "Implante", valor: 11900, pct: 62, cor: "#10bbfa" },
  { servico: "Restauração", valor: 7150, pct: 46, cor: "#4c8fd0" },
  { servico: "Limpeza", valor: 5320, pct: 34, cor: "#9fc1e4" },
  { servico: "Clareamento", valor: 3100, pct: 21, cor: "#bbd3ea" },
];

export const LANCAMENTOS = [
  { paciente: "Mariana Costa", servico: "Manutenção", data: "07/10", valor: 420, status: "pago" },
  { paciente: "Pedro Lima", servico: "Avaliação", data: "07/10", valor: 150, status: "pendente" },
  { paciente: "Beatriz Souza", servico: "Instalação", data: "06/10", valor: 1280, status: "pago" },
  { paciente: "Lucas Ferreira", servico: "Urgência", data: "06/10", valor: 260, status: "atrasado" },
];
