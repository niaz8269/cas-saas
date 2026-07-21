import { ChevronDown, Menu } from "lucide-react"
import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { cn } from "@/lib/utils"

type Col = { title: string; checkAll: { label: string; to: string }; links: [string, string][] }

// Tag every browse-menu link with its source so it's a distinct URL from the
// equivalent nav/body link (and it doubles as a click-source signal).
const src = (to: string) => `${to}${to.includes("?") ? "&" : "?"}src=menu`

// Display titles/labels are i18n keys resolved at render (report — 5-language
// support); the URLs stay literal.
const COLUMNS: Col[] = [
  {
    title: "megaMenu.colDestinations",
    checkAll: { label: "megaMenu.allDestinations", to: "/site/cities" },
    links: [
      ["megaMenu.studyBeijing", "/site/universities?city=Beijing"],
      ["megaMenu.studyShanghai", "/site/universities?city=Shanghai"],
      ["megaMenu.studyWuhan", "/site/universities?city=Wuhan"],
      ["megaMenu.studyNanjing", "/site/universities?city=Nanjing"],
      ["megaMenu.studyHangzhou", "/site/universities?city=Hangzhou"],
      ["megaMenu.studyDalian", "/site/universities?city=Dalian"],
    ],
  },
  {
    title: "megaMenu.colUniversities",
    checkAll: { label: "megaMenu.allUniversities", to: "/site/universities" },
    links: [
      ["megaMenu.moeListed", "/site/universities?moe=1"],
      ["megaMenu.medical", "/site/universities?q=Medical"],
      ["megaMenu.engineering", "/site/universities?q=Engineering"],
      ["megaMenu.technology", "/site/universities?q=Technology"],
      ["megaMenu.normal", "/site/universities?q=Normal"],
    ],
  },
  {
    title: "megaMenu.colPrograms",
    checkAll: { label: "megaMenu.allPrograms", to: "/site/programs" },
    links: [
      ["megaMenu.programMbbs", "/site/programs?q=MBBS"],
      ["megaMenu.programEngineering", "/site/programs?q=Engineering"],
      ["megaMenu.programBusiness", "/site/programs?q=Business"],
      ["megaMenu.programBachelor", "/site/programs?level=bachelor"],
      ["megaMenu.programMaster", "/site/programs?level=master"],
      ["megaMenu.programPhd", "/site/programs?level=phd"],
    ],
  },
  {
    title: "megaMenu.colScholarships",
    checkAll: { label: "megaMenu.allScholarships", to: "/site/scholarships" },
    links: [
      ["megaMenu.scholarshipFull", "/site/scholarships?q=full"],
      ["megaMenu.scholarshipPartial", "/site/scholarships?q=partial"],
      ["megaMenu.scholarshipUniversity", "/site/scholarships?q=university"],
      ["megaMenu.scholarshipGovernment", "/site/scholarships?q=CSC"],
      ["megaMenu.scholarshipProvincial", "/site/scholarships?q=provincial"],
    ],
  },
  {
    title: "megaMenu.colAbout",
    checkAll: { label: "megaMenu.contactUs", to: "/site/contact" },
    links: [
      ["megaMenu.aboutCas", "/site/about"],
      ["megaMenu.ourServices", "/site/services"],
      ["megaMenu.whyChina", "/site/why-china"],
      ["megaMenu.faq", "/site/faq"],
      ["megaMenu.news", "/site/news"],
      ["megaMenu.freeStudyPlan", "/site/study-plan"],
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
  const { t } = useTranslation()
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
        aria-label={t("megaMenu.browseEverything")}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false) }}
        className={cn(
          "inline-flex items-center gap-1 rounded-sm px-1.5 py-1.5 transition-colors",
          open ? "text-cas-red" : "text-cas-navy hover:text-cas-red",
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
        <div className="border-t-2 border-cas-red bg-card shadow-sm">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-8 gap-y-8 px-4 py-8 sm:grid-cols-3 sm:px-6 lg:grid-cols-5">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="text-xs font-bold tracking-wider text-cas-red-600 uppercase">{t(col.title)}</p>
                <ul className="mt-3.5 space-y-2.5">
                  {col.links.map(([labelKey, to]) => (
                    <li key={labelKey}>
                      <Link
                        to={src(to)}
                        onClick={() => setOpen(false)}
                        className="text-sm text-muted-foreground transition-colors hover:text-cas-navy"
                      >
                        {t(labelKey)}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  to={src(col.checkAll.to)}
                  onClick={() => setOpen(false)}
                  className="mt-3.5 inline-block text-xs font-semibold text-cas-navy hover:underline"
                >
                  {t(col.checkAll.label)} »
                </Link>
              </div>
            ))}
          </div>
          <div className="border-t bg-subtle">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 text-sm sm:px-6">
              <span className="text-muted-foreground">{t("megaMenu.notSure")}</span>
              <Link to="/site/contact?from=menu" onClick={() => setOpen(false)} className="font-semibold text-cas-navy hover:underline">
                {t("megaMenu.freeConsultation")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
