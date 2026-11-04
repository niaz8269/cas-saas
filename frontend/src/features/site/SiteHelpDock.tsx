import { ArrowUp, CalendarDays, Mail, MessageCircle, MoreHorizontal, Phone, X } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { CONTACT } from "@/lib/contact"
import { cn } from "@/lib/utils"

// CAS's own channels (mirrors the footer) — never the reference's.
const { phone: PHONE, phoneDisplay: PHONE_DISPLAY, whatsapp: WHATSAPP, emailEnquiry: EMAIL, wechat: WECHAT_ID } = CONTACT

const GREEN = "25D366"
const WECHAT_GREEN = "07C160"

// Brand-coloured QR with a logo badge in the middle (error correction H keeps it scannable).
const brandQr = (data: string, color: string) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&ecc=H&color=${color}&data=${encodeURIComponent(data)}`

/**
 * A scannable contact tile: QR code, logo badge and a caption. CAS's own WeChat
 * QR image can be dropped at public/images/wechat-qr.png; until it exists a code
 * carrying the WeChat ID is shown.
 */
function QrTile({ kind, alt, caption }: { kind: "wechat" | "whatsapp"; alt: string; caption: string }) {
  const [missing, setMissing] = useState(false)
  const own = kind === "wechat" && !missing
  const color = kind === "wechat" ? WECHAT_GREEN : GREEN

  return (
    <figure className="flex w-[9.5rem] flex-col items-center gap-2">
      <div className="relative size-[7.5rem]">
        <img
          src={own ? "/images/wechat-qr.png" : brandQr(kind === "wechat" ? WECHAT_ID : WHATSAPP, kind === "wechat" ? color : "1F2933")}
          onError={() => kind === "wechat" && setMissing(true)}
          alt={alt}
          className="size-full rounded object-contain"
        />
        {!own && (
          <span aria-hidden className="absolute top-1/2 left-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow">
            <span className="flex size-6 items-center justify-center rounded-full text-white" style={{ backgroundColor: `#${color}` }}>
              {kind === "wechat" ? <MessageCircle className="size-3.5" /> : <Phone className="size-3.5" />}
            </span>
          </span>
        )}
      </div>
      <figcaption className="text-center text-xs leading-snug text-muted-foreground">{caption}</figcaption>
    </figure>
  )
}

