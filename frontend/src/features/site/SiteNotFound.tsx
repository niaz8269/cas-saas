import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { useSeo } from "@/lib/seo"

/** Shown for unknown public URLs. The server answers these with a real 404 and noindex. */
export default function SiteNotFound() {
  const { t } = useTranslation()
  useSeo({ title: t("notFound.title") })

  return (
    <div className="mx-auto max-w-xl space-y-4 rounded-sm border bg-card p-10 text-center shadow-sm">
      <h1 className="text-2xl font-bold text-cas-navy">{t("notFound.title")}</h1>
      <p className="text-sm text-muted-foreground">{t("notFound.body")}</p>
      <div className="flex flex-wrap justify-center gap-3 text-sm font-semibold text-cas-navy">
        <Link to="/" className="hover:underline">{t("notFound.home")}</Link>
        <Link to="/site/universities" className="hover:underline">{t("notFound.universities")}</Link>
        <Link to="/site/programs" className="hover:underline">{t("notFound.programs")}</Link>
      </div>
    </div>
  )
}
