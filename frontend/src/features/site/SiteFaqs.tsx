import { useQuery } from "@tanstack/react-query"
import { ChevronDown } from "lucide-react"
import { useTranslation } from "react-i18next"

import { getPageFaqs, type SiteFaq } from "@/features/site/api"
import { cn } from "@/lib/utils"

/**
 * Questions and answers as native disclosure rows: every answer is in the page (so search engines and
 * assistive technology read it), opens with a click, Enter or Space, and needs no script to work.
 * The same list is printed by the server for crawlers, together with the FAQ structured data.
 */
export function FaqList({ faqs, title, className }: { faqs: SiteFaq[]; title?: string; className?: string }) {
  const { t } = useTranslation()
  if (faqs.length === 0) return null

  return (
    <section className={cn("max-w-3xl", className)} aria-labelledby="page-faqs-title">
      <h2 id="page-faqs-title" className="text-lg font-semibold text-cas-navy">{title ?? t("faqList.title", { defaultValue: "Frequently asked questions" })}</h2>
      <div className="mt-3 divide-y rounded-sm border bg-card">
        {faqs.map((f) => (
          <details key={f.q} className="group">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3 text-sm font-semibold text-foreground outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-cas-navy/50 focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
              <h3 className="font-semibold">{f.q}</h3>
              <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
            </summary>
            <p className="px-4 pb-4 text-sm leading-relaxed text-foreground/90">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

/** The questions of a fixed page (home, CSC, scholarships, ...), loaded from the same source the server prints. */
export default function PageFaqs({ path, className }: { path: string; className?: string }) {
  const { data } = useQuery({ queryKey: ["page-faqs", path], queryFn: () => getPageFaqs(path), staleTime: 60 * 60 * 1000 })

  return <FaqList faqs={Array.isArray(data?.data) ? data.data : []} className={className} />
}
