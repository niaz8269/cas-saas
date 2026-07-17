import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { label } from "@/features/portal/status"
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
  return (
    <Badge variant="outline" className={cn("border-transparent capitalize", map[status] ?? "bg-muted text-muted-foreground")}>
      {label(status)}
    </Badge>
  )
}

export function PortalCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border bg-card p-4 shadow-sm", className)}>{children}</div>
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

export function EmptyState({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-10 text-center shadow-sm">
      <div className="mx-auto mb-3 text-muted-foreground">{icon}</div>
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
      <p className="text-sm text-destructive">Something went wrong.</p>
      <button type="button" onClick={onRetry} className="mt-3 text-sm font-medium text-cas-navy underline">
        Try again
      </button>
    </div>
  )
}
