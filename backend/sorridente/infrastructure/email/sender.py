"""Envio de e-mails transacionais (confirmação de agendamento, avisos)."""
from __future__ import annotations

import asyncio
import logging
import smtplib
from email.message import EmailMessage
from typing import Any, Optional

logger = logging.getLogger(__name__)


class EmailSender:
    """Envia e-mails via SMTP quando configurado; caso contrário, apenas registra em log.

    Nunca falha a operação de negócio: o envio é best-effort e os erros são
    capturados para não quebrar o agendamento.
    """

    def __init__(
        self,
        host: str = "",
        port: int = 587,
        username: str = "",
        password: str = "",
        sender: str = "",
        starttls: bool = True,
        use_ssl: bool = False,
    ) -> None:
        self._host = host or ""
        self._port = port
        self._username = username or ""
        self._password = password or ""
        self._sender = sender or username or "SorriDente <nao-responda@sorridente.local>"
        self._starttls = starttls
        self._use_ssl = use_ssl

    @property
    def enabled(self) -> bool:
        return bool(self._host)

    def _send_sync(self, to: str, subject: str, text: str, html: str = "") -> None:
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = self._sender
        msg["To"] = to
        msg.set_content(text)
        if html:
            msg.add_alternative(html, subtype="html")

        if self._use_ssl:
            with smtplib.SMTP_SSL(self._host, self._port, timeout=20) as server:
                self._authenticate(server)
                server.send_message(msg)
        else:
            with smtplib.SMTP(self._host, self._port, timeout=20) as server:
                server.ehlo()
                if self._starttls:
                    server.starttls()
                    server.ehlo()
                self._authenticate(server)
                server.send_message(msg)

    def _authenticate(self, server: smtplib.SMTP) -> None:
        if self._username and self._password:
            server.login(self._username, self._password)

    async def send(self, to: str, subject: str, text: str, html: str = "") -> bool:
        """Envia um e-mail; devolve False (sem lançar) quando não configurado ou falhar."""
        to = (to or "").strip()
        if not to or "@" not in to:
            logger.info("E-mail ignorado (destinatário ausente): %s", subject)
            return False
        if not self.enabled:
            logger.info("SMTP não configurado — e-mail não enviado para %s: %s", to, subject)
            return False
        try:
            await asyncio.to_thread(self._send_sync, to, subject, text, html)
            logger.info("E-mail enviado para %s: %s", to, subject)
            return True
        except Exception as exc:  # noqa: BLE001 - envio best-effort
            logger.warning("Falha ao enviar e-mail para %s (%s): %s", to, subject, exc)
            return False

    async def send_appointment_confirmation(self, appointment: Any, patient: Any) -> bool:
        """Confirmação de agendamento enviada ao paciente."""
        inicio = appointment.start.replace("T", " ")
        procedimento = appointment.procedure_name or "Consulta"
        profissional = appointment.dentist_name or "Equipe SorriDente"
        assunto = f"Consulta confirmada — {inicio}"
        texto = (
            f"Olá, {patient.name}!\n\n"
            "Sua consulta foi agendada na SorriDente:\n\n"
            f"• Procedimento: {procedimento}\n"
            f"• Profissional: {profissional}\n"
            f"• Data e hora: {inicio}\n"
            f"• Duração: {appointment.duration_minutes} minutos\n\n"
            "Guarde este e-mail como comprovante. Para remarcar ou cancelar, "
            "fale com o SorriDente no portal ou pelo WhatsApp.\n\n"
            "Até lá! 🦷\nClínica SorriDente"
        )
        html = (
            f"<div style=\"font-family:Arial,sans-serif;color:#1f2937;line-height:1.6\">"
            f"<h2 style=\"color:#1677ff\">Consulta confirmada 🦷</h2>"
            f"<p>Olá, <b>{patient.name}</b>! Sua consulta foi agendada:</p>"
            "<table style=\"border-collapse:collapse\">"
            f"<tr><td style=\"padding:6px 12px 6px 0;color:#6b7280\">Procedimento</td><td><b>{procedimento}</b></td></tr>"
            f"<tr><td style=\"padding:6px 12px 6px 0;color:#6b7280\">Profissional</td><td><b>{profissional}</b></td></tr>"
            f"<tr><td style=\"padding:6px 12px 6px 0;color:#6b7280\">Data e hora</td><td><b>{inicio}</b></td></tr>"
            f"<tr><td style=\"padding:6px 12px 6px 0;color:#6b7280\">Duração</td><td><b>{appointment.duration_minutes} min</b></td></tr>"
            "</table>"
            "<p style=\"color:#6b7280;font-size:13px\">Para remarcar ou cancelar, fale com o "
            "SorriDente no portal ou pelo WhatsApp.</p>"
            "<p>Clínica <b>SorriDente</b></p></div>"
        )
        return await self.send(patient.email, assunto, texto, html)

    async def send_appointment_update(self, appointment: Any, patient: Any, motivo: str = "remarcada") -> bool:
        """Aviso de remarcação ou cancelamento."""
        inicio = appointment.start.replace("T", " ")
        assunto = f"Consulta {motivo} — {inicio}"
        texto = (
            f"Olá, {patient.name}!\n\n"
            f"Sua consulta foi {motivo}.\n\n"
            f"• Procedimento: {appointment.procedure_name or 'Consulta'}\n"
            f"• Profissional: {appointment.dentist_name or 'Equipe SorriDente'}\n"
            f"• Data e hora: {inicio}\n\n"
            "Qualquer dúvida, fale com o SorriDente no portal ou pelo WhatsApp.\n\n"
            "Clínica SorriDente 🦷"
        )
        return await self.send(patient.email, assunto, texto)

    async def send_appointment_reminder(self, appointment: Any, patient: Any) -> bool:
        """Lembrete enviado ao paciente na véspera/janela da consulta."""
        inicio = appointment.start.replace("T", " ")
        procedimento = appointment.procedure_name or "Consulta"
        profissional = appointment.dentist_name or "Equipe SorriDente"
        assunto = f"Lembrete da sua consulta — {inicio}"
        texto = (
            f"Olá, {patient.name}! 🦷\n\n"
            "Está chegando o dia da sua consulta na SorriDente:\n\n"
            f"• Procedimento: {procedimento}\n"
            f"• Profissional: {profissional}\n"
            f"• Data e hora: {inicio}\n\n"
            "Chegue 10 minutos antes com documento e carteirinha do convênio (se tiver).\n"
            "Para remarcar ou cancelar, é só responder por aqui.\n\n"
            "Até logo!\nClínica SorriDente"
        )
        return await self.send(patient.email, assunto, texto)
