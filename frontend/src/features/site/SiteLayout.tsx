import { Bell, ChevronLeft, ChevronRight, Facebook, Instagram, Linkedin, LogIn, Mail, Menu, MessageCircle, Phone, X, Youtube } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, NavLink, Outlet, useLocation } from "react-router-dom"

import casLogo from "@/assets/cas-logo.png"
import casLogoWhite from "@/assets/cas-logo-white.png"
import ScrollToTop from "@/features/site/ScrollToTop"
import SiteHelpDock from "@/features/site/SiteHelpDock"
import SiteMegaMenu from "@/features/site/SiteMegaMenu"
import { langDef } from "@/i18n/languages"
import LanguageSwitcher from "@/i18n/LanguageSwitcher"
import { cn } from "@/lib/utils"

type NavItemT = { to: string; labelKey: string; dropdown?: [string, string][] }

// Primary top-nav — mirrors the reference header, adapted to CAS's services.
// "Why CAS" carries a stats dropdown, like the reference's "WHY CUCAS".
// Labels are i18n keys resolved at render (report — 5-language support).
const NAV_PRIMARY: NavItemT[] = [
  {
    to: "/site/about",
    labelKey: "nav.whyCas",
    dropdown: [
      ["whyCasMenu.universities", "/site/universities?moe=1"],
      ["whyCasMenu.programs", "/site/programs?level=bachelor"],
      ["whyCasMenu.scholarships", "/site/scholarships"],
      ["whyCasMenu.cities", "/site/cities"],
      ["whyCasMenu.localServices", "/site/services"],
      ["whyCasMenu.howItWorks", "/site/about?section=process"],
      ["whyCasMenu.learningCenter", "/site/news?view=guides"],
    ],
  },
  { to: "/site/why-china", labelKey: "nav.studyInChina" },
  { to: "/site/universities", labelKey: "nav.universities" },
  { to: "/site/programs", labelKey: "nav.programs" },
  { to: "/site/pricing", labelKey: "nav.pricing" },
  { to: "/site/partner", labelKey: "nav.partner" },
]

// Fuller list for the mobile drawer (its own distinct URLs — nav bar and
// drawer are never visible at once, but this keeps every link unique).
const NAV = [
  ...NAV_PRIMARY.map(({ to, labelKey }) => ({ to: `${to}${to.includes("?") ? "&" : "?"}m=1`, labelKey })),
  { to: "/site/scholarships?m=1", labelKey: "nav.scholarships" },
  { to: "/site/study-plan?m=1", labelKey: "nav.freeStudyPlan" },
  { to: "/site/news?m=1", labelKey: "nav.news" },
]

const WHATSAPP = "https://wa.me/8618041566030"

/** A desktop nav link that reveals a single-column dropdown on hover, like the
 *  reference's "WHY CUCAS" menu (dashed separators + a caret pointer). */
