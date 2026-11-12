import { useTranslation } from "react-i18next"

import { CONTACT } from "@/lib/contact"

/** Official WhatsApp glyph (phone in a speech bubble), drawn inline so it needs no icon package. */
function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className} fill="currentColor">
      <path d="M16.003 3C9.374 3 4 8.373 4 15c0 2.357.683 4.554 1.86 6.41L4 29l7.77-1.826A11.94 11.94 0 0 0 16.003 27C22.63 27 28 21.627 28 15S22.63 3 16.003 3Zm0 21.8a9.77 9.77 0 0 1-4.98-1.363l-.357-.213-3.7.87.99-3.6-.233-.37A9.77 9.77 0 0 1 6.2 15c0-5.413 4.39-9.8 9.803-9.8 5.41 0 9.797 4.387 9.797 9.8s-4.387 9.8-9.797 9.8Zm5.37-7.34c-.294-.147-1.743-.86-2.013-.958-.27-.1-.466-.147-.662.147-.197.294-.762.958-.934 1.155-.172.196-.344.22-.638.073-.294-.147-1.243-.458-2.368-1.46-.875-.78-1.466-1.744-1.638-2.038-.172-.294-.018-.453.13-.6.133-.132.294-.344.44-.516.148-.172.197-.294.295-.49.098-.197.05-.37-.025-.516-.073-.147-.662-1.595-.907-2.184-.24-.574-.482-.496-.662-.505l-.564-.01c-.196 0-.515.073-.785.368-.27.294-1.03 1.007-1.03 2.455 0 1.447 1.054 2.848 1.2 3.045.148.196 2.074 3.166 5.025 4.44.702.303 1.25.484 1.677.62.705.224 1.347.192 1.854.117.565-.084 1.743-.712 1.988-1.4.246-.687.246-1.277.172-1.4-.073-.122-.27-.196-.564-.343Z" />
    </svg>
  )
}

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
