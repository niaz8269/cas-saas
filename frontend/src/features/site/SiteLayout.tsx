import { Bell, Facebook, Instagram, Linkedin, LogIn, Mail, Menu, MessageCircle, Phone, X, Youtube } from "lucide-react"
import { useRef, useState } from "react"
import { Link, NavLink, Outlet } from "react-router-dom"

import casLogoWhite from "@/assets/cas-logo-white.png"
import ScrollToTop from "@/features/site/ScrollToTop"
import SiteHelpDock from "@/features/site/SiteHelpDock"
import SiteMegaMenu from "@/features/site/SiteMegaMenu"
import { cn } from "@/lib/utils"

type NavItemT = { to: string; label: string; dropdown?: [string, string][] }

// Primary top-nav — mirrors the reference header, adapted to CAS's services.
// "Why CAS" carries a stats dropdown, like the reference's "WHY CUCAS".
const NAV_PRIMARY: NavItemT[] = [
  {
    to: "/site/about",
    label: "Why CAS",
    dropdown: [
      ["200+ Universities", "/site/universities"],
      ["5,000+ Programs", "/site/programs"],
      ["500+ Scholarships", "/site/scholarships"],
      ["50+ Cities", "/site/cities"],
      ["Local Services", "/site/services"],
      ["How it Works", "/site/about"],
      ["Learning Center", "/site/news"],
    ],
  },
  { to: "/site/why-china", label: "Study in China" },
  { to: "/site/universities", label: "Universities" },
  { to: "/site/programs", label: "Programs" },
  { to: "/site/pricing", label: "Pricing" },
  { to: "/site/partner", label: "Partner" },
]

// Fuller list for the mobile drawer.
const NAV = [
  ...NAV_PRIMARY.map(({ to, label }) => ({ to, label })),
  { to: "/site/scholarships", label: "Scholarships" },
  { to: "/site/study-plan", label: "Free study plan" },
  { to: "/site/news", label: "News" },
]

const WHATSAPP = "https://wa.me/8618041566030"
const UK_FLAG = "https://flagcdn.com/40x30/gb.png"

/** A desktop nav link that reveals a single-column dropdown on hover, like the
 *  reference's "WHY CUCAS" menu (dashed separators + a caret pointer). */
