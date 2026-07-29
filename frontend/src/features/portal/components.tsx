import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { label, STATUS_LABEL_KEY } from "@/features/portal/status"
import { cn } from "@/lib/utils"

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h1 className="text-xl font-semibold text-cas-navy">{title}</h1>
      {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  )
}

export function StatusBadge({ status, map }: { status: string; map: Record<string, string> }) {
  const { t } = useTranslation()
  const key = STATUS_LABEL_KEY[status]
  return (
    <Badge variant="outline" className={cn("border-transparent capitalize", map[status] ?? "bg-muted text-muted-foreground")}>
      {key ? t(key) : label(status)}
    </Badge>
  )
}

export function PortalCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border bg-card p-4 shadow-sm", className)}>{children}</div>
}

/**
 * Initials chip standing in for a person. Decorative — the name it derives
 * from is always rendered next to it, so it stays out of the accessibility
 * tree rather than repeating that name to a screen reader.
 */
export function Initials({ name, className }: { name: string; className?: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full bg-cas-navy-50 text-xs font-semibold text-cas-navy",
        className,
      )}
    >
      {initials || "?"}
    </span>
  )
}

/** Compact labelled figure for the portal's summary strips. */
export function StatTile({ label, value, tone = "default" }: {
  label: string
  value: ReactNode
  tone?: "default" | "money" | "positive"
}) {
  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm">
      <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">{label}</p>
      <p className={cn(
        "mt-1 truncate text-lg font-semibold tabular-nums",
        tone === "positive" ? "text-success" : tone === "money" ? "text-cas-navy" : "text-foreground",
      )}>
        {value}
      </p>
    </div>
  )
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4 shadow-sm">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="mt-2 h-3 w-1/3" />
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ icon, title, hint, action }: {
  icon: ReactNode
  title: string
  hint?: string
  /** Optional single primary action — the design system's empty-state CTA. */
  action?: ReactNode
}) {
  return (
    <div className="rounded-xl border bg-card p-10 text-center shadow-sm">
      <div className="mx-auto mb-3 text-muted-foreground">{icon}</div>
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function LoadError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
      <p className="text-sm text-destructive">{t("portal.loadErrorMessage")}</p>
      <button type="button" onClick={onRetry} className="mt-3 text-sm font-medium text-cas-navy underline">
        {t("portal.retry")}
      </button>
    </div>
  )
}
