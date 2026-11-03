import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { Skeleton } from "@/components/ui/skeleton"
import { getSitePhotoCredits } from "@/features/site/api"
import { SitePageHeader } from "@/features/site/components"
import { HEADER_IMAGES, HIGHLIGHT_PHOTOS } from "@/features/site/headerImages"
import { useSeo } from "@/lib/seo"

/** One page for the authors and licences of the freely licensed photos used on the site. */
export default function SitePhotoCredits() {
  const { t } = useTranslation()
  useSeo({ title: t("photoCredits.seoTitle"), description: t("photoCredits.seoDescription"), canonicalPath: "/site/photo-credits" })

  const { data, isPending, isError } = useQuery({ queryKey: ["site-photo-credits"], queryFn: getSitePhotoCredits })
  const shared: { credit?: string }[] = [...Object.values(HEADER_IMAGES), ...HIGHLIGHT_PHOTOS]
  const sharedCredits = [...new Set(shared.flatMap((i) => (i.credit ? [i.credit] : [])))]

  return (
    <div className="space-y-6">
      <SitePageHeader title={t("photoCredits.title")} subtitle={t("photoCredits.subtitle")} />

      <div className="rounded-sm border bg-card p-6 shadow-sm">
        <h2 className="font-semibold text-cas-navy">{t("photoCredits.siteTitle")}</h2>
        <ul className="mt-3 grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
          {sharedCredits.map((c) => <li key={c}>{c}</li>)}
        </ul>
      </div>

      <div className="rounded-sm border bg-card p-6 shadow-sm">
        <h2 className="font-semibold text-cas-navy">{t("photoCredits.universityTitle")}</h2>
        {isError && <p className="mt-3 text-sm text-destructive">{t("photoCredits.loadError")}</p>}
        {isPending ? (
          <Skeleton className="mt-3 h-40 w-full" />
        ) : (
          <ul className="mt-3 divide-y text-sm">
            {(data?.data ?? []).map((r) => (
              <li key={r.slug} className="grid gap-1 py-2 sm:grid-cols-[1fr_1.4fr] sm:gap-4">
                <span className="font-medium">{r.university} <span className="text-xs text-muted-foreground">({t(r.kind === "city" ? "photoCredits.city" : "photoCredits.campus")})</span></span>
                <span className="text-muted-foreground">
                  {r.credit}
                  {r.source_url && <> · <a href={r.source_url} target="_blank" rel="noreferrer" className="underline hover:text-cas-navy">{t("photoCredits.source")}</a></>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
