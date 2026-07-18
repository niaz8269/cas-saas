import { api } from "@/lib/api"

export interface SearchResult {
  type: "student" | "lead" | "application" | "university"
  id: number
  label: string
  sublabel: string | null
}

export const globalSearch = (q: string) =>
  api<{ data: SearchResult[] }>(`/search?q=${encodeURIComponent(q)}`)
