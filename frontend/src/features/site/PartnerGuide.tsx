import { useLocation } from "react-router-dom"

import { PARTNER_GUIDES } from "@/features/site/partnerGuides"

/** The one-sentence pointer to a guide on xjmu.online, on the few pages that have one. Renders nothing elsewhere. */
export default function PartnerGuide() {
  const { pathname } = useLocation()
  const parts = PARTNER_GUIDES[pathname.replace(/\/+$/, "")]
  if (!parts) return null

  return (
    <p className="mt-10 max-w-3xl text-sm leading-relaxed text-foreground/90">
      {parts.map((part, i) =>
        typeof part === "string"
          ? part
          : <a key={i} href={part[1]} target="_blank" rel="noopener" className="font-medium text-cas-navy underline underline-offset-2 hover:no-underline">{part[0]}</a>,
      )}
    </p>
  )
}
