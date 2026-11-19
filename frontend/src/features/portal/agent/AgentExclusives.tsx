import { useMutation, useQuery } from "@tanstack/react-query"
import { ChevronDown, Gem } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import ExclusiveDetail, { MaterialList } from "@/features/exclusives/ExclusiveDetail"
import { formatCommission, type ExclusiveMaterial, type ExclusiveOffer } from "@/features/exclusives/api"
import { EmptyState, ListSkeleton, LoadError, PageTitle, PortalCard } from "@/features/portal/components"
import { portalApi, portalApiBlob } from "@/lib/portalApi"
import { cn } from "@/lib/utils"

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
  const [open, setOpen] = useState<number | null>(null)

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

      <div className="space-y-3">
        {data?.data.map((offer) => {
          const expanded = open === offer.id
          const rate = formatCommission(offer.commission)

          return (
            <PortalCard key={offer.id} className="p-0">
              <button type="button" aria-expanded={expanded} aria-controls={`exclusive-${offer.id}`} onClick={() => setOpen(expanded ? null : offer.id)}
                className="flex w-full items-center gap-3 p-4 text-left">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-cas-navy">{offer.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{[offer.university?.name, offer.program?.name, offer.university?.city].filter(Boolean).join(" · ")}</p>
                </div>
                {rate && (
                  <span className="shrink-0 rounded-full bg-cas-navy px-3 py-1 text-sm font-semibold text-white tabular-nums">
                    <span className="sr-only">{t("agentPortal.exclusives.yourCommission", { defaultValue: "Your commission" })}: </span>{rate}
                  </span>
                )}
                <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")} aria-hidden />
              </button>
              {expanded && (
                <div id={`exclusive-${offer.id}`} className="border-t p-4">
                  <ExclusiveDetail offer={offer} onDownload={(f) => download.mutate(f)} busyId={busyId} />
                </div>
              )}
            </PortalCard>
          )
        })}
      </div>

      {data && data.library.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-base font-semibold text-cas-navy">{t("agentPortal.exclusives.library", { defaultValue: "Marketing library" })}</h2>
          <MaterialList files={data.library} onDownload={(f) => download.mutate(f)} busyId={busyId} />
        </section>
      )}
    </div>
  )
}
