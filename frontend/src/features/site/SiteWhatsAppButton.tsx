import { useTranslation } from "react-i18next"

import { WhatsAppGlyph } from "@/features/site/brandIcons"
import { CONTACT } from "@/lib/contact"


/**
 * Floating WhatsApp button, bottom-left of every public page. Opens a chat with CAS on WhatsApp; the first
 * message is pre-filled so the visitor only has to press send.
 */
export default function SiteWhatsAppButton() {
  const { t } = useTranslation()
  const href = `${CONTACT.whatsappButton}?text=${encodeURIComponent(t("whatsappButton.message"))}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("whatsappButton.label")}
      title={t("whatsappButton.label")}
      className="fixed bottom-3 left-3 z-40 inline-flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg ring-1 ring-black/5 transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-[#128C7E] focus-visible:ring-offset-2 focus-visible:outline-none sm:bottom-4 sm:left-4 lg:bottom-[3.75rem]"
    >
      <WhatsAppGlyph className="size-8" />
    </a>
  )
}
