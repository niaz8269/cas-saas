import type { TestimonialPayload } from "@/features/portal/api"
import { ApiError } from "@/lib/api"

const BASE = "/api/v1"

/** No sign-in is sent: this form is open to anyone with the link. */
async function post<T>(path: string, body: BodyInit, json: boolean): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { Accept: "application/json", ...(json ? { "Content-Type": "application/json" } : {}) },
    body,
  })
  const data = await response.json().catch(() => null)

  if (!response.ok) throw new ApiError(response.status, data ?? { message: `HTTP ${response.status}` })

  return data as T
}

export const submitPublicTestimonial = (payload: TestimonialPayload) =>
  post<{ data: { id: number; status: string } }>("/public/testimonials", JSON.stringify(payload), true)

export const uploadPublicTestimonialPhoto = (file: File) => {
  const form = new FormData()
  form.append("image", file)

  return post<{ path: string; url: string | null }>("/public/testimonials/photo", form, false)
}
