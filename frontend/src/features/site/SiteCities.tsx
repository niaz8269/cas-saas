import { useQuery } from "@tanstack/react-query"
import { ArrowRight, Building2, MapPin } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { Skeleton } from "@/components/ui/skeleton"
import { getSiteUniversities } from "@/features/site/api"
import { SitePageHeader } from "@/features/site/components"
import { useSeo } from "@/lib/seo"

const citySlug = (c: string) => c.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

export default function SiteCities() {
  const { t } = useTranslation()
  useSeo({
    title: t("cities.seoTitle"),
    description: t("cities.seoDescription"),
    canonicalPath: "/site/cities",
  })

  const { data, isPending, isError } = useQuery({
    queryKey: ["site-cities"],
    queryFn: () => getSiteUniversities({ perPage: 50 }),
  })

  const cities = data?.city_stats ?? []

  return (
    <div className="space-y-6">
      <SitePageHeader
        eyebrow={t("cities.eyebrow")}
        title={t("cities.title")}
        subtitle={t("cities.subtitle")}
      />

      {isError && (
        <div className="rounded-sm border bg-card p-8 text-center shadow-sm">
          <p className="text-sm text-destructive">{t("cities.loadError")}</p>
        </div>
      )}

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-sm" />)}
        </div>
      ) : cities.length === 0 ? (
        <div className="rounded-sm border bg-card p-12 text-center shadow-sm">
          <MapPin className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">{t("cities.emptyTitle")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cities.map(({ city, count, photo_url }) => (
            <Link
              key={city}
              to={`/site/cities/${citySlug(city)}`}
              className="group flex flex-col overflow-hidden rounded-sm border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-sm"
            >
              <div className="relative flex h-36 items-end overflow-hidden bg-gradient-to-br from-cas-navy-900 via-cas-navy to-cas-navy-700">
                {photo_url && <img src={photo_url} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105" />}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <span className="relative px-5 pb-3 font-sans text-2xl font-bold text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.5)]">{city}</span>
              </div>
              <div className="flex flex-1 items-center justify-between gap-3 p-5">
                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Building2 className="size-4 text-cas-navy" />
                  {t("cities.universityCount", { count })}
                </span>
                <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-cas-red-600">
                  {t("cities.view")} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
