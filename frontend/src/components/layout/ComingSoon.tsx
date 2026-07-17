import { Hourglass } from "lucide-react"

interface ComingSoonProps {
  module: string
  milestone: string
}

export default function ComingSoon({ module, milestone }: ComingSoonProps) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="max-w-sm rounded-xl border bg-card p-8 text-center shadow-sm">
        <Hourglass className="mx-auto size-8 text-cas-navy" aria-hidden="true" />
        <h2 className="mt-4 text-lg font-semibold">{module}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This module arrives with milestone {milestone}. The navigation entry
          is already permission-gated for your role.
        </p>
      </div>
    </div>
  )
}
