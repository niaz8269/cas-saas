import { useMutation } from "@tanstack/react-query"
import { Check, Loader2, MessageSquareMore, UserPen } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { APPLICANT_OPEN_STATUSES, requestApplicationChange } from "@/features/portal/api"
import { ApiError } from "@/lib/api"
import type { PortalKind } from "@/stores/portalAuth"

/**
 * What an applicant can still change on an application that is not accepted yet: the student's own details (edited
 * directly), and the program or funding (asked of CAS, because fees and commission depend on them).
 */
export default function ApplicationChanges({ kind, applicationId, status, studentId }: {
  kind: PortalKind
  applicationId: number
  status: string
  studentId?: number
}) {
  const { t } = useTranslation()
  const [asking, setAsking] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState<string | null>(null)

  const send = useMutation({
    mutationFn: () => requestApplicationChange(kind, applicationId, message.trim()),
    onError: (e) => setError(e instanceof ApiError ? (e.errors?.message?.[0] ?? e.message) : t("applicationChanges.failed", { defaultValue: "Could not send that. Please try again." })),
  })

  if (!APPLICANT_OPEN_STATUSES.includes(status)) return null

  const detailsTo = kind === "agent" ? `/portal/agent/students/${studentId}/details` : "/portal/student/details"

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {(kind === "student" || studentId) && (
          <Button asChild size="sm" variant="secondary">
            <Link to={detailsTo}><UserPen className="size-4" /> {t("applicationChanges.editDetails", { defaultValue: "Edit student details" })}</Link>
          </Button>
        )}
        {status !== "draft" && !asking && !send.isSuccess && (
          <Button type="button" size="sm" variant="secondary" onClick={() => { setError(null); setAsking(true) }}>
            <MessageSquareMore className="size-4" /> {t("applicationChanges.askChange", { defaultValue: "Ask CAS to change the program or funding" })}
          </Button>
        )}
      </div>

      {send.isSuccess && (
        <p role="status" className="flex items-center gap-1.5 text-sm text-success">
          <Check className="size-4" /> {t("applicationChanges.sent", { defaultValue: "Sent to CAS. They will get back to you." })}
        </p>
      )}

      {asking && !send.isSuccess && (
        <div className="space-y-2 rounded-lg border bg-subtle p-3 text-sm">
          <label className="block">
            <span className="mb-1 block text-muted-foreground">
              {t("applicationChanges.whatChange", { defaultValue: "What should change? For example the program, the university or how it is funded." })}
            </span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={1000}
              aria-label={t("applicationChanges.whatChangeAria", { defaultValue: "What should change" })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
          {error && <p role="alert" className="text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={message.trim().length < 5 || send.isPending} onClick={() => { setError(null); send.mutate() }}>
              {send.isPending && <Loader2 className="size-4 animate-spin" />}
              {t("applicationChanges.send", { defaultValue: "Send to CAS" })}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setAsking(false)}>
              {t("applicationChanges.cancel", { defaultValue: "Cancel" })}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
