import { Facebook, Instagram, Linkedin, LogIn, Mail, Megaphone, Menu, MessageCircle, Phone, Send, X, Youtube } from "lucide-react"
import { useState } from "react"
import { Link, NavLink, Outlet } from "react-router-dom"

import casLogo from "@/assets/cas-logo.png"
import ScrollToTop from "@/features/site/ScrollToTop"
import SiteHelpDock from "@/features/site/SiteHelpDock"
import SiteMegaMenu from "@/features/site/SiteMegaMenu"
import { cn } from "@/lib/utils"

// Primary top-nav — mirrors the reference header, adapted to CAS's services
// (their "Why CUCAS / China CSCA / Pricing / Partner" → CAS equivalents).
const NAV_PRIMARY: { to: string; label: string }[] = [
  { to: "/site/about", label: "Why CAS" },
  { to: "/site/why-china", label: "Study in China" },
  { to: "/site/universities", label: "Universities" },
  { to: "/site/programs", label: "Programs" },
  { to: "/site/services", label: "Pricing" },
  { to: "/site/contact", label: "Partner" },
]

// Fuller list for the mobile drawer.
const NAV = [
  ...NAV_PRIMARY,
  { to: "/site/scholarships", label: "Scholarships" },
  { to: "/site/study-plan", label: "Free study plan" },
  { to: "/site/news", label: "News" },
]

const WHATSAPP = "https://wa.me/8618041566030"

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    "text-sm font-medium transition-colors",
    isActive ? "text-cas-navy" : "text-muted-foreground hover:text-cas-navy",
  )
}

export default function SiteLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [bannerOpen, setBannerOpen] = useState(true)

  return (
    <div className="flex min-h-dvh flex-col bg-subtle lg:pb-11">
      <ScrollToTop />
      {/* Announcement bar */}
      {bannerOpen && (
        <div className="bg-cas-gold text-cas-navy">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 text-sm sm:px-6">
            <Megaphone className="hidden size-4 shrink-0 sm:block" />
            <p className="flex-1 text-center font-medium sm:text-left">
              March 2026 intake applications now open! Deadline: 28 February 2026.{" "}
              <Link to="/site/contact" className="underline underline-offset-2 hover:opacity-80">Apply now →</Link>
            </p>
            <button type="button" aria-label="Dismiss announcement" onClick={() => setBannerOpen(false)} className="shrink-0 rounded p-1 hover:bg-cas-navy/10">
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/site" className="flex shrink-0 items-center gap-2" onClick={() => setMenuOpen(false)}>
            <img src={casLogo} alt="CAS — Consultancy for Abroad Study" className="h-9 w-auto" />
          </Link>

          <nav className="hidden items-center gap-5 lg:flex">
            {NAV_PRIMARY.map((item) => (
              <NavLink key={item.to} to={item.to} className={navClass}>{item.label}</NavLink>
            ))}
            <SiteMegaMenu />
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-cas-navy sm:inline-flex">
              <LogIn className="size-4" /> Login
            </Link>
            <Link to="/site/contact" className="inline-flex items-center gap-1.5 rounded-md bg-cas-gold px-4 py-2 text-sm font-semibold text-cas-navy hover:bg-cas-gold-600">
              <Send className="size-4" /> Apply Now
            </Link>
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="border-t bg-card px-4 py-2 lg:hidden">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => cn(
                  "block rounded-md px-3 py-2.5 text-sm font-medium",
                  isActive ? "bg-cas-navy-50 text-cas-navy" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {item.label}
              </NavLink>
            ))}
            <Link to="/login" onClick={() => setMenuOpen(false)} className="block rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted sm:hidden">
              Staff login
            </Link>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t bg-cas-navy text-white/80">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <img src={casLogo} alt="CAS" className="h-10 w-auto brightness-0 invert" />
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
                  className="inline-flex size-9 items-center justify-center rounded-full bg-white/10 hover:bg-cas-gold hover:text-cas-navy">
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
            <Link to="/site/contact" className="mt-4 inline-flex rounded-md bg-cas-gold px-4 py-2 text-sm font-semibold text-cas-navy hover:bg-cas-gold-600">
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

      {/* Persistent conversion chrome: counsellor widget + help bar + back-to-top */}
      <SiteHelpDock />
    </div>
  )
}
