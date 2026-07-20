import { ChevronDown, Menu } from "lucide-react"
import { useRef, useState } from "react"
import { Link } from "react-router-dom"

import { cn } from "@/lib/utils"

type Col = { title: string; checkAll: { label: string; to: string }; links: [string, string][] }

const COLUMNS: Col[] = [
  {
    title: "Destinations",
    checkAll: { label: "All destinations", to: "/site/cities" },
    links: [
      ["Study in Beijing", "/site/universities?city=Beijing"],
      ["Study in Shanghai", "/site/universities?city=Shanghai"],
      ["Study in Wuhan", "/site/universities?city=Wuhan"],
      ["Study in Nanjing", "/site/universities?city=Nanjing"],
      ["Study in Hangzhou", "/site/universities?city=Hangzhou"],
      ["Study in Dalian", "/site/universities?city=Dalian"],
    ],
  },
  {
    title: "Universities",
    checkAll: { label: "All universities", to: "/site/universities" },
    links: [
      ["MoE-listed universities", "/site/universities?moe=1"],
      ["Medical universities", "/site/universities?q=Medical"],
      ["Engineering universities", "/site/universities?q=Engineering"],
      ["Technology universities", "/site/universities?q=Technology"],
      ["Normal universities", "/site/universities?q=Normal"],
    ],
  },
  {
    title: "Programs",
    checkAll: { label: "All programs", to: "/site/programs" },
    links: [
      ["Study MBBS in China", "/site/programs?q=MBBS"],
      ["Engineering programs", "/site/programs?q=Engineering"],
      ["Business & MBA", "/site/programs?q=Business"],
      ["Bachelor degrees", "/site/programs?level=bachelor"],
      ["Master degrees", "/site/programs?level=master"],
      ["PhD / Doctoral", "/site/programs?level=phd"],
    ],
  },
  {
    title: "Scholarships",
    checkAll: { label: "All scholarships", to: "/site/scholarships" },
    links: [
      ["Full scholarships", "/site/scholarships?q=full"],
      ["Partial scholarships", "/site/scholarships?q=partial"],
      ["University scholarships", "/site/scholarships?q=university"],
      ["Government (CSC)", "/site/scholarships?q=CSC"],
      ["Provincial scholarships", "/site/scholarships?q=provincial"],
    ],
  },
  {
    title: "About",
    checkAll: { label: "Contact us", to: "/site/contact" },
    links: [
      ["About CAS", "/site/about"],
      ["Our services", "/site/services"],
      ["Why study in China", "/site/why-china"],
      ["FAQ", "/site/faq"],
      ["News & updates", "/site/news"],
      ["Get a free study plan", "/site/study-plan"],
    ],
  },
]

/**
 * CUCAS-style mega-menu: a hamburger (☰) trigger in the navbar that reveals a
 * full-width, 5-column dropdown on hover (click/keyboard-friendly too). The
 * panel is anchored to the sticky <header>, so it spans the full width like the
 * reference; hover intent is shared between the trigger and the panel.
 */
export default function SiteMegaMenu() {
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = () => { if (timer.current) clearTimeout(timer.current); setOpen(true) }
  const hide = () => { timer.current = setTimeout(() => setOpen(false), 140) }

  return (
    <>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Browse everything"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false) }}
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-2 py-1.5 transition-colors",
          open ? "text-cas-navy" : "text-muted-foreground hover:text-cas-navy",
        )}
      >
        <Menu className="size-5" />
        <ChevronDown className={cn("size-3.5 transition-transform duration-200", open && "rotate-180")} />
      </button>

      {/* Full-width panel, anchored to the sticky header via inset-x-0 + top-full. */}
      <div
        onMouseEnter={show}
        onMouseLeave={hide}
        className={cn(
          "absolute inset-x-0 top-full z-40 origin-top transition-all duration-200",
          open ? "visible translate-y-0 opacity-100" : "pointer-events-none invisible -translate-y-1 opacity-0",
        )}
      >
        <div className="border-t-2 border-cas-gold bg-card shadow-2xl">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-8 gap-y-8 px-4 py-8 sm:grid-cols-3 sm:px-6 lg:grid-cols-5">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="text-xs font-bold tracking-wider text-cas-gold-600 uppercase">{col.title}</p>
                <ul className="mt-3.5 space-y-2.5">
                  {col.links.map(([label, to]) => (
                    <li key={label}>
                      <Link
                        to={to}
                        onClick={() => setOpen(false)}
                        className="text-sm text-muted-foreground transition-colors hover:text-cas-navy"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  to={col.checkAll.to}
                  onClick={() => setOpen(false)}
                  className="mt-3.5 inline-block text-xs font-semibold text-cas-navy hover:underline"
                >
                  {col.checkAll.label} »
                </Link>
              </div>
            ))}
          </div>
          <div className="border-t bg-subtle">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 text-sm sm:px-6">
              <span className="text-muted-foreground">Not sure where to start?</span>
              <Link to="/site/contact" onClick={() => setOpen(false)} className="font-semibold text-cas-navy hover:underline">
                Get a free consultation »
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
