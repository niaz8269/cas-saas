import { useQuery } from "@tanstack/react-query"
import { ArrowRight, Building2, MapPin } from "lucide-react"
import { Link } from "react-router-dom"

import { Skeleton } from "@/components/ui/skeleton"
import { getSiteUniversities } from "@/features/site/api"
import { SitePageHeader } from "@/features/site/components"
import { useSeo } from "@/lib/seo"

const DOT_GRID = {
  backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
  backgroundSize: "20px 20px",
}

export default function SiteCities() {
  useSeo({
    title: "Study in China by City — Beijing, Shanghai & More",
    description: "Browse Chinese study destinations by city and explore the Ministry of Education–listed universities in each, with full application support from CAS.",
    canonicalPath: "/site/cities",
  })

  const { data, isPending, isError } = useQuery({
    queryKey: ["site-cities"],
    queryFn: () => getSiteUniversities({ perPage: 50 }),
  })

  const cities = data?.cities ?? []
  const unis = data?.data ?? []
  const countFor = (city: string) => unis.filter((u) => u.city === city).length

  return (
    <div className="space-y-6">
      <SitePageHeader
        eyebrow="Destinations"
        title="Study in China by city"
        subtitle="From the capital to the coast — pick a city and explore its Ministry of Education–listed universities."
      />

      {isError && (
        <div className="rounded-sm border bg-card p-8 text-center shadow-sm">
          <p className="text-sm text-destructive">Couldn't load destinations right now.</p>
        </div>
      )}

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-sm" />)}
        </div>
      ) : cities.length === 0 ? (
        <div className="rounded-sm border bg-card p-12 text-center shadow-sm">
          <MapPin className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No destinations listed yet</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cities.map((city) => {
            const count = countFor(city)

            return (
              <Link
                key={city}
                to={`/site/universities?city=${encodeURIComponent(city)}`}
                className="group flex flex-col overflow-hidden rounded-sm border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-sm"
              >
                <div className="relative flex h-28 items-center justify-center overflow-hidden bg-gradient-to-br from-cas-navy-900 via-cas-navy to-cas-navy-700">
                  <div className="pointer-events-none absolute inset-0 opacity-[0.14]" style={DOT_GRID} />
                  <span className="relative font-sans text-2xl font-bold text-white/95">{city}</span>
                </div>
                <div className="flex flex-1 items-center justify-between gap-3 p-5">
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Building2 className="size-4 text-cas-navy" />
                    {count > 0 ? `${count} universit${count === 1 ? "y" : "ies"}` : "Explore universities"}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-cas-red-600">
                    View <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
