import { api } from "@/lib/api"
import type { Paginated } from "@/features/catalog/api"

export interface MarketingSource {
  id: number
  name: string
  channel: string | null
  is_active: boolean
  campaigns_count?: number
}

export interface Campaign {
  id: number
  name: string
  marketing_source_id: number | null
  marketing_source?: { id: number; name: string } | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  start_date: string | null
  end_date: string | null
}

export interface CampaignPayload {
  name: string
  marketing_source_id?: number | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  start_date?: string | null
  end_date?: string | null
}

export interface MarketingSourcePayload {
  name: string
  channel?: string | null
  is_active?: boolean
}

// ── Campaigns ──────────────────────────────────────────────────────────────

export const listCampaigns = () => api<Paginated<Campaign>>("/campaigns?per_page=100")

export const createCampaign = (payload: CampaignPayload) =>
  api<{ data: Campaign }>("/campaigns", { method: "POST", body: JSON.stringify(payload) })

export const updateCampaign = (id: number, payload: CampaignPayload) =>
  api<{ data: Campaign }>(`/campaigns/${id}`, { method: "PATCH", body: JSON.stringify(payload) })

export const deleteCampaign = (id: number) =>
  api<void>(`/campaigns/${id}`, { method: "DELETE" })

// ── Marketing sources ──────────────────────────────────────────────────────

export const listMarketingSources = () => api<Paginated<MarketingSource>>("/marketing-sources?per_page=100")

export const createMarketingSource = (payload: MarketingSourcePayload) =>
  api<{ data: MarketingSource }>("/marketing-sources", { method: "POST", body: JSON.stringify(payload) })

export const updateMarketingSource = (id: number, payload: MarketingSourcePayload) =>
  api<{ data: MarketingSource }>(`/marketing-sources/${id}`, { method: "PATCH", body: JSON.stringify(payload) })

export const deleteMarketingSource = (id: number) =>
  api<void>(`/marketing-sources/${id}`, { method: "DELETE" })

// ── Website sources (lead-attribution domains) ──────────────────────────────

export interface WebsiteSource {
  id: number
  domain: string
  university_focus: string | null
  api_source_id: number | null
  is_active: boolean
}

export interface WebsiteSourcePayload {
  domain: string
  university_focus?: string | null
  is_active?: boolean
}

export const listWebsiteSources = () => api<Paginated<WebsiteSource>>("/website-sources?per_page=100")

export const createWebsiteSource = (payload: WebsiteSourcePayload) =>
  api<{ data: WebsiteSource }>("/website-sources", { method: "POST", body: JSON.stringify(payload) })

export const updateWebsiteSource = (id: number, payload: WebsiteSourcePayload) =>
  api<{ data: WebsiteSource }>(`/website-sources/${id}`, { method: "PATCH", body: JSON.stringify(payload) })

export const deleteWebsiteSource = (id: number) =>
  api<void>(`/website-sources/${id}`, { method: "DELETE" })