// The single contact entry in the help bar (CAS admissions — no staff photos).
const CONTACTS = [{ nameKey: "helpDock.talkToCounsellor" }]

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
  const { t } = useTranslation()
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
  const Divider = () => <span className="h-6 w-px border-l border-dashed border-white/25" />

  return (
    <>
      {/* ── Desktop bottom help bar ─────────────────────────── */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 hidden bg-[#3b3b44] text-white shadow-[0_-2px_10px_rgba(0,0,0,0.15)] transition-transform duration-300 lg:block",
          barVisible ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-1">
          <span className="text-[11px] leading-tight font-bold tracking-wide text-cas-red uppercase">{t("helpDock.hereToHelpLine1")}<br />{t("helpDock.hereToHelpLine2")}</span>
          <Divider />
          <div className="flex items-center gap-5">
            {CONTACTS.map((c) => (
              <div key={c.nameKey} className="group relative flex cursor-pointer flex-col items-center">
                <span className="flex size-7 items-center justify-center rounded-full bg-white/10 ring-2 ring-cas-red/80"><MessageCircle className="size-3.5" /></span>
                <span className="text-[10px] leading-tight text-white/80">{t(c.nameKey)}</span>

                {/* Contact-details card revealed on hover. The wrapper's pb-3
                    bridges the gap to the avatar so moving the cursor into the
                    card keeps it open (and lets the WhatsApp link be clicked). */}
                <div className="absolute bottom-full left-0 z-50 hidden w-[24rem] pb-3 group-hover:block">
                  <div className="relative rounded-sm bg-white p-4 text-left text-cas-navy shadow-2xl">
                    <span className="absolute -bottom-1.5 left-10 size-3 -translate-x-1/2 rotate-45 bg-white" />
                    <p className="text-sm font-bold text-cas-navy">{t("helpDock.scanToChat")}</p>
                    <div className="mt-3 flex items-start justify-between gap-4">
                      <QrTile kind="wechat" alt={t("helpDock.wechatQrAlt")} caption={`${t("helpDock.wechat")}: ${WECHAT_ID}`} />
                      <QrTile kind="whatsapp" alt={t("helpDock.whatsapp")} caption={`${t("helpDock.whatsapp")}: ${PHONE_DISPLAY}`} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-4">
            <Link to="/site/study-plan?plan=custom" className="flex items-center gap-2 text-xs text-white/90 transition-colors hover:text-cas-red">
              <CalendarDays className="size-4" /> {t("helpDock.customPlan")}
            </Link>
            <Divider />
            <button type="button" onClick={() => setMsgOpen((v) => !v)} className="flex items-center gap-2 text-xs text-white/90 transition-colors hover:text-cas-red">
              <span className="flex size-5 items-center justify-center rounded-full border border-white/50"><MoreHorizontal className="size-3" /></span>
              {t("helpDock.leaveMessage")}
            </button>
            <Divider />
            <button type="button" aria-label={t("helpDock.backToTop")} onClick={toTop} className="flex size-7 items-center justify-center border border-white/40 transition-colors hover:bg-white/10">
              <ArrowUp className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Right-edge HELP tab (reveals the bar) ───────────── */}
      <button
        type="button"
        onClick={() => setManualOpen(true)}
        aria-label={t("helpDock.showHelpBar")}
        className={cn(
          "fixed top-1/2 right-0 z-30 hidden -translate-y-1/2 flex-col items-center gap-1 rounded-l-md bg-[#3b3b44] px-2.5 py-3 text-white shadow-lg transition-all duration-200 hover:bg-[#4a4a54] lg:flex",
          barVisible ? "pointer-events-none translate-x-full opacity-0" : "opacity-100",
        )}
      >
        <MessageCircle className="size-5 text-cas-red" />
        <span className="text-[11px] font-semibold tracking-wide">{t("helpDock.help")}</span>
      </button>

      {/* ── "Leave Message" popover (shared with mobile FAB) ── */}
      <div
        className={cn(
          "fixed right-4 bottom-20 z-40 w-72 origin-bottom-right overflow-hidden rounded-sm border bg-card shadow-xl transition-all duration-200 sm:right-6 lg:bottom-16",
          msgOpen ? "visible scale-100 opacity-100" : "pointer-events-none invisible scale-95 opacity-0",
        )}
      >
        <div className="flex items-center justify-between bg-cas-navy px-4 py-3 text-white">
          <span className="font-semibold">{t("helpDock.talkToCounsellor")}</span>
          <button type="button" aria-label={t("helpDock.close")} onClick={() => setMsgOpen(false)} className="rounded p-0.5 hover:bg-white/15"><X className="size-4" /></button>
        </div>
        <div className="p-3">
          <p className="px-1 pb-2 text-sm text-muted-foreground">{t("helpDock.freeGuidance")}</p>
          <a href={WHATSAPP} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-sm px-3 py-2.5 transition-colors hover:bg-muted">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15 text-[#128C42]"><MessageCircle className="size-5" /></span>
            <span><span className="block text-sm font-medium text-ink">{t("helpDock.whatsapp")}</span><span className="block text-xs text-muted-foreground">{t("helpDock.chatNow")}</span></span>
          </a>
          <a href={`tel:${PHONE}`} className="flex items-center gap-3 rounded-sm px-3 py-2.5 transition-colors hover:bg-muted">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cas-navy-50 text-cas-navy"><Phone className="size-5" /></span>
            <span><span className="block text-sm font-medium text-ink">{t("helpDock.callUs")}</span><span className="block text-xs text-muted-foreground">{PHONE_DISPLAY}</span></span>
          </a>
          <a href={`mailto:${EMAIL}`} className="flex items-center gap-3 rounded-sm px-3 py-2.5 transition-colors hover:bg-muted">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cas-navy-50 text-cas-navy"><Mail className="size-5" /></span>
            <span><span className="block text-sm font-medium text-ink">{t("helpDock.email")}</span><span className="block text-xs text-muted-foreground">{EMAIL}</span></span>
          </a>
          <Link to="/site/study-plan?plan=free" onClick={() => setMsgOpen(false)} className="mt-1 block rounded-sm bg-cas-red px-3 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-cas-red-600">
            {t("helpDock.freeStudyPlan")}
          </Link>
        </div>
      </div>

      {/* ── Mobile floating "Message" button ────────────────── */}
      <button
        type="button"
        aria-label={msgOpen ? t("helpDock.close") : t("helpDock.leaveAMessage")}
        onClick={() => setMsgOpen((v) => !v)}
        className="fixed right-4 bottom-4 z-40 inline-flex items-center gap-2 rounded-full bg-cas-navy p-3.5 text-white shadow-lg transition-transform hover:scale-[1.03] sm:py-3.5 sm:pr-4 sm:pl-3.5 lg:hidden"
      >
        {msgOpen ? <X className="size-6" /> : <MessageCircle className="size-6" />}
        <span className="hidden text-sm font-semibold sm:inline">{msgOpen ? t("helpDock.close") : t("helpDock.message")}</span>
      </button>
    </>
  )
}
