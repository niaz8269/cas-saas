import { api } from "@/lib/api"

export const COMM_CHANNELS = [
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "SMS" },
  { value: "in_app", label: "In-app" },
] as const

export const COMM_TEMPLATES = [
  { value: "welcome", label: "Welcome" },
  { value: "offer_received", label: "Offer received" },
  { value: "visa_approved", label: "Visa approved" },
  { value: "payment_reminder", label: "Payment reminder" },
  { value: "custom", label: "Custom message" },
] as const

export interface SendCommunicationPayload {
  channel: string
  template: string
  body?: string
}

export interface CommunicationRow {
  id: number
  channel: string
  template: string | null
  status: string
  created_at: string | null
}

export const sendCommunication = (studentId: number | string, payload: SendCommunicationPayload) =>
  api<{ data: CommunicationRow }>(`/students/${studentId}/communications`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
