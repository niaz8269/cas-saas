import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, Trash2 } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { APPLICANT_OPEN_STATUSES, deleteApplicationDraft, withdrawApplication } from "@/features/portal/api"
import { ApiError } from "@/lib/api"
import type { PortalKind } from "@/stores/portalAuth"

/**
 * Takes an application off the applicant's list. A draft is deleted; one that is already with CAS is withdrawn, so
 * the record of it stays. Both ask first, and nothing is offered once the application is accepted or closed.
 */
export default function ApplicationRemoval({ kind, applicationId, status }: { kind: PortalKind; applicationId: number; status: string }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [asking, setAsking] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)

  const isDraft = status === "draft"
  const mutation = useMutation({
    mutationFn: async (): Promise<void> => {
      if (isDraft) await deleteApplicationDraft(kind, applicationId)
      else await withdrawApplication(kind, applicationId, reason.trim() || undefined)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [kind, "applications"] }),
    onError: (e) => setError(e instanceof ApiError ? e.message : t("applicationRemoval.failed", { defaultValue: "Could not do that. Please try again." })),
  })

  if (!APPLICANT_OPEN_STATUSES.includes(status)) return null

  if (!asking) {
    return (
      <Button type="button" size="sm" variant="ghost" className="self-start text-destructive hover:text-destructive" onClick={() => { setError(null); setAsking(true) }}>
        <Trash2 className="size-4" />
        {isDraft
          ? t("applicationRemoval.deleteDraft", { defaultValue: "Delete draft" })
          : t("applicationRemoval.withdraw", { defaultValue: "Withdraw application" })}
      </Button>
    )
  }

  return (
    <div role="alertdialog" aria-label={isDraft ? "Delete this draft" : "Withdraw this application"} className="space-y-2 rounded-lg border border-destructive/30 bg-cas-red-50 p-3 text-sm">
      <p>
        {isDraft
          ? t("applicationRemoval.confirmDelete", { defaultValue: "Delete this draft? It will be removed from your list." })
          : t("applicationRemoval.confirmWithdraw", { defaultValue: "Withdraw this application? CAS will be told, and it stays on record as withdrawn." })}
      </p>
      {!isDraft && (
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          placeholder={t("applicationRemoval.reason", { defaultValue: "Reason (optional)" })}
          aria-label={t("applicationRemoval.reason", { defaultValue: "Reason (optional)" })}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        />
      )}
      {error && <p role="alert" className="text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="destructive" disabled={mutation.isPending} onClick={() => { setError(null); mutation.mutate() }}>
          {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
          {isDraft ? t("applicationRemoval.yesDelete", { defaultValue: "Yes, delete" }) : t("applicationRemoval.yesWithdraw", { defaultValue: "Yes, withdraw" })}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => setAsking(false)}>
          {t("applicationRemoval.keep", { defaultValue: "Keep it" })}
        </Button>
      </div>
    </div>
  )
}
