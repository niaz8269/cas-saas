import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"

import { getSiteTopics } from "@/features/site/api"

/** Links to every search-topic guide, grouped by subject, for people (and crawlers) who arrive on the home page. */
export default function TopicLinks() {
  const { data } = useQuery({ queryKey: ["site-topics"], queryFn: getSiteTopics, staleTime: 3_600_000 })
  const groups = new Map<string, { slug: string; title: string }[]>()
  for (const t of data?.data ?? []) groups.set(t.eyebrow, [...(groups.get(t.eyebrow) ?? []), t])
  if (!groups.size) return null

  return (
    <section aria-labelledby="popular-guides">
      <h2 id="popular-guides" className="text-2xl font-bold text-cas-navy sm:text-3xl">Popular guides</h2>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[...groups].map(([group, items]) => (
          <div key={group}>
            <h3 className="text-sm font-semibold text-cas-navy">{group}</h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              {items.map((i) => <li key={i.slug}><Link to={`/site/${i.slug}`} className="text-slate-700 hover:text-cas-red hover:underline">{i.title}</Link></li>)}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
