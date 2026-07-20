import { ArrowUp, CalendarCheck, Headset, Mail, MessageCircle, Phone, X } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { cn } from "@/lib/utils"

// CAS's own channels (mirrors the footer) — never the reference's.
const PHONE = "+8618041566030"
const PHONE_DISPLAY = "+86 180 4156 6030"
const WHATSAPP = "https://wa.me/8618041566030"
const EMAIL = "info@cas.moe"

/**
 * Persistent conversion chrome for the public site, modelled on the reference:
 * a floating "Talk to a counsellor" widget, a desktop bottom help bar, and a
 * back-to-top button that appears once the visitor scrolls.
 */
export default function SiteHelpDock() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 400)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })

    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const toTop = () => window.scrollTo({ top: 0, behavior: "smooth" })

  return (
    <>
      {/* Desktop bottom help bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 hidden border-t border-white/10 bg-cas-navy text-white/90 lg:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-2.5 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <Headset className="size-4 text-cas-gold" />
            We're here to help — free, expert guidance on studying in China.
          </p>
          <div className="flex items-center gap-2">
            <Link
              to="/site/study-plan"
              className="inline-flex items-center gap-1.5 rounded-sm bg-cas-gold px-3 py-1.5 font-semibold text-cas-navy transition-colors hover:bg-cas-gold-600"
            >
              <CalendarCheck className="size-4" /> Get a free study plan
            </Link>
            <Link
              to="/site/contact"
              className="inline-flex items-center gap-1.5 rounded-sm border border-white/25 px-3 py-1.5 font-medium transition-colors hover:bg-white/10"
            >
              <MessageCircle className="size-4" /> Leave a message
            </Link>
          </div>
        </div>
      </div>

      {/* Back-to-top — appears after scrolling */}
      <button
        type="button"
        aria-label="Back to top"
        onClick={toTop}
        className={cn(
          "fixed right-4 z-40 inline-flex size-10 items-center justify-center rounded-full border bg-card text-cas-navy shadow-lg transition-all duration-200 hover:bg-muted sm:right-6",
          "bottom-[5.5rem] lg:bottom-[8.5rem]",
          scrolled ? "visible opacity-100" : "pointer-events-none invisible translate-y-1 opacity-0",
        )}
      >
        <ArrowUp className="size-5" />
      </button>

      {/* Floating counsellor widget */}
      <div className="fixed right-4 bottom-4 z-40 sm:right-6 lg:bottom-[4.5rem]">
        <div
          className={cn(
            "absolute right-0 bottom-16 w-72 origin-bottom-right overflow-hidden rounded-sm border bg-card shadow-sm transition-all duration-200",
            open ? "visible scale-100 opacity-100" : "pointer-events-none invisible scale-95 opacity-0",
          )}
        >
          <div className="flex items-center justify-between bg-cas-navy px-4 py-3 text-white">
            <span className="font-semibold">Talk to a counsellor</span>
            <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="rounded p-0.5 hover:bg-white/15">
              <X className="size-4" />
            </button>
          </div>
          <div className="p-3">
            <p className="px-1 pb-2 text-sm text-muted-foreground">Free guidance — we usually reply within a day.</p>
            <a href={WHATSAPP} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-sm px-3 py-2.5 transition-colors hover:bg-muted">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15 text-[#128C42]"><MessageCircle className="size-5" /></span>
              <span><span className="block text-sm font-medium text-ink">WhatsApp</span><span className="block text-xs text-muted-foreground">Chat with us now</span></span>
            </a>
            <a href={`tel:${PHONE}`} className="flex items-center gap-3 rounded-sm px-3 py-2.5 transition-colors hover:bg-muted">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cas-navy-50 text-cas-navy"><Phone className="size-5" /></span>
              <span><span className="block text-sm font-medium text-ink">Call us</span><span className="block text-xs text-muted-foreground">{PHONE_DISPLAY}</span></span>
            </a>
            <a href={`mailto:${EMAIL}`} className="flex items-center gap-3 rounded-sm px-3 py-2.5 transition-colors hover:bg-muted">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cas-navy-50 text-cas-navy"><Mail className="size-5" /></span>
              <span><span className="block text-sm font-medium text-ink">Email</span><span className="block text-xs text-muted-foreground">{EMAIL}</span></span>
            </a>
            <Link
              to="/site/study-plan"
              onClick={() => setOpen(false)}
              className="mt-1 block rounded-sm bg-cas-gold px-3 py-2.5 text-center text-sm font-semibold text-cas-navy transition-colors hover:bg-cas-gold-600"
            >
              Get a free study plan →
            </Link>
          </div>
        </div>

        <button
          type="button"
          aria-label={open ? "Close counsellor menu" : "Talk to a counsellor"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full bg-cas-navy py-3.5 pr-4 pl-3.5 text-white shadow-lg transition-transform hover:scale-[1.03]"
        >
          {open ? <X className="size-6" /> : <Headset className="size-6" />}
          <span className="hidden text-sm font-semibold sm:inline">{open ? "Close" : "Talk to a counsellor"}</span>
        </button>
      </div>
    </>
  )
}
