import { useMutation, useQuery } from "@tanstack/react-query"
import { Gem } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import ExclusiveCard from "@/features/exclusives/ExclusiveCard"
import ExclusiveDetail, { MaterialList } from "@/features/exclusives/ExclusiveDetail"
import type { ExclusiveMaterial, ExclusiveOffer } from "@/features/exclusives/api"
import { EmptyState, ListSkeleton, LoadError, PageTitle } from "@/features/portal/components"
import { portalApi, portalApiBlob } from "@/lib/portalApi"

interface AgentExclusives {
  data: ExclusiveOffer[]
  library: ExclusiveMaterial[]
}

const getAgentExclusives = () => portalApi<AgentExclusives>("/agent/exclusives")

async function downloadAgentMaterial(file: ExclusiveMaterial) {
  const blob = await portalApiBlob(`/agent/exclusive-materials/${file.id}/download`)
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = file.original_name
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** The Exclusives tab of the agency portal: CAS's exclusive programs and universities, with the files to promote them. */
export default function AgentExclusives() {
  const { t } = useTranslation()
  const [open, setOpen] = useState<ExclusiveOffer | null>(null)

  const { data, isPending, isError, refetch } = useQuery({ queryKey: ["agent-exclusives"], queryFn: getAgentExclusives })
  const download = useMutation({ mutationFn: downloadAgentMaterial })
  const busyId = download.isPending ? download.variables?.id : null

  return (
    <div>
      <PageTitle
        title={t("agentPortal.exclusives.title", { defaultValue: "Exclusives" })}
        subtitle={t("agentPortal.exclusives.subtitle", { defaultValue: "Programs and universities available only through CAS agencies, with your commission, fees, conditions and promotional files." })}
      />

      {isPending && <ListSkeleton rows={3} />}
      {isError && <LoadError onRetry={refetch} />}
      {download.isError && <p role="alert" className="mb-3 text-sm text-destructive">{t("agentPortal.exclusives.downloadError", { defaultValue: "Could not download the file. Please try again." })}</p>}

      {data && data.data.length === 0 && data.library.length === 0 && (
        <EmptyState icon={<Gem className="mx-auto size-8" />} title={t("agentPortal.exclusives.emptyTitle", { defaultValue: "Nothing here yet" })}
          hint={t("agentPortal.exclusives.emptyHint", { defaultValue: "New exclusive offers will appear here as soon as CAS publishes them." })} />
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {data?.data.map((offer) => <ExclusiveCard key={offer.id} offer={offer} forAgency onOpen={() => setOpen(offer)} />)}
      </div>

      <Dialog open={open != null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[90vh] overflow-x-hidden overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{open?.title}</DialogTitle>
            {open && <DialogDescription>{[open.university?.name, open.program?.name].filter(Boolean).join(" · ")}</DialogDescription>}
          </DialogHeader>
          {open && <ExclusiveDetail offer={open} onDownload={(f) => download.mutate(f)} busyId={busyId} />}
        </DialogContent>
      </Dialog>

      {data && data.library.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-base font-semibold text-cas-navy">{t("agentPortal.exclusives.library", { defaultValue: "Marketing library" })}</h2>
          <MaterialList files={data.library} onDownload={(f) => download.mutate(f)} busyId={busyId} />
        </section>
      )}
    </div>
  )
}
