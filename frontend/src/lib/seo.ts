import { useEffect } from "react"
import { useLocation } from "react-router-dom"

import { serverPage } from "@/lib/serverContent"

const SITE_NAME = "CAS"
const COMPANY_NAME = "CAS"
const ALTERNATE_NAMES = ["CAS - Study in China", "CAS Study in China", "CAS-Consultancy for Abroad Study", "CAS Consultancy for Abroad Study", "Consultancy for Abroad Study"]

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
  /**
   * Leave the title and description the server sent in place (on the page the visitor arrived on).
   * Set it while the page's own data is still loading or failed to load, so a page never trades its
   * real title for a generic one that every other unloaded page shares.
   */
  keepServerHead?: boolean
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

// The server prints structured data for the page it serves. Remember which page that was, so the data can be
// dropped when the visitor moves on, and so a page that sends its own FAQ data does not end up with two copies.
const PRERENDERED_PATH = typeof window !== "undefined" ? window.location.pathname : ""
if (typeof document !== "undefined") {
  document.head.querySelectorAll('script[type="application/ld+json"]').forEach((el) => el.setAttribute("data-prerendered", ""))
}

function removePrerendered(pathname: string, ld: string | null) {
  const left = pathname !== PRERENDERED_PATH
  const sendsFaq = Boolean(ld && ld.includes('"FAQPage"'))
  document.head.querySelectorAll('script[type="application/ld+json"][data-prerendered]').forEach((el) => {
    if (left || (sendsFaq && (el.textContent ?? "").includes('"FAQPage"'))) el.remove()
  })
}

/**
 * Per-page SEO: sets the document title, meta description, canonical URL,
 * Open Graph / Twitter cards and optional JSON-LD structured data. Googlebot
 * renders JS and picks these up; a prerender/SSG step makes them bulletproof.
 */
export function useSeo({ title, description: ownDescription, canonicalPath, image, jsonLd, keepServerHead = false }: SeoOptions) {
  const { pathname } = useLocation()
  const ld = jsonLd ? JSON.stringify(jsonLd) : null

  useEffect(() => {
    const base = baseUrl()
    const kept = keepServerHead ? serverPage(pathname) : null
    const description = kept ? kept.description ?? ownDescription : ownDescription
    // The home page leads with the brand name, "CAS: ...": it is the name search engines show for the site.
    const fullTitle = kept ? kept.title : canonicalPath === "/" ? `${SITE_NAME} | ${title ?? "Study in China: Apply to Chinese Universities Online"}` : title ? `${title} | CAS` : SITE_NAME
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

    removePrerendered(pathname, ld)

    let script: HTMLScriptElement | null = null
    if (ld) {
      script = document.createElement("script")
      script.type = "application/ld+json"
      script.text = ld
      document.head.appendChild(script)
    }

    return () => { script?.remove() }
  }, [title, ownDescription, canonicalPath, image, ld, pathname, keepServerHead])
}

/** Organization structured data — attach to the home page. */
export function organizationJsonLd(): Record<string, unknown> {
  const base = baseUrl()

  return {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: COMPANY_NAME,
    alternateName: ALTERNATE_NAMES,
    url: base,
    logo: `${base}/og-image.png`,
    description:
      "CAS-Consultancy for Abroad Study places international students into Ministry of Education–listed universities across China, with full support from application to arrival.",
    sameAs: ["https://www.cas.moe"],
  }
}
