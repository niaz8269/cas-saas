import {
  ArrowRight,
  Award,
  BookOpen,
  Check,
  Clock,
  Globe,
  GraduationCap,
  Handshake,
  Headphones,
  HeartHandshake,
  PlaneLanding,
  ShieldCheck,
  Stamp,
  Stethoscope,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { SitePageHeader, SiteSection } from "@/features/site/components"
import { useSeo } from "@/lib/seo"

// Display text lives in i18n keys resolved via t() at render (report — 5-language support).
const WHY: { icon: LucideIcon; titleKey: string; bodyKey: string }[] = [
  { icon: ShieldCheck, titleKey: "services.why.authorizedAgent.title", bodyKey: "services.why.authorizedAgent.body" },
  { icon: Wallet, titleKey: "services.why.freeToStart.title", bodyKey: "services.why.freeToStart.body" },
  { icon: HeartHandshake, titleKey: "services.why.dedicatedAdvisor.title", bodyKey: "services.why.dedicatedAdvisor.body" },
  { icon: Clock, titleKey: "services.why.fastApplications.title", bodyKey: "services.why.fastApplications.body" },
  { icon: Award, titleKey: "services.why.admissionRecord.title", bodyKey: "services.why.admissionRecord.body" },
  { icon: Globe, titleKey: "services.why.supportAfterArrival.title", bodyKey: "services.why.supportAfterArrival.body" },
]

interface Service {
  /** Anchor, so footer links like /site/services#visa land on the right card. */
  id?: string
  icon: LucideIcon
  /** Existing i18n keys for the title and summary. */
  titleKey?: string
  bodyKey?: string
  /** For the services added later: plain English with a default. */
  title?: string
  body?: string
  /** What is included. */
  points: string[]
  link?: { to: string; label: string }
}

const SERVICES: Service[] = [
  {
    id: "admission", icon: GraduationCap, titleKey: "services.items.admission.title", bodyKey: "services.items.admission.body",
    points: ["Shortlist universities and programs that fit your goals and budget", "Document checklist and review before anything is submitted", "Application filing and status tracking in your CAS portal", "Follow-up with the university until the offer arrives"],
  },
  {
    id: "scholarships", icon: Wallet, titleKey: "services.items.scholarship.title", bodyKey: "services.items.scholarship.body",
    points: ["Government, provincial and university scholarships", "Eligibility check before you apply", "Application preparation and deadline tracking"],
    link: { to: "/site/scholarships", label: "Browse scholarships" },
  },
  {
    icon: Stethoscope, title: "MBBS and medical programs", body: "Medicine is the most regulated path into China, so we guide it closely and only toward universities that are allowed to enrol you.",
    points: ["English-taught MBBS at Ministry of Education–listed universities", "Program, fee and entry-requirement comparison", "Admission and visa handled together"],
    link: { to: "/site/mbbs-in-china", label: "MBBS in China" },
  },
  {
    id: "visa", icon: Stamp, titleKey: "services.items.visa.title", bodyKey: "services.items.visa.body",
    points: ["Admission letter and JW202 guidance", "Student visa document checklist, step by step", "Medical examination and form guidance", "Support until your visa is issued"],
  },
  {
    icon: PlaneLanding, titleKey: "services.items.airportPickup.title", bodyKey: "services.items.airportPickup.body",
    points: ["Pickup when you land", "Safe transfer to your campus", "Help with your first-day check-in"],
  },
  {
    icon: Headphones, titleKey: "services.items.onCampus.title", bodyKey: "services.items.onCampus.body",
    points: ["Registration and orientation help", "Accommodation guidance", "Bank, SIM and everyday set-up", "A contact for questions throughout your studies"],
  },
  {
    icon: BookOpen, titleKey: "services.items.language.title", bodyKey: "services.items.language.body",
    points: ["HSK and Chinese-language course guidance", "Foundation-year and preparatory options", "Help choosing the right level"],
  },
  {
    icon: Handshake, title: "Partner program for agents", body: "Recruit for China with a dedicated team behind every case you refer.",
    points: ["Refer students through a secure partner portal", "Track every application and commission", "Clear statements and fast replies"],
    link: { to: "/site/partner", label: "Become a partner" },
  },
]

const STEPS: { title: string; body: string }[] = [
  { title: "Free consultation", body: "Tell us your goals, budget and study level. We map out your options at no cost." },
  { title: "Choose your program", body: "We shortlist universities and programs, compare fees and requirements with you." },
  { title: "We apply for you", body: "We prepare your documents, submit the application and follow it up." },
  { title: "Offer and visa", body: "Receive your admission letter, then we guide you through the visa step by step." },
  { title: "Arrive and settle", body: "We meet you on arrival and stay available while you settle in." },
]

export default function SiteServices() {
  const { t } = useTranslation()

  useSeo({
    title: t("services.seoTitle"),
    description: t("services.seoDescription"),
    canonicalPath: "/site/services",
  })

  return (
    <div className="space-y-14">
      <SitePageHeader
        eyebrow={t("services.eyebrow")}
        title={t("services.title")}
        subtitle={t("services.subtitle")}
      />

      <SiteSection title={t("services.whatWeDoTitle")} subtitle={t("services.whatWeDoSubtitle")}>
        <div className="grid gap-5 sm:grid-cols-2">
          {SERVICES.map((s) => {
            const Icon = s.icon
            const title = s.titleKey ? t(s.titleKey) : (s.title as string)
            const body = s.bodyKey ? t(s.bodyKey) : (s.body as string)

            return (
              <article key={title} id={s.id} className="flex scroll-mt-24 flex-col rounded-lg border bg-card p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-lg bg-cas-navy-50 text-cas-navy"><Icon className="size-6" /></span>
                  <div>
                    <h3 className="text-lg font-semibold text-cas-navy">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
                  </div>
                </div>
                <ul className="mt-5 flex-1 space-y-2 border-t pt-5">
                  {s.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
                {s.link && (
                  <Link to={s.link.to} className="mt-5 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-cas-navy hover:underline">
                    {s.link.label} <ArrowRight className="size-4" />
                  </Link>
                )}
              </article>
            )
          })}
        </div>
      </SiteSection>

      <SiteSection title={t("services.howTitle", { defaultValue: "How it works" })} subtitle={t("services.howSubtitle", { defaultValue: "Five clear steps from your first question to your first day of class." })}>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative rounded-lg border bg-card p-5 shadow-sm">
              <span className="flex size-9 items-center justify-center rounded-full bg-cas-navy text-sm font-bold text-white">{i + 1}</span>
              <h3 className="mt-4 font-semibold text-cas-navy">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </SiteSection>

      <section className="flex flex-col items-start justify-between gap-4 rounded-lg border bg-cas-navy-50 p-6 sm:flex-row sm:items-center sm:p-8">
        <div className="flex items-start gap-4">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-white text-cas-navy shadow-sm"><Wallet className="size-5" /></span>
          <div>
            <h2 className="text-lg font-semibold text-cas-navy">{t("services.feesTitle", { defaultValue: "Clear fees, no surprises" })}</h2>
            <p className="mt-1 text-sm text-slate-600">{t("services.feesBody", { defaultValue: "The consultation and your study plan are free. Any paid service is quoted clearly before you commit, with no hidden charges." })}</p>
          </div>
        </div>
        <Link to="/site/pricing" className="inline-flex h-10 shrink-0 items-center gap-2 rounded-sm border bg-white px-5 text-sm font-semibold text-cas-navy hover:bg-muted">
          {t("services.feesLink", { defaultValue: "See how our fees work" })} <ArrowRight className="size-4" />
        </Link>
      </section>

      {/* Trust stats */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[["13+", t("services.stats.yearsExperience")], ["13K+", t("services.stats.studentsPlaced")], ["200+", t("services.stats.universityPartners")], ["98%", t("services.stats.visaSuccessRate")]].map(([v, l]) => (
          <div key={l} className="rounded-lg border bg-card p-5 text-center shadow-sm">
            <p className="text-3xl font-bold text-cas-navy tabular-nums">{v}</p>
            <p className="mt-1 text-xs text-muted-foreground">{l}</p>
          </div>
        ))}
      </section>

      <SiteSection title={t("services.whyChooseTitle")} subtitle={t("services.whyChooseSubtitle")}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WHY.map(({ icon: Icon, titleKey, bodyKey }) => (
            <div key={titleKey} className="rounded-lg border bg-card p-6 shadow-sm">
              <span className="inline-flex size-11 items-center justify-center rounded-lg bg-cas-red-50 text-cas-red-600"><Icon className="size-5" /></span>
              <h3 className="mt-4 font-semibold text-cas-navy">{t(titleKey)}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{t(bodyKey)}</p>
            </div>
          ))}
        </div>
      </SiteSection>

      <section className="flex flex-col items-start justify-between gap-4 rounded-lg bg-cas-navy p-8 text-white sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold">{t("services.ctaTitle")}</h2>
          <p className="mt-1 text-sm text-white/80">{t("services.ctaSubtitle")}</p>
        </div>
        <Link to="/site/contact" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-sm bg-cas-red px-6 text-sm font-semibold text-white hover:bg-cas-red-600">
          {t("services.ctaButton")} <ArrowRight className="size-4" />
        </Link>
      </section>
    </div>
  )
}
