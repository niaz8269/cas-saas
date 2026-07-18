import { Menu, X } from "lucide-react"
import { useState } from "react"
import { Link, NavLink, Outlet } from "react-router-dom"

import casLogo from "@/assets/cas-logo.png"
import { cn } from "@/lib/utils"

const NAV = [
  { to: "/site", label: "Home", end: true },
  { to: "/site/universities", label: "Universities" },
  { to: "/site/programs", label: "Programs" },
  { to: "/site/scholarships", label: "Scholarships" },
  { to: "/site/about", label: "About" },
  { to: "/site/contact", label: "Contact" },
]

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    "text-sm font-medium transition-colors",
    isActive ? "text-cas-navy" : "text-muted-foreground hover:text-foreground",
  )
}

export default function SiteLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex min-h-dvh flex-col bg-subtle">
      <header className="sticky top-0 z-20 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/site" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
            <img src={casLogo} alt="CAS — Consultancy for Abroad Study" className="h-9 w-auto" />
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>{item.label}</NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/site/contact" className="hidden rounded-md bg-cas-navy px-4 py-2 text-sm font-semibold text-white hover:bg-cas-navy-700 sm:inline-flex">
              Free consultation
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
                end={item.end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => cn(
                  "block rounded-md px-3 py-2.5 text-sm font-medium",
                  isActive ? "bg-cas-navy-50 text-cas-navy" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>

      <footer className="border-t bg-cas-navy text-white/80">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <img src={casLogo} alt="CAS" className="h-9 w-auto brightness-0 invert" />
            <p className="mt-3 max-w-xs text-sm">
              Consultancy for Abroad Study — placing students into Ministry of Education–listed universities across China.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">Explore</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/site/universities" className="hover:text-white">Universities</Link></li>
              <li><Link to="/site/programs" className="hover:text-white">Program finder</Link></li>
              <li><Link to="/site/scholarships" className="hover:text-white">Scholarships</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">Company</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/site/about" className="hover:text-white">About CAS</Link></li>
              <li><Link to="/site/contact" className="hover:text-white">Contact</Link></li>
              <li><Link to="/login" className="hover:text-white">Staff login</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">Get in touch</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a href="https://www.cas.moe" target="_blank" rel="noreferrer" className="hover:text-white">www.cas.moe</a></li>
              <li><Link to="/site/contact" className="hover:text-white">Request a free consultation</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-white/60 sm:px-6">
            © {new Date().getFullYear()} CAS Education. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
