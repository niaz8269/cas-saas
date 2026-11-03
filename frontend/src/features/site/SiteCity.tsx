import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router-dom"

import { Skeleton } from "@/components/ui/skeleton"
import { getSiteCity } from "@/features/site/api"
import { SitePageHeader, SiteSection, UniCard } from "@/features/site/components"
import SiteNotFound from "@/features/site/SiteNotFound"
import { OverviewArticle } from "@/features/site/SiteUniversity"
import { useSeo } from "@/lib/seo"

/** A city landing page: what it is like to study there, and every university in it. */
export default function SiteCity() {
  const { t } = useTranslation()
  const { slug = "" } = useParams()
  const { data, isPending, isError } = useQuery({ queryKey: ["site-city", slug], queryFn: () => getSiteCity(slug), retry: false })

  useSeo({
    title: data ? t("city.seoTitle", { city: data.city }) : t("city.seoTitleFallback"),
    description: data ? t("city.seoDescription", { city: data.city, count: data.universities.length }) : undefined,
    canonicalPath: `/site/cities/${slug}`,
  })

  if (isPending) return <Skeleton className="h-96 w-full rounded-sm" />
  if (isError || !data) return <SiteNotFound />

  const cover = data.universities.find((u) => u.cover_url)

  return (
    <div className="space-y-8">
      <SitePageHeader
        eyebrow={data.province ?? undefined}
        title={t("city.title", { city: data.city })}
        subtitle={t("city.subtitle", { city: data.city, count: data.universities.length })}
        image={cover?.cover_url ? { src: cover.cover_url } : undefined}
      />
      {data.sections.length > 0 && <OverviewArticle sections={data.sections} />}
      <SiteSection title={t("city.universities", { city: data.city })}>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.universities.map((u) => <UniCard key={u.id} u={u} />)}
        </div>
      </SiteSection>
      <p className="text-center text-sm"><Link to="/site/cities" className="text-cas-navy hover:underline">{t("city.allCities")}</Link></p>
    </div>
  )
}
