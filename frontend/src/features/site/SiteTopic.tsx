import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"

import { getSiteTopic } from "@/features/site/api"
import { SitePageHeader } from "@/features/site/components"
import { HEADER_IMAGES } from "@/features/site/headerImages"
import SiteNotFound from "@/features/site/SiteNotFound"
import { useSeo } from "@/lib/seo"

/** A landing page for one search topic (BDS in China, MBBS for Pakistani students, ...). The copy comes from the server. */
export default function SiteTopic() {
  const { topic = "" } = useParams()
  const { data, isError, isLoading } = useQuery({ queryKey: ["site-topic", topic], queryFn: () => getSiteTopic(topic), retry: false })
  const page = data?.data

  useSeo({
    title: page?.title ?? "",
    description: page?.description,
    canonicalPath: `/site/${topic}`,
    jsonLd: page?.faq.length
      ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: page.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }
      : undefined,
  })

  if (isError) return <SiteNotFound />
  if (isLoading || !page) return <div className="h-96" aria-busy="true" />

  return (
    <div className="space-y-10">
      <SitePageHeader eyebrow={page.eyebrow} title={page.h1} subtitle={page.intro} image={HEADER_IMAGES.default} />
      <article className="max-w-3xl space-y-4 text-sm leading-relaxed text-foreground/90">
        {page.sections.map((s) => (
          <section key={s.h} className="space-y-3">
            <h2 className="pt-2 text-lg font-semibold text-cas-navy">{s.h}</h2>
            {s.p?.map((para) => <p key={para}>{para}</p>)}
            {s.ul && <ul className="list-disc space-y-1.5 pl-5">{s.ul.map((i) => <li key={i}>{i}</li>)}</ul>}
          </section>
        ))}
        {page.faq.length > 0 && (
          <section className="space-y-3">
            <h2 className="pt-2 text-lg font-semibold text-cas-navy">Frequently asked questions</h2>
            {page.faq.map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold text-foreground">{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
          </section>
        )}
      </article>
      {page.related_links.length > 0 && (
        <section className="max-w-3xl">
          <h2 className="text-lg font-semibold text-cas-navy">Related</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">
            {page.related_links.map((l) => <li key={l.path}><Link to={l.path} className="text-cas-navy hover:underline">{l.title}</Link></li>)}
          </ul>
        </section>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-sm bg-cas-navy p-6 text-white">
        <p className="text-sm font-medium">Get a free study plan from a CAS counselor.</p>
        <div className="flex gap-3">
          <Link to={`/site/programs?q=${encodeURIComponent(page.search)}`} className="inline-flex h-10 items-center rounded-sm border border-white/30 px-5 text-sm font-semibold hover:bg-white/10">Find programs</Link>
          <Link to="/site/study-plan" className="inline-flex h-10 items-center rounded-sm bg-cas-red px-5 text-sm font-semibold hover:bg-cas-red-600">Free study plan</Link>
        </div>
      </div>
    </div>
  )
}
