/**
 * Fila de senhas do quiosque e do painel de chamada.
 * Ainda não há endpoint na API: a fila vive no navegador (localStorage) e é sincronizada
 * entre abas pelo evento "storage". Quiosque e TV no mesmo navegador já funcionam.
 */
import { useEffect, useState } from "react";

export interface TipoAtendimento {
  sigla: string;
  nome: string;
  desc: string;
  icone: string;
  prioridade?: boolean;
  ativo: boolean;
}

export const TIPOS_PADRAO: TipoAtendimento[] = [
  { sigla: "AV", nome: "Avaliação", desc: "Primeira consulta", icone: "prancheta", ativo: true },
  { sigla: "MA", nome: "Manutenção", desc: "Ajuste do aparelho", icone: "chave", ativo: true },
  { sigla: "UR", nome: "Urgência", desc: "Fio ou braquete solto", icone: "alerta", prioridade: true, ativo: true },
  { sigla: "IN", nome: "Instalação", desc: "Colocar o aparelho", icone: "dente", ativo: true },
  { sigla: "AL", nome: "Alinhadores", desc: "Invisíveis", icone: "sorriso", ativo: true },
  { sigla: "RE", nome: "Remoção", desc: "Retirar + contenção", icone: "ok", ativo: true },
];

export interface Senha {
  codigo: string;
  sigla: string;
  tipo: string;
  emitida: string;
  chamada?: string;
  destino?: string;
  paciente?: string;
}

interface Estado {
  contadores: Record<string, number>;
  fila: Senha[];
  chamadas: Senha[];
}

const CHAVE = "sorridente.senhas";

const INICIAL: Estado = {
  contadores: { AV: 3, MA: 8, UR: 1, IN: 5, AL: 2, RE: 0 },
  fila: [
    { codigo: "MA08", sigla: "MA", tipo: "Manutenção", emitida: "" },
    { codigo: "UR01", sigla: "UR", tipo: "Urgência", emitida: "" },
    { codigo: "AV03", sigla: "AV", tipo: "Avaliação", emitida: "" },
  ],
  chamadas: [
    { codigo: "A12", sigla: "MA", tipo: "Manutenção de aparelho fixo", emitida: "", chamada: "14:32", destino: "Guichê 1", paciente: "Mariana C." },
    { codigo: "MA07", sigla: "MA", tipo: "Manutenção", emitida: "", chamada: "14:28", destino: "Consultório 1" },
    { codigo: "AV02", sigla: "AV", tipo: "Avaliação", emitida: "", chamada: "14:21", destino: "Guichê 2" },
    { codigo: "UR00", sigla: "UR", tipo: "Urgência", emitida: "", chamada: "14:12", destino: "Consultório 3" },
    { codigo: "IN05", sigla: "IN", tipo: "Instalação", emitida: "", chamada: "14:03", destino: "Guichê 1" },
  ],
};

function ler(): Estado {
  if (typeof window === "undefined") return INICIAL;
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    return bruto ? (JSON.parse(bruto) as Estado) : INICIAL;
  } catch {
    return INICIAL;
  }
}

function gravar(e: Estado) {
  window.localStorage.setItem(CHAVE, JSON.stringify(e));
  window.dispatchEvent(new Event("sorridente-senhas"));
}

const agora = () => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

/** Emite uma nova senha; urgências entram na frente da fila. */
export function emitirSenha(tipo: TipoAtendimento): Senha {
  const e = ler();
  const n = (e.contadores[tipo.sigla] ?? 0) + 1;
  const senha: Senha = { codigo: `${tipo.sigla}${String(n).padStart(2, "0")}`, sigla: tipo.sigla, tipo: tipo.nome, emitida: agora() };
  const fila = tipo.prioridade ? [senha, ...e.fila] : [...e.fila, senha];
  gravar({ ...e, contadores: { ...e.contadores, [tipo.sigla]: n }, fila });
  return senha;
}

/** Chama a próxima senha da fila para um destino (guichê ou consultório). */
export function chamarProxima(destino: string, paciente?: string): Senha | null {
  const e = ler();
  const [proxima, ...resto] = e.fila;
  if (!proxima) return null;
  const chamada = { ...proxima, chamada: agora(), destino, paciente };
  gravar({ ...e, fila: resto, chamadas: [chamada, ...e.chamadas].slice(0, 12) });
  return chamada;
}

/** Estado da fila, atualizado quando outra aba (quiosque, TV) muda a fila. */
export function useSenhas(): Estado {
  const [estado, setEstado] = useState<Estado>(INICIAL);
  useEffect(() => {
    const atualizar = () => setEstado(ler());
    atualizar();
    window.addEventListener("storage", atualizar);
    window.addEventListener("sorridente-senhas", atualizar);
    return () => {
      window.removeEventListener("storage", atualizar);
      window.removeEventListener("sorridente-senhas", atualizar);
    };
  }, []);
  return estado;
}

/* ---------------------------------------------------------------- configuração local do quiosque/painel */
const CHAVE_CONFIG = "sorridente.quiosque";

export interface ConfigQuiosque {
  clinica: string;
  mensagem: string;
  cor: "azul" | "verde" | "grafite";
  retrato: boolean;
  mostrarLogo: boolean;
  tipos: TipoAtendimento[];
}

export const CORES_QUIOSQUE: Record<ConfigQuiosque["cor"], [string, string, string]> = {
  azul: ["#0065C4", "#10BBFA", "Azul SorriDente"],
  verde: ["#0F766E", "#2DD4BF", "Verde-água"],
  grafite: ["#1E293B", "#475569", "Grafite"],
};

export const CONFIG_PADRAO: ConfigQuiosque = {
  clinica: "SorriDente",
  mensagem: "Bem-vindo! Retire sua senha abaixo.",
  cor: "azul",
  retrato: true,
  mostrarLogo: true,
  tipos: TIPOS_PADRAO,
};

export function lerConfigQuiosque(): ConfigQuiosque {
  if (typeof window === "undefined") return CONFIG_PADRAO;
  try {
    const bruto = window.localStorage.getItem(CHAVE_CONFIG);
    return bruto ? { ...CONFIG_PADRAO, ...(JSON.parse(bruto) as Partial<ConfigQuiosque>) } : CONFIG_PADRAO;
  } catch {
    return CONFIG_PADRAO;
  }
}

export function gravarConfigQuiosque(c: ConfigQuiosque) {
  window.localStorage.setItem(CHAVE_CONFIG, JSON.stringify(c));
}
