import { Globe, Mail, MapPin, MessageCircle } from "lucide-react"
import { useTranslation } from "react-i18next"

import { SitePageHeader } from "@/features/site/components"
import EnquiryForm from "@/features/site/EnquiryForm"
import { useSeo } from "@/lib/seo"

// Display text lives in i18n keys resolved via t() at render (report — 5-language support).
const OFFICES = [
  { cityKey: "contact.officeList.headOffice.city", detailKey: "contact.officeList.headOffice.detail" },
  { cityKey: "contact.officeList.islamabad.city", detailKey: "contact.officeList.islamabad.detail" },
]

export default function SiteContact() {
  const { t } = useTranslation()

  useSeo({
    title: t("contact.seoTitle"),
    description: t("contact.seoDescription"),
    canonicalPath: "/site/contact",
  })

  return (
    <div className="space-y-6">
      <SitePageHeader
        eyebrow={t("contact.eyebrow")}
        title={t("contact.title")}
        subtitle={t("contact.subtitle")}
      />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Contact details */}
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-sm border bg-card p-6 shadow-sm">
            <h2 className="font-semibold text-cas-navy">{t("contact.talkToUs")}</h2>
            <ul className="mt-4 space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <Globe className="mt-0.5 size-5 text-cas-navy" />
                <span><span className="block font-medium">{t("contact.website")}</span><a href="https://www.cas.moe" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-cas-navy">www.cas.moe</a></span>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="mt-0.5 size-5 text-cas-navy" />
                <span><span className="block font-medium">{t("contact.emailLabel")}</span><a href="mailto:info@cas.moe" className="text-muted-foreground hover:text-cas-navy">info@cas.moe</a></span>
              </li>
              <li className="flex items-start gap-3">
                <MessageCircle className="mt-0.5 size-5 text-cas-navy" />
                <span><span className="block font-medium">{t("contact.whatsapp")}</span><span className="text-muted-foreground">{t("contact.whatsappHelp")}</span></span>
              </li>
            </ul>
          </div>

          <div className="rounded-sm border bg-card p-6 shadow-sm">
            <h2 className="font-semibold text-cas-navy">{t("contact.offices")}</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {OFFICES.map((o) => (
                <li key={o.cityKey} className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-5 text-cas-navy" />
                  <span><span className="block font-medium">{t(o.cityKey)}</span><span className="text-muted-foreground">{t(o.detailKey)}</span></span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Enquiry form */}
        <div className="lg:col-span-3">
          <EnquiryForm />
        </div>
      </div>
    </div>
  )
}
