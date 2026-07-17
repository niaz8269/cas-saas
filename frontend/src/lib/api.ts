import { useAuthStore } from "@/stores/auth"

export interface ApiErrorPayload {
  message: string
  errors?: Record<string, string[]>
  code?: string
}

export class ApiError extends Error {
  readonly status: number
  readonly errors: Record<string, string[]>
  readonly code: string
  /** Full response body for endpoint-specific fields (e.g. `missing`). */
  readonly payload: Record<string, unknown>

  constructor(status: number, payload: ApiErrorPayload & Record<string, unknown>) {
    super(payload.message || `HTTP ${status}`)
    this.name = "ApiError"
    this.status = status
    this.errors = payload.errors ?? {}
    this.code = payload.code ?? "HTTP_ERROR"
    this.payload = payload
  }
}

const BASE = "/api/v1"

/**
 * Typed fetch wrapper for the CAS API. Attaches the bearer token, speaks the
 * {message, errors, code} error envelope, and clears auth on 401 so guarded
 * routes bounce back to /login.
 */
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token

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
      useAuthStore.getState().clearAuth()
    }
    throw new ApiError(response.status, data ?? { message: `HTTP ${response.status}` })
  }

  return data as T
}
