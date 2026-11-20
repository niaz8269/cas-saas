import { ArrowUpRight, FileText, Gem, Lock, MapPin, Package, Users, Wallet } from "lucide-react"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { toneFor } from "@/features/site/tone"
import { formatCommission, type ExclusiveOffer } from "@/features/exclusives/api"
import { cn } from "@/lib/utils"

/**
 * An exclusive as a card, laid out like the university cards on the public site: cover photo (or a brand tint),
 * emblem, name and place, a short text, small facts as chips, and a footer with the commission and a view link.
 * The whole card opens the detail through one button; `actions` (a menu) sits above it.
 */
export default function ExclusiveCard({ offer, onOpen, actions, forAgency = false }: {
  offer: ExclusiveOffer
  onOpen: () => void
  /** Staff row menu (edit, delete); shown over the cover. */
  actions?: ReactNode
  forAgency?: boolean
}) {
  const { t } = useTranslation()
  const u = offer.university
  const cover = u?.cover_thumb_url ?? u?.cover_url ?? null
  const place = (u ? [u.city, u.province] : [offer.city, offer.province]).filter(Boolean).join(", ")
  const placeName = u?.name ?? offer.custom_university ?? null
  const rate = forAgency ? formatCommission(offer.commission) : formatCommission(offer.commission_rates?.partner)
  const firstFee = offer.fee_structure.find((f) => f.amount != null && f.amount !== "")
  const files = offer.materials_count ?? offer.materials?.length ?? 0
  const restricted = offer.restricted_nationalities.length

  const facts: { key: string; text: string }[] = []
  if (offer.program) facts.push({ key: "program", text: offer.program.name })
  else if (offer.scholarship) facts.push({ key: "scholarship", text: offer.scholarship.name })
  else if (offer.custom_name && offer.offer_type !== "university") facts.push({ key: "custom", text: offer.custom_name })
  else if (offer.offer_type === "city") facts.push({ key: "city", text: t("exclusives.cityPrograms", { defaultValue: "Programs in this city" }) })
  else if (offer.offer_type === "university") facts.push({ key: "type", text: t("exclusives.universityPackage", { defaultValue: "University package" }) })
  else if (offer.offer_type === "other") facts.push({ key: "type", text: t("exclusives.specialOffer", { defaultValue: "Special offer" }) })
  for (const name of (offer.programs_list ?? []).slice(0, 3)) facts.push({ key: `p-${name}`, text: name })
  if ((offer.programs_list ?? []).length > 3) facts.push({ key: "p-more", text: t("exclusives.more", { defaultValue: "+{{count}} more", count: (offer.programs_list ?? []).length - 3 }) })
  if (firstFee) facts.push({ key: "fee", text: `${firstFee.label}: ${Number(firstFee.amount).toLocaleString("en-US")} ${firstFee.currency ?? ""}${firstFee.note ? ` ${firstFee.note}` : ""}`.trim() })
  if (restricted > 0) facts.push({ key: "restricted", text: t("exclusives.notOpenTo", { count: restricted, defaultValue_one: "Not open to {{count}} nationality", defaultValue_other: "Not open to {{count}} nationalities" }) })
  else if (offer.eligible_nationalities.length > 0) facts.push({ key: "eligible", text: t("exclusives.openFor", { count: offer.eligible_nationalities.length, defaultValue_one: "For {{count}} nationality", defaultValue_other: "For {{count}} nationalities" }) })

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-sm border bg-card shadow-sm ring-1 ring-transparent transition-all duration-300 focus-within:ring-cas-red/40 hover:-translate-y-1 hover:ring-cas-red/40">
      <div className={cn("relative h-40 overflow-hidden bg-gradient-to-br", toneFor(offer.id))}>
        {cover && (
          <>
            <img src={cover} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
          </>
        )}
        {!cover && <Package className="absolute right-4 bottom-3 size-14 text-white/25" aria-hidden />}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-cas-red px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
            <Gem className="size-3.5" aria-hidden /> {t("exclusives.badge", { defaultValue: "Exclusive" })}
          </span>
          {offer.audience && (
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm", offer.audience === "private" ? "bg-slate-800 text-white" : "bg-white/90 text-cas-navy")}>
              {offer.audience === "private" ? <Lock className="size-3" aria-hidden /> : <Users className="size-3" aria-hidden />}
              {offer.audience === "private" ? t("exclusives.private", { defaultValue: "Private" }) : t("exclusives.partners", { defaultValue: "Partners" })}
            </span>
          )}
          {offer.status && (
            <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize shadow-sm", offer.status === "published" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800")}>
              {offer.status}
            </span>
          )}
        </div>
        {actions && <div className="absolute top-2 right-2 z-10 rounded-md bg-white/90 shadow-sm">{actions}</div>}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-3">
          {u?.emblem_url ? (
            <img src={u.emblem_url} alt="" loading="lazy" decoding="async" className="size-12 shrink-0 rounded-full object-cover shadow-sm ring-1 ring-black/5" />
          ) : u?.logo_url ? (
            <img src={u.logo_url} alt="" loading="lazy" decoding="async" className="h-11 w-24 shrink-0 rounded-sm border bg-white object-contain p-1 shadow-sm" />
          ) : null}
          <div className="min-w-0">
            <h3 className="font-semibold text-cas-navy transition-colors group-hover:text-cas-red-600">
              <button type="button" onClick={onOpen} className="text-left outline-none after:absolute after:inset-0 after:content-['']">{offer.title}</button>
            </h3>
            {(placeName || place) && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" aria-hidden /> <span className="truncate">{[placeName, place].filter(Boolean).join(" · ")}</span>
              </p>
            )}
          </div>
        </div>

        {offer.summary && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{offer.summary}</p>}

        {facts.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {facts.map((f) => <li key={f.key} className="max-w-full truncate rounded-full bg-subtle px-2.5 py-0.5 text-xs text-slate-600">{f.text}</li>)}
          </ul>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {rate ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cas-navy px-2.5 py-1 text-xs font-semibold text-white">
                <Wallet className="size-3.5" aria-hidden /> <span className="sr-only">{forAgency ? t("exclusives.yourCommission", { defaultValue: "Your commission" }) : t("exclusives.partnerCommission", { defaultValue: "Partner commission" })}: </span>{rate}
              </span>
            ) : (
              <span className="rounded-full bg-subtle px-2.5 py-1 text-xs text-muted-foreground">{t("exclusives.noRate", { defaultValue: "No rate set" })}</span>
            )}
            {files > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-cas-navy-50 px-2.5 py-1 text-xs font-medium text-cas-navy">
                <FileText className="size-3.5" aria-hidden /> {t("exclusives.files", { count: files, defaultValue_one: "{{count}} file", defaultValue_other: "{{count}} files" })}
              </span>
            )}
          </div>
          <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-cas-red-600" aria-hidden>
            {t("exclusives.view", { defaultValue: "View" })} <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>
    </article>
  )
}
