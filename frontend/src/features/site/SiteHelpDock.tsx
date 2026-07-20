import { ArrowUp, CalendarDays, Mail, MessageCircle, MoreHorizontal, Phone, X } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { cn } from "@/lib/utils"

// CAS's own channels (mirrors the footer) — never the reference's.
const PHONE = "+8618041566030"
const PHONE_DISPLAY = "+86 180 4156 6030"
const WHATSAPP = "https://wa.me/8618041566030"
const EMAIL = "info@cas.moe"

// Counsellor faces shown in the help bar (placeholders — swap for real staff).
const COUNSELLORS = [
  { name: "Cathy", img: 1 },
  { name: "Jayla", img: 9 },
  { name: "Joe", img: 13 },
]

// Show the bar once the visitor scrolls past the hero (~480px).
const HERO_THRESHOLD = 480

/**
 * Persistent conversion chrome, modelled precisely on the reference: a bottom
 * help bar ("WE ARE HERE TO HELP" + counsellor faces + actions + back-to-top),
 * a right-edge HELP tab that reveals it, and a "Leave Message" popover.
 *
 * Behaviour: the bar opens when the visitor scrolls past the hero and stays
 * open while scrolled; it hides again only when they return to the hero. The
 * HELP tab lets them open it manually while still on the hero.
 */
export default function SiteHelpDock() {
  const [manualOpen, setManualOpen] = useState(false)
  const [pastHero, setPastHero] = useState(false)
  const [msgOpen, setMsgOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      const past = window.scrollY > HERO_THRESHOLD
      setPastHero(past)
      if (!past) setManualOpen(false) // hide again once back at the hero
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })

    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const barVisible = pastHero || manualOpen
  const toTop = () => window.scrollTo({ top: 0, behavior: "smooth" })
  const Divider = () => <span className="h-9 w-px border-l border-dashed border-white/25" />

  return (
    <>
      {/* ── Desktop bottom help bar ─────────────────────────── */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 hidden bg-[#3b3b44] text-white shadow-[0_-2px_10px_rgba(0,0,0,0.15)] transition-transform duration-300 lg:block",
          barVisible ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-5 px-6 py-2">
          <span className="text-sm leading-tight font-bold tracking-wide text-cas-orange uppercase">We are here<br />to help</span>
          <Divider />
          <div className="flex items-center gap-5">
            {COUNSELLORS.map((c) => (
              <div key={c.name} className="flex flex-col items-center gap-1">
                <img src={`https://i.pravatar.cc/80?img=${c.img}`} alt="" className="size-10 rounded-full object-cover ring-2 ring-cas-orange/80" />
                <span className="text-[11px] text-white/80">{c.name}</span>
              </div>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-5">
            <Link to="/site/study-plan" className="flex items-center gap-2 text-sm text-white/90 transition-colors hover:text-cas-orange">
              <CalendarDays className="size-5" /> Get Customized Application Plan
            </Link>
            <Divider />
            <button type="button" onClick={() => setMsgOpen((v) => !v)} className="flex items-center gap-2 text-sm text-white/90 transition-colors hover:text-cas-orange">
              <span className="flex size-6 items-center justify-center rounded-full border border-white/50"><MoreHorizontal className="size-3.5" /></span>
              Leave Message
            </button>
            <Divider />
            <button type="button" aria-label="Back to top" onClick={toTop} className="flex size-9 items-center justify-center border border-white/40 transition-colors hover:bg-white/10">
              <ArrowUp className="size-5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Right-edge HELP tab (reveals the bar) ───────────── */}
      <button
        type="button"
        onClick={() => setManualOpen(true)}
        aria-label="Show help bar"
        className={cn(
          "fixed top-1/2 right-0 z-30 hidden -translate-y-1/2 flex-col items-center gap-1 rounded-l-md bg-[#3b3b44] px-2.5 py-3 text-white shadow-lg transition-all duration-200 hover:bg-[#4a4a54] lg:flex",
          barVisible ? "pointer-events-none translate-x-full opacity-0" : "opacity-100",
        )}
      >
        <MessageCircle className="size-5 text-cas-orange" />
        <span className="text-[11px] font-semibold tracking-wide">HELP</span>
      </button>

      {/* ── "Leave Message" popover (shared with mobile FAB) ── */}
      <div
        className={cn(
          "fixed right-4 bottom-20 z-40 w-72 origin-bottom-right overflow-hidden rounded-sm border bg-card shadow-xl transition-all duration-200 sm:right-6 lg:bottom-16",
          msgOpen ? "visible scale-100 opacity-100" : "pointer-events-none invisible scale-95 opacity-0",
        )}
      >
        <div className="flex items-center justify-between bg-cas-navy px-4 py-3 text-white">
          <span className="font-semibold">Talk to a counsellor</span>
          <button type="button" aria-label="Close" onClick={() => setMsgOpen(false)} className="rounded p-0.5 hover:bg-white/15"><X className="size-4" /></button>
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
          <Link to="/site/study-plan" onClick={() => setMsgOpen(false)} className="mt-1 block rounded-sm bg-cas-orange px-3 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-cas-orange-600">
            Get a free study plan →
          </Link>
        </div>
      </div>

      {/* ── Mobile floating "Message" button ────────────────── */}
      <button
        type="button"
        aria-label={msgOpen ? "Close" : "Leave a message"}
        onClick={() => setMsgOpen((v) => !v)}
        className="fixed right-4 bottom-4 z-40 inline-flex items-center gap-2 rounded-full bg-cas-navy py-3.5 pr-4 pl-3.5 text-white shadow-lg transition-transform hover:scale-[1.03] lg:hidden"
      >
        {msgOpen ? <X className="size-6" /> : <MessageCircle className="size-6" />}
        <span className="text-sm font-semibold">{msgOpen ? "Close" : "Message"}</span>
      </button>
    </>
  )
}
