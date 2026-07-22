import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, CalendarDays, ExternalLink, MapPin, User } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getSitePost, SiteApiError } from "@/features/site/api"
import { useSeo } from "@/lib/seo"
import { cn } from "@/lib/utils"

const TYPE_BADGE: Record<string, string> = {
  news: "bg-sky-50 text-sky-700",
  blog: "bg-violet-50 text-violet-700",
  event: "bg-amber-50 text-amber-800",
}

const PROSE = "text-[15px] leading-relaxed text-foreground/90 [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-cas-navy [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-cas-navy [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1 [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-cas-red [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_a]:text-cas-red-600 [&_a]:underline [&_img]:my-4 [&_img]:rounded-sm [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-sm [&_pre]:bg-cas-navy-900 [&_pre]:p-4 [&_pre]:text-sm [&_pre]:text-white"

export default function SitePostDetail() {
  const { t, i18n } = useTranslation()
  const { slug = "" } = useParams()

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["site-post", slug],
    queryFn: () => getSitePost(slug),
    retry: (count, err) => !(err instanceof SiteApiError && err.status === 404) && count < 2,
  })
  const post = data?.data

  useSeo({
    title: post ? post.title : t("news.headerTitle"),
    description: post?.excerpt ?? t("news.seoDescription"),
    canonicalPath: `/site/news/${slug}`,
  })

  const notFound = isError && error instanceof SiteApiError && error.status === 404
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(i18n.language, { year: "numeric", month: "long", day: "numeric" })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/site/news" className="inline-flex items-center gap-1 text-sm font-medium text-cas-navy hover:underline">
        <ArrowLeft className="size-4" /> {t("post.back")}
      </Link>

      {isPending && (
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-64 w-full rounded-sm" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {notFound && (
        <div className="rounded-sm border border-dashed bg-card p-12 text-center">
          <h1 className="font-semibold text-cas-navy">{t("post.notFoundTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("post.notFoundBody")}</p>
        </div>
      )}
      {isError && !notFound && <p className="text-sm text-destructive">{t("news.loadError")}</p>}

      {post && (
        <article>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Badge variant="outline" className={cn("border-transparent capitalize", TYPE_BADGE[post.type])}>{t(`news.type.${post.type}`)}</Badge>
            {post.category && <span>{post.category}</span>}
            {post.published_at && <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" /> {fmt(post.published_at)}</span>}
            {post.author && <span className="inline-flex items-center gap-1"><User className="size-3.5" /> {post.author}</span>}
          </div>

          <h1 className="mt-3 font-sans text-3xl font-bold text-cas-navy sm:text-4xl">{post.title}</h1>
          {post.excerpt && <p className="mt-3 text-lg text-muted-foreground">{post.excerpt}</p>}

          {post.cover_image_url && (
            <img src={post.cover_image_url} alt="" className="mt-6 w-full rounded-sm object-cover" />
          )}

          {post.type === "event" && (
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-sm border bg-subtle p-4 text-sm">
              {post.event_date && <span className="inline-flex items-center gap-1.5 font-medium text-cas-navy"><CalendarDays className="size-4" /> {fmt(post.event_date)}</span>}
              {post.location && <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" /> {post.location}</span>}
              {post.register_url && (
                <Button asChild size="sm" className="ml-auto">
                  <a href={post.register_url} target="_blank" rel="noreferrer">{t("post.register")} <ExternalLink className="size-4" /></a>
                </Button>
              )}
            </div>
          )}

          {post.body && (
            // Body is sanitized server-side (Symfony HtmlSanitizer) before storage.
            <div className={cn("mt-6", PROSE)} dangerouslySetInnerHTML={{ __html: post.body }} />
          )}
        </article>
      )}
    </div>
  )
}
