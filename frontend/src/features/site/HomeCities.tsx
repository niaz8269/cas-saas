import { ArrowRight } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { Skeleton } from "@/components/ui/skeleton"
import type { SiteCityStat } from "@/features/site/api"

const citySlug = (c: string) => c.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

function CityCard({ city, tall }: { city: SiteCityStat; tall?: boolean }) {
  const { t } = useTranslation()

  return (
    <Link
      to={`/site/cities/${citySlug(city.city)}`}
      className={`group relative flex items-start overflow-hidden rounded-sm bg-gradient-to-br from-cas-navy-900 via-cas-navy to-cas-navy-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${tall ? "h-44 sm:h-52" : "h-32 sm:h-36"}`}
    >
      {city.photo_url && <img src={city.photo_url} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105" />}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/30" />
      <div className="relative flex w-full items-start justify-between gap-2 p-4 sm:p-5">
        <span className={`font-bold text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.6)] ${tall ? "text-xl sm:text-2xl" : "text-lg"}`}>{city.city}</span>
        <span className="rounded-full bg-black/40 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">{t("home.cities.universityCount", { count: city.count })}</span>
      </div>
    </Link>
  )
}

/** Study-by-city shortcut right under the hero: each card opens that city's universities. */
export default function HomeCities({ cities, isPending }: { cities?: SiteCityStat[]; isPending: boolean }) {
  const { t } = useTranslation()

  // Cities with a real city photo first, then by number of universities.
  const ranked = [...(cities ?? [])].sort((a, b) => Number(b.photo_is_city) - Number(a.photo_is_city) || b.count - a.count)
  const featured = ranked.slice(0, 3)
  const more = ranked.slice(3, 7)

  return (
    <section>
      <h2 className="text-center text-2xl font-bold text-cas-navy sm:text-[2rem]">{t("home.cities.title")}</h2>
      <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-muted-foreground">{t("home.cities.subtitle")}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {isPending && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-sm" />)}
        {featured.map((c) => <CityCard key={c.city} city={c} tall />)}
      </div>
      {more.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {more.map((c) => <CityCard key={c.city} city={c} />)}
        </div>
      )}
      <p className="mt-5">
        <Link to="/site/cities" className="inline-flex items-center gap-1 text-sm font-semibold text-cas-red-600 hover:underline">
          {t("home.cities.seeMore")} <ArrowRight className="size-4" />
        </Link>
      </p>
    </section>
  )
}
