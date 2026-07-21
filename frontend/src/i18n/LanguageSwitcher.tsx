import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { LANGUAGES, langDef, type LangDef } from "@/i18n/languages"
import { cn } from "@/lib/utils"

/** A flag: a flagcdn image, or the generic green ض mark for Arabic. */
function Flag({ lang, className }: { lang: LangDef; className?: string }) {
  if (!lang.flag) {
    return (
      <span className={cn("flex items-center justify-center bg-[#0a7d3e] leading-none font-semibold text-white", className)} aria-hidden="true">
        ض
      </span>
    )
  }

  return (
    <img
      src={`https://flagcdn.com/40x30/${lang.flag}.png`}
      srcSet={`https://flagcdn.com/80x60/${lang.flag}.png 2x`}
      alt=""
      aria-hidden="true"
      className={cn("h-full w-full object-cover", className)}
    />
  )
}

/**
 * The public/portal language switcher: the current flag opens a stacked list of
 * the other four (report — matches the reference switcher). Choosing one calls
 * i18next.changeLanguage, which persists to localStorage and flips direction.
 */
export default function LanguageSwitcher({ className }: { className?: string }) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = langDef(i18n.language)
  const others = LANGUAGES.filter((l) => l.code !== current.code)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)

    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  const choose = (code: string) => {
    void i18n.changeLanguage(code)
    setOpen(false)
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("language.select")}
        title={current.label}
        className="flex h-5 w-[28px] overflow-hidden rounded-[2px] shadow-sm ring-1 ring-black/10 transition hover:ring-cas-red"
      >
        <Flag lang={current} className="text-[13px]" />
      </button>

      {open && (
        <div className="absolute end-0 top-full z-50 mt-2 w-16 rounded-md bg-white p-2 shadow-xl ring-1 ring-black/10">
          <span className="absolute -top-1.5 end-4 size-3 rotate-45 rounded-[1px] bg-white" />
          <ul role="listbox" aria-label={t("language.select")} className="relative space-y-2">
            {others.map((l) => (
              <li key={l.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => choose(l.code)}
                  title={l.native}
                  className="flex h-8 w-full items-center justify-center overflow-hidden rounded-[3px] shadow ring-1 ring-black/10 transition hover:ring-2 hover:ring-cas-red"
                >
                  <Flag lang={l} className="text-lg" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
