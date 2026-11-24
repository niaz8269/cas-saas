import { useQuery } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { getSiteUniversityDirectory } from "@/features/site/api"

/**
 * Every university, A to Z, as plain links at the bottom of the universities page. Visitors and search engines
 * can reach any university in two clicks from the home page (Home, Universities, the university) instead of
 * paging through the cards. The list loads after the page has settled, so it never slows the first screen.
 */
export default function UniversityDirectory() {
  const { t } = useTranslation()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback
    const id = idle ? idle(() => setReady(true)) : window.setTimeout(() => setReady(true), 800)

    return () => {
      if (!idle) window.clearTimeout(id)
    }
  }, [])

  const { data } = useQuery({ queryKey: ["site-university-directory"], queryFn: getSiteUniversityDirectory, enabled: ready, staleTime: 30 * 60_000 })

  const groups = useMemo(() => {
    const byLetter = new Map<string, { name: string; slug: string; city: string | null }[]>()
    for (const u of data?.data ?? []) {
      const letter = /^[a-z]/i.test(u.name) ? u.name[0].toUpperCase() : "#"
      byLetter.set(letter, [...(byLetter.get(letter) ?? []), u])
    }

    return [...byLetter.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [data])

  if (groups.length === 0) return null

  return (
    <section aria-labelledby="university-directory" className="rounded-sm border bg-card p-6 shadow-sm">
      <h2 id="university-directory" className="text-lg font-semibold text-cas-navy">
        {t("universities.directoryTitle", { defaultValue: "All universities in China, A to Z" })}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("universities.directoryHint", { defaultValue: "Open a letter to see every university that starts with it.", count: data?.data.length })}
      </p>
      <div className="mt-4 space-y-2">
        {groups.map(([letter, list]) => (
          <details key={letter} className="rounded-sm border bg-background px-4 py-2">
            <summary className="cursor-pointer text-sm font-semibold text-cas-navy">
              {letter} <span className="font-normal text-muted-foreground">({list.length})</span>
            </summary>
            <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {list.map((u) => (
                <li key={u.slug}>
                  <Link to={`/site/universities/${u.slug}`} className="text-cas-navy hover:underline">{u.name}</Link>
                  {u.city && <span className="text-muted-foreground">, {u.city}</span>}
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </section>
  )
}
