import { useState } from "react"
import { Outlet } from "react-router-dom"

import Sidebar from "@/components/layout/Sidebar"
import Topbar from "@/components/layout/Topbar"

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="lg:pl-60">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
