import { ChevronDown, LayoutGrid } from "lucide-react"
import { useRef, useState } from "react"
import { Link } from "react-router-dom"

import { cn } from "@/lib/utils"

type Col = { title: string; checkAll: { label: string; to: string }; links: [string, string][] }

const COLUMNS: Col[] = [
  {
    title: "Destinations",
    checkAll: { label: "All destinations", to: "/site/universities" },
    links: [
      ["Study in Beijing", "/site/universities?q=Beijing"],
      ["Study in Shanghai", "/site/universities?q=Shanghai"],
      ["Study in Wuhan", "/site/universities?q=Wuhan"],
      ["Study in Nanjing", "/site/universities?q=Nanjing"],
      ["Study in Guangzhou", "/site/universities?q=Guangzhou"],
      ["Study in Chongqing", "/site/universities?q=Chongqing"],
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
      ["News & updates", "/site/news"],
      ["Free consultation", "/site/contact"],
    ],
  },
]

/** CUCAS-style hover mega-menu: a full multi-column dropdown that animates in. */
export default function SiteMegaMenu() {
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = () => { if (timer.current) clearTimeout(timer.current); setOpen(true) }
  const hide = () => { timer.current = setTimeout(() => setOpen(false), 120) }

  return (
    <div className="relative" onMouseEnter={show} onMouseLeave={hide}>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false) }}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
          open ? "text-cas-navy" : "text-muted-foreground hover:text-cas-navy",
        )}
      >
        <LayoutGrid className="size-4" /> Explore
        <ChevronDown className={cn("size-4 transition-transform duration-200", open && "rotate-180")} />
      </button>

      <div
        className={cn(
          "absolute top-full left-1/2 z-40 mt-3 w-[min(94vw,58rem)] origin-top -translate-x-1/2 overflow-hidden rounded-2xl border bg-card shadow-2xl transition-all duration-200",
          open ? "visible scale-100 opacity-100" : "pointer-events-none invisible scale-95 opacity-0",
        )}
      >
        <div className="h-1 bg-cas-gold" />
        <div className="grid grid-cols-2 gap-x-8 gap-y-8 p-7 sm:grid-cols-3 lg:grid-cols-5">
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
        <div className="flex items-center justify-between gap-3 border-t bg-subtle px-7 py-3 text-sm">
          <span className="text-muted-foreground">Not sure where to start?</span>
          <Link to="/site/contact" onClick={() => setOpen(false)} className="font-semibold text-cas-navy hover:underline">
            Get a free consultation »
          </Link>
        </div>
      </div>
    </div>
  )
}