function NavItem({ item }: { item: NavItemT }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const show = () => { if (timer.current) clearTimeout(timer.current); setOpen(true) }
  const hide = () => { timer.current = setTimeout(() => setOpen(false), 120) }

  const link = (
    <NavLink
      to={item.to}
      className={({ isActive }) => cn(
        "inline-flex items-center py-1 text-[13px] font-semibold tracking-wide uppercase transition-colors [text-shadow:0_1px_2px_rgba(255,255,255,0.35)]",
        isActive ? "text-cas-red" : "text-cas-navy hover:text-cas-red",
      )}
    >
      {t(item.labelKey)}
    </NavLink>
  )

  if (!item.dropdown) return link

  return (
    <div className="relative" onMouseEnter={show} onMouseLeave={hide}>
      {link}
      <div
        className={cn(
          "absolute top-full left-1/2 z-40 -translate-x-1/2 pt-3 transition-all duration-150",
          open ? "visible translate-y-0 opacity-100" : "pointer-events-none invisible -translate-y-1 opacity-0",
        )}
      >
        <div className="relative w-60 rounded-sm bg-white py-1 shadow-xl ring-1 ring-black/5">
          <span className="absolute -top-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 bg-white" />
          <ul>
            {item.dropdown.map(([labelKey, to], i) => (
              <li key={labelKey} className={cn("mx-4", i < item.dropdown!.length - 1 && "border-b border-dashed border-gray-200")}>
                <Link to={to} onClick={() => setOpen(false)} className="block py-2.5 text-sm text-gray-600 transition-colors hover:text-cas-red-600">
                  {t(labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

const NOTIFICATIONS: { title: string; body: string; to: string }[] = [
  { title: "March 2026 intake now open across partner universities", body: "Applications for the March 2026 intake are open at Ministry of Education–listed universities. Apply early to secure your seat and a scholarship.", to: "/site/universities?topic=deadlines&src=bell" },
  { title: "CSC & provincial scholarships accepting applications", body: "Government (CSC) and provincial scholarships are now accepting applications for the coming academic year. Talk to CAS to check your eligibility.", to: "/site/scholarships?q=CSC&src=bell" },
  { title: "New Ministry of Education–listed universities added", body: "We've added new MoE-listed universities to our catalogue, with English-taught programs across medicine, engineering and business.", to: "/site/universities?topic=moe&src=bell" },
  { title: "How to prepare a strong MBBS application", body: "Read our step-by-step guide to preparing a competitive MBBS application for study in China — from documents to deadlines.", to: "/site/programs?q=MBBS&src=bell" },
]

/** Notifications bell with a popup you can page through (reference behaviour). */
function NotificationBell() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [idx, setIdx] = useState(0)
  const n = NOTIFICATIONS.length
  const item = NOTIFICATIONS[idx]
  const go = (d: number) => setIdx((i) => (i + d + n) % n)

  return (
    <div className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={t("header.notifications")}
        className="relative inline-flex text-cas-navy transition-colors hover:text-cas-red"
      >
        <Bell className="size-5" />
        <span className="absolute -top-1.5 -right-1.5 flex min-w-4 items-center justify-center rounded-full bg-cas-red px-1 text-[10px] font-bold text-white">{n}</span>
      </button>

      {open && (
        <div className="absolute top-full right-0 z-40 mt-3 w-80 rounded-sm border bg-white p-4 text-left shadow-xl">
          <span className="absolute -top-1.5 right-4 size-3 rotate-45 border-t border-l bg-white" />
          <button type="button" onClick={() => setOpen(false)} aria-label={t("header.close")} className="absolute top-3 right-3 text-cas-red hover:text-cas-red-600"><X className="size-4" /></button>
          <h4 className="pr-6 text-sm font-semibold text-cas-navy">{item.title}</h4>
          <div className="my-3 border-t border-dashed" />
          <p className="text-sm leading-relaxed text-muted-foreground">{item.body}</p>
          <div className="mt-4 flex items-center justify-between">
            <Link to={item.to} onClick={() => setOpen(false)} className="text-sm font-semibold text-cas-red hover:underline">{t("header.learnMoreArrow")}</Link>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => go(-1)} aria-label={t("header.previousNotification")} className="flex size-7 items-center justify-center rounded-full border text-cas-navy transition-colors hover:border-cas-red hover:text-cas-red"><ChevronLeft className="size-4" /></button>
              <button type="button" onClick={() => go(1)} aria-label={t("header.nextNotification")} className="flex size-7 items-center justify-center rounded-full border text-cas-navy transition-colors hover:border-cas-red hover:text-cas-red"><ChevronRight className="size-4" /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SiteLayout() {
  const { t, i18n } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const isHome = pathname === "/site"

  // Header is transparent over the home hero and turns solid once scrolled
  // (or on any non-home page). The logo stays the real colour mark throughout.
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })

    return () => window.removeEventListener("scroll", onScroll)
  }, [])
  const solid = !isHome || scrolled

  return (
    <div dir={langDef(i18n.language).dir} className="site-root flex min-h-dvh flex-col overflow-x-clip bg-subtle lg:pb-14">
      <ScrollToTop />

      {/* Header — light frosted overlay over the hero, solid once scrolled/elsewhere */}
      <header className={cn("fixed inset-x-0 top-0 z-30 transition-colors duration-300", solid ? "bg-white shadow-sm" : "bg-white/15 backdrop-blur-md")}>
        {/* Top promo bar — visible at the top, hidden once scrolled */}
        {!scrolled && (
          <div className={cn("border-b", solid ? "border-black/5 bg-subtle" : "border-white/25")}>
            <div className="mx-auto flex max-w-7xl items-center justify-center gap-6 px-4 py-1.5 text-[13px] sm:px-6 lg:justify-between">
              <div className="flex items-center gap-3">
                <span className="hidden text-cas-navy/75 sm:inline">{t("header.promoFreeApplyText")}</span>
                <Link to="/site/universities?topic=free-apply&sort=programs" className="rounded-sm bg-cas-navy px-2.5 py-0.5 text-xs text-white transition-colors hover:bg-cas-navy-700">{t("header.learnMore")}</Link>
              </div>
              <div className="hidden items-center gap-3 md:flex">
                <span className="text-cas-navy/75">{t("header.promoScholarshipsText")}</span>
                <Link to="/site/scholarships?q=funded-2026" className="rounded-sm bg-cas-navy px-2.5 py-0.5 text-xs text-white transition-colors hover:bg-cas-navy-700">{t("header.learnMore")}</Link>
              </div>
            </div>
          </div>
        )}

        {/* Main nav */}
        <div className="relative">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link to="/site" className="flex shrink-0 items-center" onClick={() => setMenuOpen(false)}>
              <img src={casLogo} alt="CAS — Consultancy for Abroad Study" className="h-6 w-auto drop-shadow-sm sm:h-9 lg:h-10" />
            </Link>

            <nav className="hidden items-center gap-6 lg:flex">
              {NAV_PRIMARY.map((item) => <NavItem key={item.to} item={item} />)}
              <SiteMegaMenu />
            </nav>

            <div className="flex shrink-0 items-center gap-3">
              <LanguageSwitcher className="hidden sm:block" />
              <Link to="/portal/login" className="inline-flex items-center gap-1.5 rounded-sm bg-cas-red px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cas-red-600 sm:px-4">
                <LogIn className="size-4" /> <span className="hidden sm:inline">{t("header.signIn")}</span>
              </Link>
              <NotificationBell />
              <button
                type="button"
                className="inline-flex size-9 items-center justify-center rounded-sm text-cas-navy hover:bg-black/5 lg:hidden"
                aria-label={menuOpen ? t("header.closeMenu") : t("header.openMenu")}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
              >
                {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            </div>
          </div>

          {menuOpen && (
            <nav className="border-t bg-white px-4 py-2 shadow-sm lg:hidden">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) => cn(
                    "block rounded-sm px-3 py-2.5 text-sm font-medium",
                    isActive ? "bg-cas-red-50 text-cas-red" : "text-cas-navy hover:bg-black/5",
                  )}
                >
                  {t(item.labelKey)}
                </NavLink>
              ))}
              <div className="px-3 py-2"><LanguageSwitcher /></div>
            </nav>
          )}
        </div>
      </header>

      <main className={cn("mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6", isHome ? "pb-8" : "pt-28 pb-8")}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t bg-cas-navy text-white/80">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <img src={casLogoWhite} alt="CAS" className="h-10 w-auto" />
            <p className="mt-3 max-w-sm text-sm">
              {t("footer.blurb")}
            </p>
            <div className="mt-4 flex gap-3">
              {[
                { icon: Facebook, label: "Facebook", url: "https://www.facebook.com/casmoe" },
                { icon: Instagram, label: "Instagram", url: "https://www.instagram.com/casmoe" },
                { icon: Youtube, label: "YouTube", url: "https://www.youtube.com/@casmoe" },
                { icon: Linkedin, label: "LinkedIn", url: "https://www.linkedin.com/company/casmoe" },
              ].map(({ icon: Icon, label, url }) => (
                <a key={label} href={url} target="_blank" rel="noreferrer" aria-label={label}
                  className="inline-flex size-9 items-center justify-center rounded-full bg-white/10 hover:bg-cas-red hover:text-white">
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">{t("footer.explore")}</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/site/universities?sort=programs" className="hover:text-white">{t("footer.exploreUniversities")}</Link></li>
              <li><Link to="/site/programs?sort=newest" className="hover:text-white">{t("footer.explorePrograms")}</Link></li>
              <li><Link to="/site/scholarships?type=government" className="hover:text-white">{t("footer.exploreScholarships")}</Link></li>
              <li><Link to="/site/why-china?read=intro" className="hover:text-white">{t("footer.exploreWhyChina")}</Link></li>
              <li><Link to="/site/news?view=all" className="hover:text-white">{t("footer.exploreNews")}</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">{t("footer.services")}</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/site/services#admission" className="hover:text-white">{t("footer.serviceAdmission")}</Link></li>
              <li><Link to="/site/services#visa" className="hover:text-white">{t("footer.serviceVisa")}</Link></li>
              <li><Link to="/site/services#scholarships" className="hover:text-white">{t("footer.serviceScholarships")}</Link></li>
              <li><Link to="/site/about?section=story" className="hover:text-white">{t("footer.serviceAbout")}</Link></li>
              <li><Link to="/admin" className="hover:text-white">{t("footer.serviceStaffLogin")}</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">{t("footer.getInTouch")}</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a href="tel:+8618041566030" className="flex items-center gap-2 hover:text-white"><Phone className="size-4" /> +86 180 4156 6030</a></li>
              <li><a href="mailto:info@cas.moe" className="flex items-center gap-2 hover:text-white"><Mail className="size-4" /> info@cas.moe</a></li>
              <li><a href={WHATSAPP} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white"><MessageCircle className="size-4" /> {t("footer.whatsappUs")}</a></li>
            </ul>
            <Link to="/site/contact" className="mt-4 inline-flex rounded-sm bg-cas-red px-4 py-2 text-sm font-semibold text-white hover:bg-cas-red-600">
              {t("footer.freeConsultation")}
            </Link>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-white/60 sm:flex-row sm:px-6">
            <p>{t("footer.rights", { year: new Date().getFullYear() })}</p>
            <p>{t("footer.authorized")}</p>
          </div>
        </div>
      </footer>

      {/* Persistent conversion chrome: HELP tab + bottom help bar + counsellor widget */}
      <SiteHelpDock />
    </div>
  )
}