function NavItem({ item }: { item: NavItemT }) {
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const show = () => { if (timer.current) clearTimeout(timer.current); setOpen(true) }
  const hide = () => { timer.current = setTimeout(() => setOpen(false), 120) }

  const link = (
    <NavLink
      to={item.to}
      className={({ isActive }) => cn(
        "inline-flex items-center py-1 text-[13px] font-semibold tracking-wide uppercase transition-colors",
        isActive ? "text-cas-red" : "text-white/85 hover:text-white",
      )}
    >
      {item.label}
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
            {item.dropdown.map(([label, to], i) => (
              <li key={label} className={cn("mx-4", i < item.dropdown!.length - 1 && "border-b border-dashed border-gray-200")}>
                <Link to={to} onClick={() => setOpen(false)} className="block py-2.5 text-sm text-gray-600 transition-colors hover:text-cas-red-600">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default function SiteLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="site-root flex min-h-dvh flex-col bg-subtle lg:pb-14">
      <ScrollToTop />

      {/* Header */}
      <header className="sticky top-0 z-30">
        {/* Top promo bar */}
        <div className="bg-[#4b4869] text-white">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-6 px-4 py-1.5 text-[13px] sm:px-6 lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline">Browse Free-to-Apply Universities on CAS</span>
              <Link to="/site/universities" className="rounded-sm bg-[#726f9f] px-2.5 py-0.5 text-xs transition-colors hover:bg-[#817eab]">Learn More</Link>
            </div>
            <div className="hidden items-center gap-3 md:flex">
              <span>Fully-funded scholarships for 2026 — apply early</span>
              <Link to="/site/scholarships" className="rounded-sm bg-[#726f9f] px-2.5 py-0.5 text-xs transition-colors hover:bg-[#817eab]">Learn More</Link>
            </div>
          </div>
        </div>

        {/* Main nav */}
        <div className="relative bg-[#2f2c4c] text-white shadow-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link to="/site" className="flex shrink-0 items-center" onClick={() => setMenuOpen(false)}>
              <img src={casLogoWhite} alt="CAS — Consultancy for Abroad Study" className="h-9 w-auto sm:h-10" />
            </Link>

            <nav className="hidden items-center gap-6 lg:flex">
              {NAV_PRIMARY.map((item) => <NavItem key={item.to} item={item} />)}
              <SiteMegaMenu />
            </nav>

            <div className="flex items-center gap-3">
              <img src={UK_FLAG} alt="English" width={26} height={20} className="hidden rounded-[2px] shadow-sm sm:block" />
              <Link to="/login" className="inline-flex items-center gap-1.5 rounded-sm bg-cas-red px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-cas-red-600">
                <LogIn className="size-4" /> SIGN IN
              </Link>
              <Link to="/site/news" aria-label="Updates" className="relative hidden text-white/85 transition-colors hover:text-white sm:inline-flex">
                <Bell className="size-5" />
                <span className="absolute -top-1.5 -right-1.5 flex min-w-4 items-center justify-center rounded-full bg-cas-red px-1 text-[10px] font-bold text-white">6</span>
              </Link>
              <button
                type="button"
                className="inline-flex size-9 items-center justify-center rounded-sm text-white/85 hover:bg-white/10 lg:hidden"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
              >
                {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            </div>
          </div>

          {menuOpen && (
            <nav className="border-t border-white/10 bg-[#2f2c4c] px-4 py-2 lg:hidden">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) => cn(
                    "block rounded-sm px-3 py-2.5 text-sm font-medium",
                    isActive ? "bg-white/10 text-cas-red" : "text-white/85 hover:bg-white/10",
                  )}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t bg-cas-navy text-white/80">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <img src={casLogoWhite} alt="CAS" className="h-10 w-auto" />
            <p className="mt-3 max-w-sm text-sm">
              CAS — Consultancy for Abroad Study — has guided students to world-class Chinese universities since 2012,
              as an official authorized agent for Ministry of Education–listed institutions.
            </p>
            <div className="mt-4 flex gap-3">
              {[
                { icon: Facebook, label: "Facebook" },
                { icon: Instagram, label: "Instagram" },
                { icon: Youtube, label: "YouTube" },
                { icon: Linkedin, label: "LinkedIn" },
              ].map(({ icon: Icon, label }) => (
                <a key={label} href="https://www.cas.moe" target="_blank" rel="noreferrer" aria-label={label}
                  className="inline-flex size-9 items-center justify-center rounded-full bg-white/10 hover:bg-cas-red hover:text-white">
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">Explore</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/site/universities" className="hover:text-white">Universities</Link></li>
              <li><Link to="/site/programs" className="hover:text-white">Programs</Link></li>
              <li><Link to="/site/scholarships" className="hover:text-white">Scholarships</Link></li>
              <li><Link to="/site/why-china" className="hover:text-white">Why China</Link></li>
              <li><Link to="/site/news" className="hover:text-white">News & updates</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">Services</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/site/services" className="hover:text-white">Admission service</Link></li>
              <li><Link to="/site/services" className="hover:text-white">Visa assistance</Link></li>
              <li><Link to="/site/services" className="hover:text-white">Scholarship assistance</Link></li>
              <li><Link to="/site/about" className="hover:text-white">About CAS</Link></li>
              <li><Link to="/login" className="hover:text-white">Staff login</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">Get in touch</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a href="tel:+8618041566030" className="flex items-center gap-2 hover:text-white"><Phone className="size-4" /> +86 180 4156 6030</a></li>
              <li><a href="mailto:info@cas.moe" className="flex items-center gap-2 hover:text-white"><Mail className="size-4" /> info@cas.moe</a></li>
              <li><a href={WHATSAPP} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white"><MessageCircle className="size-4" /> WhatsApp us</a></li>
            </ul>
            <Link to="/site/contact" className="mt-4 inline-flex rounded-sm bg-cas-red px-4 py-2 text-sm font-semibold text-white hover:bg-cas-red-600">
              Free consultation
            </Link>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-white/60 sm:flex-row sm:px-6">
            <p>© {new Date().getFullYear()} CAS Education. All rights reserved.</p>
            <p>Official authorized agent since 2012.</p>
          </div>
        </div>
      </footer>

      {/* Persistent conversion chrome: HELP tab + bottom help bar + counsellor widget */}
      <SiteHelpDock />
    </div>
  )
}
