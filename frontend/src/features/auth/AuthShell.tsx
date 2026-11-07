import { BarChart3, Building2, ScrollText, Settings2, Eye, EyeOff, FileCheck2, GraduationCap, Handshake, Plane, ShieldCheck, Sparkles, Users, Wallet } from "lucide-react"
import { forwardRef, useState, type ComponentProps, type ReactNode } from "react"
import { useTranslation } from "react-i18next"

import casLogo from "@/assets/cas-logo.png"
import casLogoWhite from "@/assets/cas-logo-white.png"
import { Input } from "@/components/ui/input"
import { langDef } from "@/i18n/languages"
import { cn } from "@/lib/utils"

const PANEL_PHOTO = "/images/hero-beijing-800-v2.webp"

/**
 * Shared frame for every sign-in / register screen: a calm navy brand panel on
 * large screens and a clean centred card everywhere. Only the form changes.
 */
export type AuthAudience = "staff" | "admin" | "student" | "agent"

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  wide = false,
  audience = "student",
}: {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  /** Roomier card for the longer register forms. */
  wide?: boolean
  /** Decides what the brand panel says: staff, students and partner agents hear different things. */
  audience?: AuthAudience
}) {
  const { t, i18n } = useTranslation()

  const copy = {
    student: {
      headline: t("authShell.student.headline", { defaultValue: "Your path to studying in China starts here." }),
      points: [
        { icon: GraduationCap, text: t("authShell.student.p1", { defaultValue: "Hundreds of Chinese universities and programs in one place" }) },
        { icon: Sparkles, text: t("authShell.student.p2", { defaultValue: "Track your application from offer to arrival" }) },
        { icon: ShieldCheck, text: t("authShell.student.p3", { defaultValue: "Your documents stay private and secure" }) },
      ],
    },
    agent: {
      headline: t("authShell.agent.headline", { defaultValue: "Grow your agency with a trusted China partner." }),
      points: [
        { icon: Users, text: t("authShell.agent.p1", { defaultValue: "Submit and follow every student you refer" }) },
        { icon: Wallet, text: t("authShell.agent.p2", { defaultValue: "Clear commission statements, always up to date" }) },
        { icon: Handshake, text: t("authShell.agent.p3", { defaultValue: "A dedicated CAS team behind each application" }) },
      ],
    },
    admin: {
      headline: t("authShell.admin.headline", { defaultValue: "Full control of the CAS platform." }),
      points: [
        { icon: Settings2, text: t("authShell.admin.p1", { defaultValue: "Manage users, roles and access for every team" }) },
        { icon: Building2, text: t("authShell.admin.p2", { defaultValue: "Maintain universities, programs, fees and content" }) },
        { icon: ScrollText, text: t("authShell.admin.p3", { defaultValue: "Audit trail and reports across the whole business" }) },
      ],
    },
    staff: {
      headline: t("authShell.staff.headline", { defaultValue: "One workspace for the whole CAS team." }),
      points: [
        { icon: FileCheck2, text: t("authShell.staff.p1", { defaultValue: "Leads, applications and documents in one place" }) },
        { icon: Plane, text: t("authShell.staff.p2", { defaultValue: "Offers, visas and arrivals, step by step" }) },
        { icon: BarChart3, text: t("authShell.staff.p3", { defaultValue: "Invoices, payments and commissions at a glance" }) },
      ],
    },
  }[audience]
  const { headline, points } = copy

  return (
    <div dir={langDef(i18n.language).dir} className="grid min-h-dvh overflow-x-hidden bg-subtle lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Brand panel — desktop only */}
      <aside className="relative hidden overflow-hidden bg-cas-navy-700 text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <img src={PANEL_PHOTO} alt="" aria-hidden="true" className="absolute inset-0 size-full object-cover opacity-25" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-cas-navy-700/90 via-cas-navy-700/80 to-cas-navy/95" />

        <a href="/" className="relative inline-block w-fit focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none">
          <img src={casLogoWhite} alt="CAS — Consultancy for Abroad Study" className="h-12 w-auto" />
        </a>

        <div className="relative max-w-md">
          <h2 className="text-3xl leading-tight font-semibold tracking-tight">
            {headline}
          </h2>
          <ul className="mt-8 space-y-4">
            {points.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-white/85">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="pt-1">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/60">© {new Date().getFullYear()} CAS — Consultancy for Abroad Study</p>
      </aside>

      {/* Form side */}
      <main className="flex flex-col items-center justify-center px-5 py-4 sm:px-8">
        <div className={cn("w-full", wide ? "max-w-xl" : "max-w-sm")}>
          <a href="/" className="mb-4 block lg:hidden">
            <img src={casLogo} alt="CAS — Consultancy for Abroad Study" className="mx-auto h-11 w-auto" />
          </a>

          <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
            <h1 className="text-xl font-semibold tracking-tight text-cas-navy">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
            <div className="mt-4">{children}</div>
          </div>

          {footer && <div className="mt-3 text-center text-sm text-muted-foreground">{footer}</div>}

          <p className="mt-4 text-center text-xs text-muted-foreground lg:hidden">
            © {new Date().getFullYear()} CAS — Consultancy for Abroad Study
          </p>
        </div>
      </main>
    </div>
  )
}

/** Password input with a show/hide control. Same props as Input. */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<ComponentProps<typeof Input>, "type">>(
  function PasswordInput({ className, ...props }, ref) {
    const { t } = useTranslation()
    const [visible, setVisible] = useState(false)
    const label = visible
      ? t("authShell.hidePassword", { defaultValue: "Hide password" })
      : t("authShell.showPassword", { defaultValue: "Show password" })

    return (
      <div className="relative">
        <Input ref={ref} type={visible ? "text" : "password"} className={cn("pe-11", className)} {...props} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={label}
          aria-pressed={visible}
          className="absolute inset-y-0 end-0 flex w-11 items-center justify-center rounded-e-md text-muted-foreground transition-colors hover:text-cas-navy focus-visible:ring-2 focus-visible:ring-cas-navy/40 focus-visible:outline-none"
        >
          {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
        </button>
      </div>
    )
  },
)
