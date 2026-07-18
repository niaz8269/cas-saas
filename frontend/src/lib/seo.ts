import { useEffect } from "react"
import { useLocation } from "react-router-dom"

const SITE_NAME = "CAS — Consultancy for Abroad Study"

/** Production origin for canonical/OG URLs. Falls back to the live origin so
 *  canonicals are always self-referential and valid wherever this deploys. */
function baseUrl(): string {
  const env = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, "")

  return env || (typeof window !== "undefined" ? window.location.origin : "")
}

export interface SeoOptions {
  title: string
  description?: string
  /** Canonical path, e.g. "/site/programs". Defaults to the current path. */
  canonicalPath?: string
  image?: string
  /** JSON-LD structured data object(s) for rich results. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement("meta")
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute("content", content)
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement("link")
    el.setAttribute("rel", "canonical")
    document.head.appendChild(el)
  }
  el.setAttribute("href", href)
}

/**
 * Per-page SEO: sets the document title, meta description, canonical URL,
 * Open Graph / Twitter cards and optional JSON-LD structured data. Googlebot
 * renders JS and picks these up; a prerender/SSG step makes them bulletproof.
 */
export function useSeo({ title, description, canonicalPath, image, jsonLd }: SeoOptions) {
  const { pathname } = useLocation()
  const ld = jsonLd ? JSON.stringify(jsonLd) : null

  useEffect(() => {
    const base = baseUrl()
    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME
    const url = base + (canonicalPath ?? pathname)
    const img = image ?? `${base}/og-image.png`

    document.title = fullTitle
    if (description) upsertMeta("name", "description", description)
    upsertCanonical(url)

    upsertMeta("property", "og:title", fullTitle)
    upsertMeta("property", "og:type", "website")
    upsertMeta("property", "og:url", url)
    upsertMeta("property", "og:site_name", SITE_NAME)
    upsertMeta("property", "og:image", img)
    upsertMeta("name", "twitter:card", "summary_large_image")
    upsertMeta("name", "twitter:title", fullTitle)
    if (description) {
      upsertMeta("property", "og:description", description)
      upsertMeta("name", "twitter:description", description)
    }

    let script: HTMLScriptElement | null = null
    if (ld) {
      script = document.createElement("script")
      script.type = "application/ld+json"
      script.text = ld
      document.head.appendChild(script)
    }

    return () => { script?.remove() }
  }, [title, description, canonicalPath, image, ld, pathname])
}

/** Organization structured data — attach to the home page. */
export function organizationJsonLd(): Record<string, unknown> {
  const base = baseUrl()

  return {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: SITE_NAME,
    alternateName: "CAS Education",
    url: base,
    logo: `${base}/og-image.png`,
    description:
      "CAS — Consultancy for Abroad Study places international students into Ministry of Education–listed universities across China, with full support from application to arrival.",
    sameAs: ["https://www.cas.moe"],
  }
}
