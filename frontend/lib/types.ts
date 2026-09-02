export type Role = "cliente" | "gestor" | "medico";

export interface User {
  id: string;
  username: string;
  role: Role;
  display_name: string;
  linked_id: string;
  active: boolean;
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string;
  birth_date: string;
  document: string;
  insurance_provider: string;
  insurance_card: string;
  responsible_name: string;
  notes: string;
  treatment: string;
  telegram_id: string;
  active: boolean;
  created_at: string;
  appointments?: Appointment[];
}

export interface Dentist {
  id: string;
  name: string;
  cro: string;
  specialty: string;
  email: string;
  phone: string;
  color: string;
  active: boolean;
  availability: Record<string, string[][]>;
}

export interface Procedure {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
  active: boolean;
}

export type AppointmentStatus =
  | "agendado"
  | "confirmado"
  | "concluido"
  | "cancelado"
  | "faltou";

export interface Appointment {
  id: string;
  patient_id: string;
  patient_name: string;
  dentist_id: string;
  dentist_name: string;
  procedure_id: string;
  procedure_name: string;
  start: string;
  end: string;
  status: AppointmentStatus;
  notes: string;
  origin: string;
  reminder_sent: boolean;
}

export interface Slot {
  start: string;
  end: string;
  dentist_id: string;
  dentist_name: string;
}

export interface Conversation {
  id: string;
  channel: "web" | "telegram" | "whatsapp";
  external_id: string;
  patient_id: string;
  display_name: string;
  last_message_at: string;
  unread_for_staff: number;
  handoff: boolean;
  open: boolean;
  closed_at: string;
  closed_reason: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  author: "user" | "assistant" | "system" | "tool" | "human_agent";
  content: string;
  tool_name: string;
  tool_payload: Record<string, unknown>;
  created_at: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  level: "info" | "sucesso" | "alerta" | "erro";
  read: boolean;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  tags: string[];
  active: boolean;
}

export interface ClinicSettings {
  clinic_name: string;
  address: string;
  phone: string;
  email: string;
  opening_hour: string;
  closing_hour: string;
  lunch_start: string;
  lunch_end: string;
  working_days: number[];
  slot_minutes: number;
  inactivity_minutes: number;
  persona: string;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  source: "manual" | "faq" | "procedimento" | "clinica";
  source_id: string;
  tags: string[];
  active: boolean;
  created_at: string;
}

export interface KnowledgeOverview {
  documents: KnowledgeDocument[];
  indexed_chunks: number;
  indexed_documents: number;
  vocabulary: number;
}

export interface KnowledgeHit {
  id: string;
  document_id: string;
  title: string;
  content: string;
  source: string;
  position: number;
  score: number;
}

export interface DashboardData {
  patients_total: number;
  appointments_total: number;
  appointments_today: number;
  appointments_week: number;
  conversations_total: number;
  conversations_open: number;
  unread_messages: number;
  unread_notifications: number;
  by_status: Record<string, number>;
  by_channel: Record<string, number>;
  series_14d: { date: string; total: number }[];
  next_appointments: Appointment[];
}

export interface CredentialField {
  key: string;
  label: string;
  secret: boolean;
  required: boolean;
  placeholder: string;
  help_text: string;
  default: unknown;
}

export interface IntegrationStatus {
  key: string;
  kind: string;
  name: string;
  description: string;
  configured: boolean;
  enabled: boolean;
  running: boolean;
  detail: string;
  last_error: string;
  extra: Record<string, unknown>;
}

export interface Integration {
  key: string;
  kind: string;
  name: string;
  description: string;
  fields: CredentialField[];
  status: IntegrationStatus;
  values: Record<string, unknown>;
  active_inference: boolean;
}

export interface IntegrationsOverview {
  integrations: Integration[];
  kinds: string[];
  channels: { channel: string; running: boolean }[];
}

export interface ModelInfo {
  id: string;
  provider: string;
  display_name: string;
  supports: string[];
  context_window: number;
  max_output_tokens: number;
  notes: string;
}

export interface AgentSubTask {
  id: string;
  name: string;
  kind: string;
  status: string;
  arguments: Record<string, unknown>;
  result: unknown;
  error: string;
  duration_ms: number;
}

export interface AgentTask {
  id: string;
  conversation_id: string;
  kind: string;
  status: string;
  prompt: string;
  answer: string;
  error: string;
  iterations: number;
  duration_ms: number;
  subtasks: AgentSubTask[];
}

export interface AgentTasks {
  model: ModelInfo;
  tasks: AgentTask[];
}
