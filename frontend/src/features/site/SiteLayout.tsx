import { Link, Outlet } from "react-router-dom"

import casLogo from "@/assets/cas-logo.png"

export default function SiteLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-subtle">
      <header className="sticky top-0 z-10 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/site" className="flex items-center gap-2">
            <img src={casLogo} alt="CAS — Consultancy for Abroad Study" className="h-9 w-auto" />
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/site" className="font-medium text-muted-foreground hover:text-foreground">Universities</Link>
            <a href="https://www.cas.moe" target="_blank" rel="noreferrer" className="hidden text-muted-foreground hover:text-foreground sm:inline">About CAS</a>
            <Link to="/login" className="rounded-md bg-cas-navy px-3 py-1.5 font-medium text-white hover:bg-cas-navy-700">Staff login</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        <Outlet />
      </main>

      <footer className="border-t bg-card">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted-foreground sm:px-6">
          <p>CAS — Consultancy for Abroad Study · Placing students into universities in China.</p>
          <p className="mt-1 text-xs">© {new Date().getFullYear()} CAS Education. This is a demo of the public catalog.</p>
        </div>
      </footer>
    </div>
  )
}
