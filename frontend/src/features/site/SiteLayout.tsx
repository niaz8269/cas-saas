import { useQuery } from "@tanstack/react-query"
import { ArrowRight, Bell, ChevronLeft, ChevronRight, Facebook, Instagram, Linkedin, LogIn, Mail, Menu, Phone, X, Youtube } from "lucide-react"
import { useEffect, useLayoutEffect, useRef, useState, Suspense } from "react"
import { useTranslation } from "react-i18next"
import { Link, NavLink, Outlet, useLocation } from "react-router-dom"

import casLogo from "@/assets/cas-logo.png"
import casLogoWhite from "@/assets/cas-logo-white.png"
import { getSitePosts } from "@/features/site/api"
import ScrollToTop from "@/features/site/ScrollToTop"
import { WeChatGlyph, WhatsAppGlyph } from "@/features/site/brandIcons"
import SiteHelpDock from "@/features/site/SiteHelpDock"
import SiteWhatsAppButton from "@/features/site/SiteWhatsAppButton"
import { loadTawk } from "@/lib/tawk"
import SiteMegaMenu from "@/features/site/SiteMegaMenu"
import { langDef } from "@/i18n/languages"
import LanguageSwitcher from "@/i18n/LanguageSwitcher"
import { CONTACT } from "@/lib/contact"
import { cn } from "@/lib/utils"
import { usePortalAuthStore } from "@/stores/portalAuth"

type NavItemT = { to: string; labelKey: string; dropdown?: [string, string][] }

// Primary top-nav — mirrors the reference header, adapted to CAS's services.
// "Partner" lives in the ☰ browse menu (SiteMegaMenu) and the mobile menu. "Why CAS" carries a stats dropdown, like the reference's "WHY CUCAS".
// Labels are i18n keys resolved at render (report — 5-language support).
const NAV_PRIMARY: NavItemT[] = [
  {
    to: "/site/about",
    labelKey: "nav.whyCas",
    dropdown: [
      ["whyCasMenu.universities", "/site/universities"],
      ["whyCasMenu.programs", "/site/programs?level=bachelor"],
      ["whyCasMenu.scholarships", "/site/scholarships"],
      ["whyCasMenu.cities", "/site/cities"],
      ["whyCasMenu.mbbs", "/site/mbbs-in-china"],
      ["whyCasMenu.csc", "/site/csc-scholarship"],
      ["whyCasMenu.localServices", "/site/services"],
      ["whyCasMenu.howItWorks", "/site/about?section=process"],
      ["whyCasMenu.learningCenter", "/site/news?view=guides"],
    ],
  },
  { to: "/site/universities", labelKey: "nav.universities" },
  { to: "/site/programs", labelKey: "nav.programs" },
  { to: "/site/services", labelKey: "nav.ourServices" },
]

// Fuller list for the mobile drawer (its own distinct URLs — nav bar and
// drawer are never visible at once, but this keeps every link unique).
const NAV = [
  ...NAV_PRIMARY.map(({ to, labelKey }) => ({ to: `${to}${to.includes("?") ? "&" : "?"}m=1`, labelKey })),
  { to: "/site/partner?m=1", labelKey: "nav.partner" },
  { to: "/site/scholarships?m=1", labelKey: "nav.scholarships" },
  { to: "/site/study-plan?m=1", labelKey: "nav.freeStudyPlan" },
  { to: "/site/news?m=1", labelKey: "nav.news" },
]

const WHATSAPP = CONTACT.whatsapp

const SOCIALS = [
  { icon: Facebook, label: "Facebook", url: "https://www.facebook.com/share/1F7EUukSv2/", topBar: true },
  { icon: Instagram, label: "Instagram", url: "https://www.instagram.com/casmoe", topBar: false },
  { icon: Youtube, label: "YouTube", url: "https://www.youtube.com/@casmoe", topBar: false },
  { icon: Linkedin, label: "LinkedIn", url: "https://www.linkedin.com/in/consultancy-for-abroad-study-cas-39b4a282/", topBar: true },
] as const

