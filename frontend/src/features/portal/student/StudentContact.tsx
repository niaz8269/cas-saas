import { useMutation } from "@tanstack/react-query"
import { CheckCircle2, Copy, Mail, MessageCircle, Send } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { sendStudentMessage } from "@/features/portal/api"
import { PageTitle, PortalCard } from "@/features/portal/components"
import { CONTACT } from "@/lib/contact"
import { usePortalAuthStore } from "@/stores/portalAuth"

/** Every way to reach the CAS team from the student portal. */
export default function StudentContact() {
  const { t } = useTranslation()
  const profile = usePortalAuthStore((s) => s.profile)
  const [body, setBody] = useState("")
  const [copied, setCopied] = useState(false)

  const send = useMutation({
    mutationFn: () => sendStudentMessage(body.trim()),
    onSuccess: () => setBody(""),
  })

  const code = profile?.code ?? ""
  const whatsappText = encodeURIComponent(t("studentPortal.contact.whatsappText", { code }))

  const copyWechat = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT.wechat)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Clipboard can be blocked; the ID is on screen to copy by hand.
    }
  }

  return (
    <div className="space-y-4">
      <PageTitle title={t("studentPortal.contact.title")} subtitle={t("studentPortal.contact.subtitle")} />

      <div className="grid gap-3 sm:grid-cols-2">
        <a
          href={`${CONTACT.whatsapp}?text=${whatsappText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-muted/50"
        >
          <MessageCircle className="size-6 shrink-0 text-cas-navy" aria-hidden="true" />
          <span>
            <span className="block text-sm font-semibold">{t("studentPortal.contact.whatsapp")}</span>
            <span className="block text-xs text-muted-foreground">{CONTACT.phoneDisplay}</span>
          </span>
        </a>
        <a
          href={`mailto:${CONTACT.emailEnquiry}?subject=${encodeURIComponent(t("studentPortal.contact.emailSubject", { code }))}`}
          className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-muted/50"
        >
          <Mail className="size-6 shrink-0 text-cas-navy" aria-hidden="true" />
          <span>
            <span className="block text-sm font-semibold">{t("studentPortal.contact.email")}</span>
            <span className="block text-xs text-muted-foreground">{CONTACT.emailEnquiry}</span>
          </span>
        </a>
      </div>

      <PortalCard>
        <div className="flex items-center gap-4">
          <img src="/images/wechat-qr-v2.jpg" alt={t("studentPortal.contact.wechatQrAlt")} width={128} height={128} className="size-32 shrink-0 rounded-lg border bg-white object-contain" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">{t("studentPortal.contact.wechat")}</p>
            <p className="mt-0.5 font-mono text-sm break-all">{CONTACT.wechat}</p>
            <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={copyWechat}>
              {copied ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
              {copied ? t("studentPortal.contact.copied") : t("studentPortal.contact.copyId")}
            </Button>
          </div>
        </div>
      </PortalCard>

      <PortalCard>
        <h2 className="text-sm font-semibold">{t("studentPortal.contact.messageTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("studentPortal.contact.messageHint")}</p>

        {send.isSuccess ? (
          <p role="status" className="mt-3 flex items-start gap-2 rounded-md bg-cas-navy-50 px-3 py-2 text-sm text-cas-navy">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {t("studentPortal.contact.sent")}
          </p>
        ) : (
          <form
            className="mt-3 space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (body.trim().length >= 5) send.mutate()
            }}
          >
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              maxLength={2000}
              aria-label={t("studentPortal.contact.messageLabel")}
              placeholder={t("studentPortal.contact.messagePlaceholder")}
              className="w-full rounded-md border border-input bg-card px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
            />
            {send.isError && (
              <p role="alert" className="text-sm text-destructive">{t("studentPortal.contact.sendFailed")}</p>
            )}
            <Button type="submit" disabled={send.isPending || body.trim().length < 5} className="h-10 w-full sm:w-auto">
              <Send className="size-4" aria-hidden="true" />
              {send.isPending ? t("studentPortal.contact.sending") : t("studentPortal.contact.send")}
            </Button>
          </form>
        )}
      </PortalCard>
    </div>
  )
}
