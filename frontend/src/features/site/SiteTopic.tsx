import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"

import ServerContent, { LoadError } from "@/components/ServerContent"
import { getSiteTopic, isMissing, retryUnlessMissing } from "@/features/site/api"
import { SitePageHeader } from "@/features/site/components"
import { HEADER_IMAGES } from "@/features/site/headerImages"
import SiteNotFound from "@/features/site/SiteNotFound"
import { useSeo } from "@/lib/seo"

/** A landing page for one search topic (BDS in China, MBBS for Pakistani students, ...). The copy comes from the server. */
export default function SiteTopic() {
  const { topic = "" } = useParams()
  const { data, isError, isLoading, error } = useQuery({ queryKey: ["site-topic", topic], queryFn: () => getSiteTopic(topic), retry: retryUnlessMissing })
  const page = data?.data

  useSeo({
    title: page?.title ?? "",
    description: page?.description,
    canonicalPath: `/site/${topic}`,
    keepServerHead: !page,
    jsonLd: page?.faq.length
      ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: page.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }
      : undefined,
  })

  // "Not found" only when the server says so; a failed request shows the content the server sent.
  if (isError) return isMissing(error) ? <SiteNotFound /> : <ServerContent fallback={<LoadError />} />
  if (isLoading || !page) return <div className="h-96" aria-busy="true" />

  return (
    <div className="space-y-10">
      <SitePageHeader eyebrow={page.eyebrow} title={page.h1} subtitle={page.intro} image={HEADER_IMAGES.default} />
      <p className="max-w-3xl rounded-sm border-l-4 border-cas-navy bg-cas-navy-50 p-4 text-sm font-medium leading-relaxed text-foreground">{page.answer}</p>
      {page.facts && (
        <section className="max-w-3xl rounded-sm border bg-card p-5 text-sm shadow-sm">
          <h2 className="text-base font-semibold text-cas-navy">On CAS right now</h2>
          <p className="mt-2">
            {page.facts.programs} matching programs at {page.facts.universities} universities.
            {page.facts.tuition && ` Public tuition runs from ${page.facts.tuition.min.toLocaleString("en-US")} to ${page.facts.tuition.max.toLocaleString("en-US")} ${page.facts.tuition.currency} a year across ${page.facts.tuition.programs} programs.`}
          </p>
          {page.facts.deadlines.length > 0 && (
            <>
              <h3 className="mt-3 font-semibold">Next application deadlines</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {page.facts.deadlines.map((d) => (
                  <li key={d.slug + d.date}><Link to={`/site/universities/${d.slug}`} className="text-cas-navy hover:underline">{d.university}</Link>: {d.date}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
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
      <p className="max-w-3xl text-xs text-muted-foreground">Last reviewed {page.updated}. Fees and dates change each year: confirm them on the university page before you apply.</p>
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
