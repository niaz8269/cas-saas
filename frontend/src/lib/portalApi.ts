import { ApiError } from "@/lib/api"
import { usePortalAuthStore } from "@/stores/portalAuth"

const BASE = "/api/v1"

/**
 * Fetch wrapper for the portal SPA. Mirrors lib/api but reads the portal
 * token (separate from the staff `cas-auth` store) and clears portal auth
 * on 401 so the portal bounces to its own login.
 */
export async function portalApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = usePortalAuthStore.getState().token

  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (response.status === 204) return undefined as T

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    if (response.status === 401) {
      usePortalAuthStore.getState().clearAuth()
    }
    throw new ApiError(response.status, data ?? { message: `HTTP ${response.status}` })
  }

  return data as T
}
