"""Stub de tipos: contrato público de sorridente.scheduler."""
import abc
import asyncio
from .channels.manager import IChannelManager as IChannelManager
from .core.models import ChannelType as ChannelType, MessageAuthor as MessageAuthor, NotificationLevel as NotificationLevel
from .domain.repositories import PatientRepository as PatientRepository
from .domain.services.interfaces import IAppointmentService as IAppointmentService, IConversationService as IConversationService, INotificationService as INotificationService, ISettingsService as ISettingsService
from .rag.interfaces import IKnowledgeService as IKnowledgeService
from _typeshed import Incomplete
from abc import ABC, abstractmethod
from typing import Sequence

logger: Incomplete

class IBackgroundJob(ABC, metaclass=abc.ABCMeta):
    @property
    @abstractmethod
    def interval_seconds(self) -> int: ...
    @property
    def job_name(self) -> str: ...
    @abstractmethod
    async def run_once(self) -> None: ...

class IScheduler(ABC, metaclass=abc.ABCMeta):
    @abstractmethod
    def register(self, job: IBackgroundJob) -> IScheduler: ...
    @abstractmethod
    async def start(self) -> None: ...
    @abstractmethod
    async def stop(self) -> None: ...
    @property
    @abstractmethod
    def jobs(self) -> Sequence[IBackgroundJob]: ...

class AppointmentReminderJob(IBackgroundJob):
    _appointments: Incomplete
    _patients: Incomplete
    _channels: Incomplete
    _notifications: Incomplete
    _interval: Incomplete
    _window: Incomplete
    def __init__(self, appointments: IAppointmentService, patients: PatientRepository, channels: IChannelManager, notifications: INotificationService, interval_seconds: int = 900, window_hours: int = 24) -> None: ...
    @property
    def interval_seconds(self) -> int: ...
    async def run_once(self) -> None: ...

class ConversationTimeoutJob(IBackgroundJob):
    DESPEDIDA: str
    _conversations: Incomplete
    _channels: Incomplete
    _settings: Incomplete
    _interval: Incomplete
    def __init__(self, conversations: IConversationService, channels: IChannelManager, settings: ISettingsService, interval_seconds: int = 120) -> None: ...
    @property
    def interval_seconds(self) -> int: ...
    async def run_once(self) -> None: ...

class KnowledgeReindexJob(IBackgroundJob):
    _knowledge: Incomplete
    _interval: Incomplete
    def __init__(self, knowledge: IKnowledgeService, interval_seconds: int = 1800) -> None: ...
    @property
    def interval_seconds(self) -> int: ...
    async def run_once(self) -> None: ...

class BackgroundScheduler(IScheduler):
    _jobs: list[IBackgroundJob]
    _tasks: list[asyncio.Task[None]]
    def __init__(self) -> None: ...
    @property
    def jobs(self) -> Sequence[IBackgroundJob]: ...
    def register(self, job: IBackgroundJob) -> BackgroundScheduler: ...
    async def start(self) -> None: ...
    async def stop(self) -> None: ...
    @staticmethod
    async def _loop(job: IBackgroundJob) -> None: ...
