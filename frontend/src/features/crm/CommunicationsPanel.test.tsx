import { screen } from "@testing-library/react"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import CommunicationsPanel from "./CommunicationsPanel"

const COMMS = {
  data: [
    {
      id: 3, channel: "email", direction: "outbound", template: "offer_received",
      body: "Congratulations, your offer has arrived.", status: "sent", sent_by: "Demo Counselor",
      logs: [{ provider: "log", status: "sent", error: null, created_at: "2026-07-15T09:00:00Z" }],
      created_at: "2026-07-15T09:00:00Z",
    },
    {
      id: 2, channel: "whatsapp", direction: "outbound", template: "custom",
      body: "Quick reminder about your documents.", status: "failed", sent_by: "Demo Counselor",
      logs: [{ provider: "log", status: "failed", error: "no phone on file", created_at: "2026-07-14T09:00:00Z" }],
      created_at: "2026-07-14T09:00:00Z",
    },
  ],
  meta: { current_page: 1, last_page: 1, per_page: 50, total: 2, from: 1, to: 2 },
}

it("lists communications with channel, status and delivery logs", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(COMMS)))

  renderWithProviders(<CommunicationsPanel studentId="1" />)

  expect(await screen.findByText("Email")).toBeInTheDocument()
  expect(screen.getByText("sent")).toBeInTheDocument()
  expect(screen.getByText("WhatsApp")).toBeInTheDocument()
  expect(screen.getByText("failed")).toBeInTheDocument()
  // Failed delivery surfaces the provider error.
  expect(screen.getByText(/no phone on file/)).toBeInTheDocument()
})

it("shows an empty state when nothing has been sent", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: [], meta: { current_page: 1, last_page: 1, per_page: 50, total: 0, from: null, to: null } })))

  renderWithProviders(<CommunicationsPanel studentId="1" />)

  expect(await screen.findByText("No messages sent yet.")).toBeInTheDocument()
})
