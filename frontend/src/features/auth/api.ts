import { api } from "@/lib/api"
import type { AuthUser } from "@/types/auth"

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  token_type: string
  user: AuthUser
}

export const login = (payload: LoginPayload) =>
  api<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ ...payload, device_name: "cas-spa" }),
  })

export const logout = () => api<{ message: string }>("/auth/logout", { method: "POST" })

export const fetchMe = () => api<{ data: AuthUser }>("/auth/me")
