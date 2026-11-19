import { Download, FileText } from "lucide-react"
import type { ReactNode } from "react"

import {
  AGENCY_LEVELS,
  formatBytes,
  formatCommission,
  MATERIAL_CATEGORIES,
  type ExclusiveMaterial,
  type ExclusiveOffer,
} from "@/features/exclusives/api"
import { cn } from "@/lib/utils"

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h4>
      {children}
    </section>
  )
}

const Text = ({ children }: { children: ReactNode }) => <p className="text-sm leading-relaxed whitespace-pre-line">{children}</p>

/** Files list with a download button each; `onDownload` does the authenticated fetch. */
export function MaterialList({ files, onDownload, busyId, className }: { files: ExclusiveMaterial[]; onDownload: (f: ExclusiveMaterial) => void; busyId?: number | null; className?: string }) {
  return (
    <ul className={cn("divide-y rounded-md border bg-card", className)}>
      {files.map((f) => (
        <li key={f.id} className="flex items-center gap-3 p-3">
          <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{f.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {MATERIAL_CATEGORIES.find((c) => c.value === f.category)?.label ?? f.category} · {formatBytes(f.size)}
            </p>
            {f.description && <p className="mt-0.5 text-xs text-muted-foreground">{f.description}</p>}
          </div>
          <button type="button" disabled={busyId === f.id} onClick={() => onDownload(f)} aria-label={`Download ${f.title}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium text-cas-navy hover:bg-cas-navy-50 disabled:opacity-50">
            <Download className="size-4" aria-hidden /> Download
          </button>
        </li>
      ))}
    </ul>
  )
}

/**
 * Everything an agency needs to decide: commission, fees, who can and cannot apply, conditions and the files.
 * Staff see every agency level's rate; an agency sees its own (`offer.commission`).
 */
export default function ExclusiveDetail({ offer, onDownload, busyId }: { offer: ExclusiveOffer; onDownload: (f: ExclusiveMaterial) => void; busyId?: number | null }) {
  const rates = offer.commission_rates ?? {}
  const hasStaffRates = Object.keys(rates).length > 0
  const own = offer.commission ? formatCommission(offer.commission) : ""

  return (
    <div className="min-w-0 space-y-5 break-words">
      {offer.audience === "private" && <p className="rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-800">Private: visible to the CAS team only. Agencies cannot see this.</p>}
      {offer.summary && <Text>{offer.summary}</Text>}

      {offer.offer_type === "city" && (
        <Block title={[offer.city, offer.province].filter(Boolean).join(", ") || "Location"}>
          {(offer.programs_list ?? []).length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {(offer.programs_list ?? []).map((n) => <li key={n} className="rounded-full bg-cas-navy-50 px-3 py-0.5 text-sm text-cas-navy">{n}</li>)}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No programs listed.</p>}
        </Block>
      )}

      <Block title="Your commission">
        {offer.agency_level !== undefined ? (
          own ? <p className="text-2xl font-semibold text-cas-navy tabular-nums">{own}</p> : <p className="text-sm text-muted-foreground">No rate is set for your agency level yet. Ask your CAS contact.</p>
        ) : hasStaffRates ? (
          <ul className="space-y-1 text-sm">
            {AGENCY_LEVELS.map((l) => (rates[l.value] ? <li key={l.value}><span className="inline-block w-36 text-muted-foreground">{l.label}</span><strong className="tabular-nums">{formatCommission(rates[l.value])}</strong></li> : null))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">No rates set.</p>}
        {offer.commission_notes && <Text>{offer.commission_notes}</Text>}
      </Block>

      {(offer.fee_structure.length > 0 || offer.fee_notes) && (
        <Block title="Fee structure">
          {offer.fee_structure.length > 0 && (
            <table className="w-full table-fixed text-sm">
              <tbody>
                {offer.fee_structure.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <th scope="row" className="w-2/5 py-1.5 pr-3 text-left align-top font-normal">{r.label}</th>
                    <td className="py-1.5 pr-3 text-right align-top font-semibold tabular-nums">{r.amount != null && r.amount !== "" ? `${Number(r.amount).toLocaleString("en-US")} ${r.currency ?? ""}`.trim() : "—"}</td>
                    <td className="py-1.5 align-top text-muted-foreground">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {offer.fee_notes && <Text>{offer.fee_notes}</Text>}
        </Block>
      )}

      {(offer.eligible_nationalities.length > 0 || offer.restricted_nationalities.length > 0 || offer.nationality_notes) && (
        <Block title="Nationality">
          {offer.eligible_nationalities.length > 0 && <p className="text-sm"><span className="font-medium">Open to:</span> {offer.eligible_nationalities.join(", ")}</p>}
          {offer.eligible_nationalities.length === 0 && offer.restricted_nationalities.length > 0 && <p className="text-sm"><span className="font-medium">Open to:</span> all nationalities except those below</p>}
          {offer.restricted_nationalities.length > 0 && <p className="text-sm"><span className="font-medium text-destructive">Not accepted:</span> {offer.restricted_nationalities.join(", ")}</p>}
          {offer.nationality_notes && <Text>{offer.nationality_notes}</Text>}
        </Block>
      )}

      {offer.conditions && <Block title="Conditions"><Text>{offer.conditions}</Text></Block>}

      {offer.materials && offer.materials.length > 0 && (
        <Block title="Downloads"><MaterialList files={offer.materials} onDownload={onDownload} busyId={busyId} /></Block>
      )}
    </div>
  )
}
