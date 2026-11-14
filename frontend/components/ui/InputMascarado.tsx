"use client";

import { Input } from "antd";
import type { InputProps } from "antd";
import { formatarCPF, formatarTelefone } from "@/lib/formato";

type Tipo = "cpf" | "telefone";

interface Props extends Omit<InputProps, "value" | "onChange"> {
  tipo: Tipo;
  value?: string;
  onChange?: (e: any) => void;
}

/** Input com máscara automática de CPF ou telefone. */
export default function InputMascarado({ tipo, value, onChange, ...rest }: Props) {
  const formatar = tipo === "cpf" ? formatarCPF : formatarTelefone;
  const valorFormatado = value == null ? value : formatar(value);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatado = formatar(e.target.value);
    const novoEvento = { ...e, target: { ...e.target, value: formatado } };
    onChange?.(novoEvento);
  }

  return <Input inputMode="numeric" {...rest} value={valorFormatado} onChange={handleChange} />;
}
