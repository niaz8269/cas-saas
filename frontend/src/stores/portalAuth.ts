import { create } from "zustand"
import { persist } from "zustand/middleware"

export type PortalKind = "agent" | "student"

export interface PortalProfile {
  id: number
  name: string
  email: string | null
  status: string
  /** agent | student, echoed for display */
  code: string
  /** students only — whether they've confirmed their email */
  email_verified?: boolean
}

interface PortalAuthState {
  token: string | null
  kind: PortalKind | null
  profile: PortalProfile | null
  setAuth: (token: string, kind: PortalKind, profile: PortalProfile) => void
  setProfile: (profile: PortalProfile) => void
  clearAuth: () => void
}

export const usePortalAuthStore = create<PortalAuthState>()(
  persist(
    (set) => ({
      token: null,
      kind: null,
      profile: null,
      setAuth: (token, kind, profile) => set({ token, kind, profile }),
      setProfile: (profile) => set({ profile }),
      clearAuth: () => set({ token: null, kind: null, profile: null }),
    }),
    { name: "cas-portal-auth" },
  ),
)
