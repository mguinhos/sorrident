"""Formatos de exportação de conversa."""
from __future__ import annotations

import html
from abc import ABC
from datetime import datetime
from typing import Sequence

from ..core.models import ChatMessage, Conversation
from .interfaces import ExportedFile, IConversationExporter

AUTHOR_LABEL: dict[str, str] = {
    "user": "Paciente",
    "assistant": "SorriDente",
    "human_agent": "Equipe",
    "system": "Sistema",
}


class BaseExporter(IConversationExporter, ABC):
    """Preparo comum: filtra mensagens internas e formata data e autor."""

    #: Chamadas de ferramenta são ruído para o paciente e não entram no arquivo.
    VISIBLE_AUTHORS = ("user", "assistant", "human_agent")

    def _visible(self, messages: Sequence[ChatMessage]) -> list[ChatMessage]:
        return [m for m in messages if m.author in self.VISIBLE_AUTHORS and m.content.strip()]

    @staticmethod
    def _stamp(value: str) -> str:
        try:
            return datetime.fromisoformat(value).strftime("%d/%m/%Y %H:%M")
        except ValueError:
            return value

    @staticmethod
    def _author(message: ChatMessage) -> str:
        return AUTHOR_LABEL.get(message.author, message.author)

    def _basename(self, conversation: Conversation) -> str:
        data = datetime.now().strftime("%Y-%m-%d")
        nome = "".join(c if c.isalnum() else "-" for c in conversation.display_name).strip("-")
        return f"conversa-sorridente-{nome.lower() or 'paciente'}-{data}"


class TextExporter(BaseExporter):
    """Texto puro, legível em qualquer aparelho."""

    @property
    def format(self) -> str:
        return "txt"

    @property
    def content_type(self) -> str:
        return "text/plain; charset=utf-8"

    def export(
        self, conversation: Conversation, messages: Sequence[ChatMessage], clinic_name: str
    ) -> ExportedFile:
        linhas = [
            clinic_name,
            "Histórico de atendimento",
            "=" * 52,
            f"Contato......: {conversation.display_name}",
            f"Canal........: {conversation.channel}",
            f"Início.......: {self._stamp(conversation.created_at)}",
            f"Última troca.: {self._stamp(conversation.last_message_at)}",
            f"Exportado em.: {datetime.now().strftime('%d/%m/%Y %H:%M')}",
            "=" * 52,
            "",
        ]
        for message in self._visible(messages):
            linhas.append(f"[{self._stamp(message.created_at)}] {self._author(message)}:")
            linhas.extend(f"    {linha}" for linha in message.content.splitlines())
            linhas.append("")
        linhas.append("-" * 52)
        linhas.append("Documento gerado automaticamente pelo assistente SorriDente.")
        return ExportedFile(
            filename=f"{self._basename(conversation)}.txt",
            content_type=self.content_type,
            data="\n".join(linhas).encode("utf-8"),
        )


class MarkdownExporter(BaseExporter):
    """Markdown, para colar em prontuário ou relatório."""

    @property
    def format(self) -> str:
        return "md"

    @property
    def content_type(self) -> str:
        return "text/markdown; charset=utf-8"

    def export(
        self, conversation: Conversation, messages: Sequence[ChatMessage], clinic_name: str
    ) -> ExportedFile:
        linhas = [
            f"# {clinic_name} — histórico de atendimento",
            "",
            f"- **Contato:** {conversation.display_name}",
            f"- **Canal:** {conversation.channel}",
            f"- **Início:** {self._stamp(conversation.created_at)}",
            f"- **Exportado em:** {datetime.now().strftime('%d/%m/%Y %H:%M')}",
            "",
            "---",
            "",
        ]
        for message in self._visible(messages):
            linhas.append(f"**{self._author(message)}** · {self._stamp(message.created_at)}")
            linhas.append("")
            linhas.extend(f"> {linha}" for linha in message.content.splitlines())
            linhas.append("")
        return ExportedFile(
            filename=f"{self._basename(conversation)}.md",
            content_type=self.content_type,
            data="\n".join(linhas).encode("utf-8"),
        )


class HtmlExporter(BaseExporter):
    """HTML autocontido, pronto para imprimir ou salvar em PDF pelo navegador."""

    @property
    def format(self) -> str:
        return "html"

    @property
    def content_type(self) -> str:
        return "text/html; charset=utf-8"

    def export(
        self, conversation: Conversation, messages: Sequence[ChatMessage], clinic_name: str
    ) -> ExportedFile:
        blocos: list[str] = []
        for message in self._visible(messages):
            classe = {
                "user": "paciente",
                "assistant": "agente",
                "human_agent": "equipe",
            }.get(message.author, "agente")
            blocos.append(
                f'<div class="msg {classe}">'
                f'<span class="meta">{html.escape(self._author(message))} · '
                f"{self._stamp(message.created_at)}</span>"
                f"<p>{html.escape(message.content).replace(chr(10), '<br>')}</p></div>"
            )

        documento = f"""<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>{html.escape(clinic_name)} — histórico de atendimento</title>
<style>
  body {{ font-family: -apple-system, "Segoe UI", Roboto, sans-serif; background: #f5f7fb;
         color: #1f2733; margin: 0; padding: 32px; }}
  .folha {{ max-width: 760px; margin: 0 auto; background: #fff; border-radius: 12px;
            padding: 32px; box-shadow: 0 2px 12px rgba(0,0,0,.06); }}
  h1 {{ font-size: 20px; margin: 0 0 4px; }}
  .cabecalho {{ color: #6b7686; font-size: 13px; margin-bottom: 24px; }}
  .msg {{ margin-bottom: 16px; padding: 12px 16px; border-radius: 10px; }}
  .paciente {{ background: #eef4ff; }}
  .agente {{ background: #f4f6fa; }}
  .equipe {{ background: #f2fbef; }}
  .meta {{ display: block; font-size: 11px; color: #6b7686; margin-bottom: 4px; }}
  p {{ margin: 0; line-height: 1.5; white-space: pre-wrap; }}
  footer {{ margin-top: 24px; font-size: 11px; color: #8a94a6; text-align: center; }}
  @media print {{ body {{ background: #fff; padding: 0; }} .folha {{ box-shadow: none; }} }}
</style></head>
<body><div class="folha">
<h1>{html.escape(clinic_name)}</h1>
<div class="cabecalho">
  Histórico de atendimento · {html.escape(conversation.display_name)} ·
  canal {html.escape(conversation.channel)} ·
  exportado em {datetime.now().strftime('%d/%m/%Y %H:%M')}
</div>
{"".join(blocos)}
<footer>Documento gerado automaticamente pelo assistente SorriDente.</footer>
</div></body></html>"""
        return ExportedFile(
            filename=f"{self._basename(conversation)}.html",
            content_type=self.content_type,
            data=documento.encode("utf-8"),
        )
