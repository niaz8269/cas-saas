import { NavLink } from "react-router-dom"

import casLogo from "@/assets/cas-logo.png"
import { visibleNavGroups } from "@/lib/navigation"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/auth"

interface SidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const user = useAuthStore((state) => state.user)
  const groups = visibleNavGroups(user)

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r bg-background transition-transform duration-200 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Main navigation"
      >
        <div className="flex h-16 items-center border-b px-4">
          <img src={casLogo} alt="CAS — Consultancy for Abroad Study" className="h-9 w-auto" />
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {groups.map((group, index) => (
            <div key={group.label ?? index}>
              {group.label && (
                <p className="mb-1 px-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === "/"}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-cas-navy-50 text-cas-navy"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )
                      }
                    >
                      <item.icon className="size-4 shrink-0" aria-hidden="true" />
                      {item.title}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}
