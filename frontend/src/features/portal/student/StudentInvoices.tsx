import { useMutation, useQuery } from "@tanstack/react-query"
import { Download, Receipt } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { getStudentInvoicePdf, getStudentInvoices } from "@/features/portal/api"
import {
  EmptyState,
  ListSkeleton,
  LoadError,
  PageTitle,
  PortalCard,
  StatusBadge,
} from "@/features/portal/components"
import { INVOICE_BADGE, money } from "@/features/portal/status"

export default function StudentInvoices() {
  const { t } = useTranslation()
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["student", "invoices"],
    queryFn: getStudentInvoices,
  })

  const pdf = useMutation({
    mutationFn: (id: number) => getStudentInvoicePdf(id),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank", "noopener")
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    },
  })

  return (
    <div>
      <PageTitle title={t("studentPortal.invoices.title")} subtitle={t("studentPortal.invoices.subtitle")} />

      {isPending && <ListSkeleton rows={2} />}
      {isError && <LoadError onRetry={refetch} />}

      {data && data.data.length === 0 && (
        <EmptyState icon={<Receipt className="mx-auto size-8" />} title={t("studentPortal.invoices.emptyTitle")} />
      )}

      <div className="space-y-3">
        {data?.data.map((inv) => {
          const outstanding = Number(inv.total) - Number(inv.amount_paid)

          return (
            <PortalCard key={inv.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{inv.invoice_no}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">{money(inv.total, inv.currency)}</p>
                </div>
                <StatusBadge status={inv.status} map={INVOICE_BADGE} />
              </div>

              <div className="mt-3 flex justify-between border-t pt-3 text-sm">
                <span className="text-muted-foreground">{t("studentPortal.invoices.paid")}</span>
                <span className="tabular-nums">{money(inv.amount_paid, inv.currency)}</span>
              </div>
              {outstanding > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("studentPortal.invoices.outstanding")}</span>
                  <span className="font-medium tabular-nums text-amber-700">{money(outstanding, inv.currency)}</span>
                </div>
              )}

              {inv.receipts && inv.receipts.length > 0 && (
                <div className="mt-3 border-t pt-3">
                  <p className="mb-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">{t("studentPortal.invoices.receipts")}</p>
                  {inv.receipts.map((r) => (
                    <div key={r.payment_no} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {r.received_at ? new Date(r.received_at).toLocaleDateString() : r.payment_no}
                      </span>
                      <span className="tabular-nums">{money(r.amount, inv.currency)}</span>
                    </div>
                  ))}
                </div>
              )}

              <Button
                type="button"
                variant="secondary"
                className="mt-3 h-10 w-full"
                disabled={pdf.isPending && pdf.variables === inv.id}
                onClick={() => pdf.mutate(inv.id)}
              >
                <Download className="size-4" />
                {pdf.isPending && pdf.variables === inv.id ? t("studentPortal.invoices.preparing") : t("studentPortal.invoices.downloadPdf")}
              </Button>
            </PortalCard>
          )
        })}
      </div>
    </div>
  )
}