/** The WeChat account in the top bar: on hover (or keyboard focus) its QR code opens in a small popup to scan. */
function TopBarWeChat() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`WeChat ${CONTACT.wechatTopBar}`}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false) }}
        className="flex cursor-pointer items-center gap-1.5 hover:underline focus-visible:underline focus-visible:outline-none"
      >
        <WeChatGlyph className="size-4" />
        {CONTACT.wechatTopBar}
      </button>
      {open && (
        <div role="dialog" aria-label={t("topBar.wechatQr", { defaultValue: "WeChat QR code" })} className="absolute top-full left-1/2 z-50 -translate-x-1/2 pt-2">
          <div className="w-52 rounded-md bg-white p-3 text-center text-ink shadow-xl ring-1 ring-black/10">
            <img src={CONTACT.wechatTopBarQr} alt={t("topBar.wechatQrAlt", { defaultValue: "WeChat QR code for CAS-Edu", id: CONTACT.wechatTopBar })} className="mx-auto size-44 rounded-sm" />
            <p className="mt-2 text-xs text-muted-foreground">{t("topBar.wechatScan", { defaultValue: "Scan to add us on WeChat" })}</p>
          </div>
        </div>
      )}
    </span>
  )
}

/** The thin red strip above the navigation: contacts on the left, social links on the right. Hidden on phones. */
function TopBar({ offset }: { offset: number }) {
  const { t } = useTranslation()
  return (
    <div className="hidden bg-cas-red text-white md:block">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 text-[13px] sm:px-6">
        {/* offset = distance from the bar's left edge to the "W" of "WHY CAS" (0 when the desktop nav is hidden) */}
        <ul data-topbar-contacts className="flex flex-wrap items-center gap-x-6 gap-y-1" style={{ marginInlineStart: offset }}>
          <li>
            <a href={CONTACT.whatsapp} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${CONTACT.phoneDisplay}`} className="flex items-center gap-1.5 hover:underline">
              <WhatsAppGlyph className="size-4" /> {CONTACT.phoneDisplay}
            </a>
          </li>
          <li>
            <TopBarWeChat />
          </li>
          <li>
            <a href={`mailto:${CONTACT.emailGeneral}`} className="flex items-center gap-1.5 hover:underline">
              <Mail className="size-3.5" aria-hidden="true" /> {CONTACT.emailGeneral}
            </a>
          </li>
        </ul>
        <p className="ms-auto hidden shrink-0 xl:block">{t("topBar.admissions")}</p>
        <ul className="flex shrink-0 items-center gap-3">
          {SOCIALS.filter((s) => s.topBar).map(({ icon: Icon, label, url }) => (
            <li key={label}>
              <a href={url} target="_blank" rel="noreferrer" aria-label={label} className="inline-flex hover:opacity-80">
                <Icon className="size-4" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

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

// No placeholder notices: the bell shows only published posts.
const NOTIFICATIONS: { title: string; body: string; to: string }[] = []

/** Notifications bell with a popup you can page through (reference behaviour).
 *  Shows the latest published posts, falling back to the static list when the
 *  CMS has nothing yet. */
function NotificationBell() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [idx, setIdx] = useState(0)

  const posts = useQuery({ queryKey: ["site-posts", "bell"], queryFn: () => getSitePosts({}), staleTime: 60_000 })
  const live = (posts.data?.data ?? []).slice(0, 5).map((p) => ({
    title: p.title,
    body: p.excerpt ?? "",
    to: `/site/news/${p.slug}`,
  }))
  const items = live.length > 0 ? live : NOTIFICATIONS

  const n = items.length
  const item = items[Math.min(idx, n - 1)]
  const go = (d: number) => setIdx((i) => (i + d + n) % n)

  return (
    <div className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`${t("header.notifications")} ${n}`}
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
  const isHome = pathname === "/" || pathname === "/site"

  // Signed-in portal visitors get an "Apply now" CTA straight to their apply
  // flow instead of the sign-in button.
  const portalKind = usePortalAuthStore((s) => s.kind)
  const portalToken = usePortalAuthStore((s) => s.token)
  const loggedIn = Boolean(portalToken && portalKind)

  // Live chat (Tawk.to) on the public website only, loaded once after first paint.
  useEffect(() => { loadTawk() }, [])

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

  // Line the top-bar contacts up with the first nav link ("WHY CAS"), at any
  // screen size: measure the gap and hand it to the bar (the page is CSS-zoomed,
  // so rects are divided by the zoom to get layout pixels).
  const navRef = useRef<HTMLElement>(null)
  const [barOffset, setBarOffset] = useState(0)
  useLayoutEffect(() => {
    const measure = () => {
      const link = navRef.current?.querySelector<HTMLElement>("a, button")
      const contacts = document.querySelector<HTMLElement>("[data-topbar-contacts]")
      const container = contacts?.parentElement
      if (!link || !container || link.offsetParent === null || window.innerWidth < 1024) { setBarOffset(0); return }
      const zoom = parseFloat(document.documentElement.style.getPropertyValue("--site-zoom")) || 1
      const cs = getComputedStyle(container)
      const left = container.getBoundingClientRect().left + parseFloat(cs.paddingLeft) * zoom
      const rtl = document.dir === "rtl" || container.closest("[dir=rtl]") !== null
      const x = rtl ? container.getBoundingClientRect().right - parseFloat(cs.paddingRight) * zoom - link.getBoundingClientRect().right
        : link.getBoundingClientRect().left - left
      setBarOffset(Math.max(0, Math.round(x / zoom)))
    }
    measure()
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure)
    ro?.observe(document.documentElement)
    if (navRef.current) ro?.observe(navRef.current)
    window.addEventListener("resize", measure)
    void document.fonts?.ready.then(measure)

    return () => { ro?.disconnect(); window.removeEventListener("resize", measure) }
  }, [i18n.language, pathname])

  // Scale the whole public site with the screen, so the design looks the same
  // from a phone to a 32-inch monitor and wide screens have no empty margins:
  // 1x on phones and tablets, 1.1x up to a 1440px laptop, then in proportion
  // to the width (the layout stays ~1310 CSS px wide). Published as --site-zoom
  // for CSS that needs it (viewport units are scaled by zoom as well).
  useLayoutEffect(() => {
    const apply = () => {
      const w = document.documentElement.clientWidth
      const zoom = w < 1024 ? 1 : Math.min(3, Math.max(1.1, w / 1310))
      document.documentElement.style.setProperty("--site-zoom", zoom.toFixed(3))
    }
    apply()
    window.addEventListener("resize", apply)

    return () => {
      window.removeEventListener("resize", apply)
      document.documentElement.style.removeProperty("--site-zoom")
    }
  }, [])

  return (
    <div dir={langDef(i18n.language).dir} className="site-root flex min-h-dvh flex-col overflow-x-clip bg-subtle lg:pb-11">
      <ScrollToTop />

      {/* Header — light frosted overlay over the hero, solid once scrolled/elsewhere */}
      <header className={cn("fixed inset-x-0 top-0 z-30 transition-colors duration-300", solid ? "bg-white shadow-sm" : "bg-white/70 backdrop-blur-md")}>
        <TopBar offset={barOffset} />
        {/* Main nav */}
        <div className="relative">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link to="/site" className="flex shrink-0 items-center" onClick={() => setMenuOpen(false)}>
              <img src={casLogo} alt="CAS — Consultancy for Abroad Study" className="h-6 w-auto drop-shadow-sm sm:h-9 lg:h-10" />
            </Link>

            <nav ref={navRef} className="hidden items-center gap-6 lg:flex">
              {NAV_PRIMARY.map((item) => <NavItem key={item.to} item={item} />)}
              <SiteMegaMenu />
            </nav>

            <div className="flex shrink-0 items-center gap-3">
              <LanguageSwitcher className="hidden sm:block" />
              {loggedIn ? (
                <Link to={`/portal/${portalKind}/apply`} aria-label={t("header.applyNow")} className="inline-flex items-center gap-1.5 rounded-sm bg-cas-red px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cas-red-600 sm:px-4">
                  <ArrowRight className="size-4" /> <span className="hidden sm:inline">{t("header.applyNow")}</span>
                </Link>
              ) : (
                <Link to="/portal/login" aria-label={t("header.signIn")} className="inline-flex items-center gap-1.5 rounded-sm bg-cas-red px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cas-red-600 sm:px-4">
                  <LogIn className="size-4" /> <span className="hidden sm:inline">{t("header.signIn")}</span>
                </Link>
              )}
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

      <main className={cn("w-full flex-1", isHome ? "pb-8" : "mx-auto max-w-7xl px-4 pt-24 pb-8 sm:px-6 md:pt-[8.25rem]")}>
        <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>
          <Outlet />
        </Suspense>
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
              {SOCIALS.map(({ icon: Icon, label, url }) => (
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
              <li><Link to="/site/mbbs-in-china" className="hover:text-white">{t("footer.exploreMbbs")}</Link></li>
              <li><Link to="/site/csc-scholarship" className="hover:text-white">{t("footer.exploreCsc")}</Link></li>
              <li><Link to="/site/why-china?read=intro" className="hover:text-white">{t("footer.exploreWhyChina")}</Link></li>
              <li><Link to="/site/news?view=all" className="hover:text-white">{t("footer.exploreNews")}</Link></li>
              <li><Link to="/site/share-your-experience" className="hover:text-white">{t("footer.shareExperience", { defaultValue: "Share your experience" })}</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">{t("footer.services")}</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/site/services#admission" className="hover:text-white">{t("footer.serviceAdmission")}</Link></li>
              <li><Link to="/site/services#visa" className="hover:text-white">{t("footer.serviceVisa")}</Link></li>
              <li><Link to="/site/services#scholarships" className="hover:text-white">{t("footer.serviceScholarships")}</Link></li>
              <li><Link to="/site/about?section=story" className="hover:text-white">{t("footer.serviceAbout")}</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">{t("footer.getInTouch")}</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a href={`tel:${CONTACT.phone}`} className="flex items-center gap-2 hover:text-white"><Phone className="size-4" /> {CONTACT.phoneDisplay}</a></li>
              <li><a href={`mailto:${CONTACT.emailGeneral}`} className="flex items-center gap-2 hover:text-white"><Mail className="size-4" /> {CONTACT.emailGeneral}</a></li>
              <li><a href={WHATSAPP} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white"><WhatsAppGlyph className="size-4" /> {t("footer.whatsappUs")}</a></li>
            </ul>
            <Link to="/site/contact" className="mt-4 inline-flex rounded-sm bg-cas-red px-4 py-2 text-sm font-semibold text-white hover:bg-cas-red-600">
              {t("footer.freeConsultation")}
            </Link>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-white/60 sm:flex-row sm:px-6">
            <p>{t("footer.rights", { year: new Date().getFullYear() })}</p>
            <p className="flex items-center gap-4">
              <Link to="/site/terms" className="hover:text-white">{t("footer.terms", { defaultValue: "Terms & Conditions" })}</Link>
              <Link to="/site/privacy" className="hover:text-white">{t("footer.privacy", { defaultValue: "Privacy Policy" })}</Link>
            </p>
            <p>{t("footer.authorized")}</p>
          </div>
        </div>
      </footer>

      {/* Persistent conversion chrome: HELP tab + bottom help bar + counsellor widget */}
      <SiteHelpDock />
      <SiteWhatsAppButton />
    </div>
  )
}
