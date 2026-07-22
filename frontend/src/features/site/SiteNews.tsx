import { useQuery } from "@tanstack/react-query"
import { ArrowRight, Award, CalendarDays, FileText, MapPin, School, Stamp, Stethoscope, Wallet, type LucideIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getSitePosts, type SitePost } from "@/features/site/api"
import { SitePageHeader, SiteSection } from "@/features/site/components"
import { useSeo } from "@/lib/seo"
import { cn } from "@/lib/utils"

// Evergreen "learning centre" links (navigation, not CMS content).
const GUIDES: { icon: LucideIcon; titleKey: string; bodyKey: string; to: string }[] = [
  { icon: FileText, titleKey: "news.guides.apply.title", bodyKey: "news.guides.apply.body", to: "/site/study-plan" },
  { icon: Stamp, titleKey: "news.guides.visa.title", bodyKey: "news.guides.visa.body", to: "/site/faq" },
  { icon: Award, titleKey: "news.guides.scholarships.title", bodyKey: "news.guides.scholarships.body", to: "/site/scholarships" },
  { icon: Wallet, titleKey: "news.guides.costs.title", bodyKey: "news.guides.costs.body", to: "/site/pricing" },
  { icon: Stethoscope, titleKey: "news.guides.mbbs.title", bodyKey: "news.guides.mbbs.body", to: "/site/programs?q=MBBS" },
  { icon: School, titleKey: "news.guides.university.title", bodyKey: "news.guides.university.body", to: "/site/universities" },
]

const TABS = ["all", "news", "blog", "event"] as const
const TYPE_BADGE: Record<string, string> = {
  news: "bg-sky-50 text-sky-700",
  blog: "bg-violet-50 text-violet-700",
  event: "bg-amber-50 text-amber-800",
}

function PostCard({ post }: { post: SitePost }) {
  const { t, i18n } = useTranslation()
  const date = post.type === "event" ? post.event_date : post.published_at
  const dateLabel = date ? new Date(date).toLocaleDateString(i18n.language, { year: "numeric", month: "short", day: "numeric" }) : null

  return (
    <Link to={`/site/news/${post.slug}`} className="group flex flex-col overflow-hidden rounded-sm border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
      <div className="relative h-44 bg-cas-navy-50">
        {post.cover_image_url
          ? <img src={post.cover_image_url} alt="" className="size-full object-cover" />
          : <div className="flex size-full items-center justify-center bg-gradient-to-br from-cas-navy-50 to-cas-red-50"><FileText className="size-10 text-cas-navy/30" /></div>}
        <span className="absolute top-3 left-3">
          <Badge variant="outline" className={cn("border-transparent capitalize", TYPE_BADGE[post.type])}>{t(`news.type.${post.type}`)}</Badge>
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        {dateLabel && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            {post.type === "event" ? <MapPin className="size-3.5" /> : <CalendarDays className="size-3.5" />}
            {post.type === "event" && post.location ? `${dateLabel} · ${post.location}` : dateLabel}
          </span>
        )}
        <h3 className="mt-2 font-semibold text-cas-navy group-hover:text-cas-red-600">{post.title}</h3>
        {post.excerpt && <p className="mt-1.5 line-clamp-3 flex-1 text-sm text-muted-foreground">{post.excerpt}</p>}
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-cas-navy">
          {t("news.readMore")} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  )
}

export default function SiteNews() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<(typeof TABS)[number]>("all")

  useSeo({
    title: t("news.seoTitle"),
    description: t("news.seoDescription"),
    canonicalPath: "/site/news",
  })

  const posts = useQuery({
    queryKey: ["site-posts", tab],
    queryFn: () => getSitePosts({ type: tab === "all" ? undefined : tab }),
  })

  const items = posts.data?.data ?? []

  return (
    <div className="space-y-8">
      <SitePageHeader
        eyebrow={t("news.headerEyebrow")}
        title={t("news.headerTitle")}
        subtitle={t("news.headerSubtitle")}
      />

      {/* Type tabs */}
      <div className="flex flex-wrap gap-1 rounded-sm border bg-card p-1 shadow-sm sm:inline-flex">
        {TABS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            aria-pressed={tab === k}
            className={cn(
              "rounded-sm px-4 py-1.5 text-sm font-medium transition-colors",
              tab === k ? "bg-cas-navy text-white" : "text-muted-foreground hover:text-cas-navy",
            )}
          >
            {t(`news.tab.${k}`)}
          </button>
        ))}
      </div>

      <section>
        {posts.isPending && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-sm" />)}
          </div>
        )}
        {posts.isError && <p className="text-sm text-destructive">{t("news.loadError")}</p>}
        {!posts.isPending && !posts.isError && items.length === 0 && (
          <div className="rounded-sm border border-dashed bg-card p-12 text-center">
            <h2 className="font-semibold text-cas-navy">{t("news.emptyTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("news.emptyBody")}</p>
          </div>
        )}
        {items.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => <PostCard key={p.id} post={p} />)}
          </div>
        )}
      </section>

      <SiteSection title={t("news.guidesTitle")} subtitle={t("news.guidesSubtitle")}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GUIDES.map(({ icon: Icon, titleKey, bodyKey, to }) => (
            <Link key={titleKey} to={to} className="group flex flex-col rounded-sm border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow">
              <span className="inline-flex size-11 items-center justify-center rounded-sm bg-cas-navy-50 text-cas-navy"><Icon className="size-5" /></span>
              <h3 className="mt-4 font-semibold text-cas-navy group-hover:text-cas-red-600">{t(titleKey)}</h3>
              <p className="mt-1.5 flex-1 text-sm text-muted-foreground">{t(bodyKey)}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-cas-navy">{t("news.readGuide")} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></span>
            </Link>
          ))}
        </div>
      </SiteSection>
    </div>
  )
}
