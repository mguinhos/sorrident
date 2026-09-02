import type {
  AgentTasks,
  Appointment,
  ChatMessage,
  ClinicSettings,
  Conversation,
  DashboardData,
  Dentist,
  FAQ,
  Integration,
  IntegrationsOverview,
  KnowledgeDocument,
  KnowledgeHit,
  KnowledgeOverview,
  Notification,
  Patient,
  Procedure,
  Slot,
  User,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
const TOKEN_KEY = "sorridente.token";
const USER_KEY = "sorridente.user";

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

/** Guarda a sessão do usuário no navegador. */
export class SessionStore {
  get token(): string {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(TOKEN_KEY) ?? "";
  }

  get user(): User | null {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  }

  save(token: string, user: User): void {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  clear(): void {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  }
}

/** Cliente único de acesso à API do SorriDente. */
export class ApiClient {
  constructor(
    private readonly baseUrl: string = BASE_URL,
    private readonly session: SessionStore = new SessionStore(),
  ) {}

  get sessionStore(): SessionStore {
    return this.session;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = this.session.token;
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });
    if (!response.ok) {
      let detail = `Erro ${response.status}`;
      try {
        const body = await response.json();
        detail = body.detail ?? detail;
      } catch {
        /* resposta sem corpo JSON */
      }
      throw new ApiError(response.status, detail);
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  private get<T>(path: string): Promise<T> {
    return this.request<T>(path);
  }

  private send<T>(method: string, path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  // Autenticação
  async login(username: string, password: string): Promise<User> {
    const data = await this.send<{ token: string; user: User }>("POST", "/auth/login", {
      username,
      password,
    });
    this.session.save(data.token, data.user);
    return data.user;
  }

  logout(): void {
    this.session.clear();
  }

  me(): Promise<User> {
    return this.get<User>("/auth/me");
  }

  // Pacientes
  listPatients(search = ""): Promise<Patient[]> {
    return this.get<Patient[]>(`/patients?search=${encodeURIComponent(search)}`);
  }
  getPatient(id: string): Promise<Patient> {
    return this.get<Patient>(`/patients/${id}`);
  }
  createPatient(data: Partial<Patient>): Promise<Patient> {
    return this.send("POST", "/patients", data);
  }
  updatePatient(id: string, data: Partial<Patient>): Promise<Patient> {
    return this.send("PUT", `/patients/${id}`, data);
  }
  deletePatient(id: string): Promise<{ deleted: boolean }> {
    return this.send("DELETE", `/patients/${id}`);
  }

  // Profissionais e procedimentos
  listDentists(onlyActive = false): Promise<Dentist[]> {
    return this.get<Dentist[]>(`/dentists?only_active=${onlyActive}`);
  }
  createDentist(data: Partial<Dentist>): Promise<Dentist> {
    return this.send("POST", "/dentists", data);
  }
  updateDentist(id: string, data: Partial<Dentist>): Promise<Dentist> {
    return this.send("PUT", `/dentists/${id}`, data);
  }
  deleteDentist(id: string): Promise<{ deleted: boolean }> {
    return this.send("DELETE", `/dentists/${id}`);
  }
  listProcedures(onlyActive = false): Promise<Procedure[]> {
    return this.get<Procedure[]>(`/procedures?only_active=${onlyActive}`);
  }
  createProcedure(data: Partial<Procedure>): Promise<Procedure> {
    return this.send("POST", "/procedures", data);
  }
  updateProcedure(id: string, data: Partial<Procedure>): Promise<Procedure> {
    return this.send("PUT", `/procedures/${id}`, data);
  }
  deleteProcedure(id: string): Promise<{ deleted: boolean }> {
    return this.send("DELETE", `/procedures/${id}`);
  }

  // Agendamentos
  listAppointments(params: { status?: string; patient_id?: string; dentist_id?: string } = {}): Promise<Appointment[]> {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => Boolean(v)) as [string, string][],
    );
    return this.get<Appointment[]>(`/appointments?${query.toString()}`);
  }
  agenda(start: string, days = 7): Promise<Appointment[]> {
    return this.get<Appointment[]>(`/appointments/agenda?start=${start}&days=${days}`);
  }
  slots(day: string, dentistId = "", duration = 0): Promise<Slot[]> {
    return this.get<Slot[]>(
      `/appointments/slots?day=${day}&dentist_id=${dentistId}&duration=${duration}`,
    );
  }
  createAppointment(data: {
    patient_id: string;
    start: string;
    dentist_id?: string;
    procedure_id?: string;
    notes?: string;
  }): Promise<Appointment> {
    return this.send("POST", "/appointments", data);
  }
  rescheduleAppointment(id: string, start: string): Promise<Appointment> {
    return this.send("PUT", `/appointments/${id}/reschedule`, { start });
  }
  setAppointmentStatus(id: string, status: string): Promise<Appointment> {
    return this.send("PUT", `/appointments/${id}/status`, { status });
  }
  cancelAppointment(id: string, reason = ""): Promise<Appointment> {
    return this.send("POST", `/appointments/${id}/cancel`, { reason });
  }

  // Conversas
  listConversations(): Promise<Conversation[]> {
    return this.get<Conversation[]>("/conversations");
  }
  getConversation(id: string): Promise<{ conversation: Conversation; messages: ChatMessage[] }> {
    return this.get(`/conversations/${id}`);
  }
  markConversationRead(id: string): Promise<Conversation> {
    return this.send("POST", `/conversations/${id}/read`);
  }
  setHandoff(id: string, handoff: boolean): Promise<Conversation> {
    return this.send("POST", `/conversations/${id}/handoff`, { handoff });
  }
  replyConversation(id: string, message: string): Promise<{ delivered: boolean }> {
    return this.send("POST", `/conversations/${id}/reply`, { message });
  }

  // Notificações
  listNotifications(onlyUnread = false): Promise<Notification[]> {
    return this.get<Notification[]>(`/notifications?only_unread=${onlyUnread}`);
  }
  readNotification(id: string): Promise<Notification> {
    return this.send("POST", `/notifications/${id}/read`);
  }
  readAllNotifications(): Promise<{ updated: number }> {
    return this.send("POST", "/notifications/read-all");
  }

  // Conhecimento e configurações
  listFaqs(): Promise<FAQ[]> {
    return this.get<FAQ[]>("/faqs");
  }
  createFaq(data: { question: string; answer: string; tags: string[] }): Promise<FAQ> {
    return this.send("POST", "/faqs", data);
  }
  updateFaq(id: string, data: Partial<FAQ>): Promise<FAQ> {
    return this.send("PUT", `/faqs/${id}`, data);
  }
  deleteFaq(id: string): Promise<{ deleted: boolean }> {
    return this.send("DELETE", `/faqs/${id}`);
  }
  // Base de conhecimento (RAG)
  knowledge(): Promise<KnowledgeOverview> {
    return this.get<KnowledgeOverview>("/knowledge");
  }
  createDocument(data: { title: string; content: string; tags: string[] }): Promise<KnowledgeDocument> {
    return this.send("POST", "/knowledge", data);
  }
  updateDocument(id: string, data: Partial<KnowledgeDocument>): Promise<KnowledgeDocument> {
    return this.send("PUT", `/knowledge/${id}`, data);
  }
  deleteDocument(id: string): Promise<{ deleted: boolean }> {
    return this.send("DELETE", `/knowledge/${id}`);
  }
  reindexKnowledge(): Promise<{ indexed_chunks: number }> {
    return this.send("POST", "/knowledge/reindex");
  }
  searchKnowledge(query: string, limit = 5): Promise<{ query: string; results: KnowledgeHit[] }> {
    return this.get(`/knowledge/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  getSettings(): Promise<ClinicSettings> {
    return this.get<ClinicSettings>("/settings");
  }
  updateSettings(data: Partial<ClinicSettings>): Promise<ClinicSettings> {
    return this.send("PUT", "/settings", data);
  }

  // Chat do cliente
  sendChat(sessionId: string, message: string): Promise<{ conversation_id: string; reply: string; handoff: boolean }> {
    return this.send("POST", "/chat", { session_id: sessionId, message });
  }
  chatHistory(sessionId: string): Promise<{ conversation_id: string; handoff: boolean; messages: ChatMessage[] }> {
    return this.get(`/chat/history?session_id=${encodeURIComponent(sessionId)}`);
  }
  myAppointments(): Promise<Appointment[]> {
    return this.get<Appointment[]>("/chat/my-appointments");
  }

  // Painel e integrações
  dashboard(): Promise<DashboardData> {
    return this.get<DashboardData>("/dashboard");
  }
  integrations(): Promise<IntegrationsOverview> {
    return this.get<IntegrationsOverview>("/integrations");
  }
  getIntegration(key: string): Promise<Integration> {
    return this.get<Integration>(`/integrations/${key}`);
  }
  saveIntegration(
    key: string,
    values: Record<string, unknown>,
    enable?: boolean,
  ): Promise<unknown> {
    return this.send("PUT", `/integrations/${key}`, { values, enable });
  }
  enableIntegration(key: string): Promise<unknown> {
    return this.send("POST", `/integrations/${key}/enable`);
  }
  disableIntegration(key: string): Promise<unknown> {
    return this.send("POST", `/integrations/${key}/disable`);
  }
  testIntegration(key: string): Promise<unknown> {
    return this.send("POST", `/integrations/${key}/test`);
  }
  activateInference(key: string): Promise<unknown> {
    return this.send("POST", `/integrations/${key}/activate-inference`);
  }
  agentTasks(limit = 30): Promise<AgentTasks> {
    return this.get<AgentTasks>(`/agent/tasks?limit=${limit}`);
  }

  /** Stream de eventos (SSE) para notificações em tempo real. */
  openEventStream(): EventSource {
    return new EventSource(`${this.baseUrl}/events?token=${encodeURIComponent(this.session.token)}`);
  }
}

export const api = new ApiClient();
