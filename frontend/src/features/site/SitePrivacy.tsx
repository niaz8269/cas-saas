import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { SitePageHeader } from "@/features/site/components"
import { CONTACT } from "@/lib/contact"
import { useSeo } from "@/lib/seo"

const UPDATED = "10 November 2026"

/** How CAS collects, uses, shares and protects personal information. */
const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. Who we are",
    body: [
      "CAS — Consultancy for Abroad Study (“CAS”, “we”, “us”) runs cas.moe and helps students apply to universities in China. We decide how and why the personal information described here is used, so we are responsible for it. This policy should be read together with our Terms & Conditions.",
    ],
  },
  {
    title: "2. What we collect",
    body: [
      "Information you give us: your name, email, phone number, nationality, date of birth, address, education history, language results, the program you want, your passport details, and the documents you upload (such as passport, certificates, transcripts, photos, bank statements, medical forms and payment receipts). For partners: company name, contact person, website and address.",
      "Information we create while working on your case: application status, notes from our team, messages, invoices and payment records, offer letters and visa progress.",
      "Words you choose to share: if you send a testimonial from your account, we keep it and, only after you agreed and our team approved it, show it on the website with your first name (or company name) and what you wrote about your study or business. You can ask us to remove it at any time.",
      "Technical information: when you use the site our servers record basic technical data such as IP address, browser type and the pages requested, which we use to keep the site secure and working. If you use the contact or enquiry forms we also keep what you write.",
    ],
  },
  {
    title: "3. Why we use it",
    body: [
      "To create and run your account; to advise you and prepare, submit and follow your university, scholarship and visa applications; to produce invoices and confirm payments; to send you the notices and messages you need about your case; to keep our records and meet legal and accounting duties; to protect the site against abuse and fraud; and to improve our services.",
      "We rely on your agreement, on the need to provide the services you asked for, on our legitimate interest in running a safe and reliable service, and on legal obligations, depending on the purpose.",
    ],
  },
  {
    title: "4. Who we share it with",
    body: [
      "Only with those who need it to do their part: the universities and scholarship bodies you apply to; the Chinese embassy or consulate and other authorities involved in your visa; partner agents who referred you, so they can follow your progress; our staff, who see only what their role requires; and service providers who help us run the platform, such as hosting, email delivery and document storage.",
      "We do not sell your personal information and we do not use it for third-party advertising.",
    ],
  },
  {
    title: "5. Moving information across borders",
    body: [
      "Studying in China means your information has to reach universities and authorities there, and our team and partners work from different countries. By applying you understand that your information will be sent to the places your application requires, including China, where data protection rules may differ from those in your country. We share only what each recipient needs.",
    ],
  },
  {
    title: "6. How we protect it",
    body: [
      "Uploaded documents are stored privately and are not publicly reachable; they are opened only through time-limited links for people allowed to see them. Staff access is limited by role. Passwords are stored in scrambled form, reset links expire and work once, and sign-in attempts are rate limited. No system is perfectly secure, so please use a strong password and keep it to yourself.",
    ],
  },
  {
    title: "7. How long we keep it",
    body: [
      "We keep your information for as long as we need it to deliver the services, handle questions or disputes afterwards, and meet legal, tax and accounting requirements. After that we delete it or remove what identifies you. Some records, such as invoices, must be kept for longer.",
    ],
  },
  {
    title: "8. Cookies and similar storage",
    body: [
      "We do not use advertising or tracking cookies. Your browser stores a few small items needed for the site to work: your sign-in token while you are logged in and your language choice. You can clear them in your browser settings; you will then be signed out and the site will forget your language.",
    ],
  },
  {
    title: "9. Your choices and rights",
    body: [
      "You can ask us to show you the information we hold about you, correct it, delete it, limit how we use it, or send it to you in a usable form. You can withdraw an agreement you gave us, and you can object to certain uses. Some requests have limits: we may have to keep information that the law requires, or that we need to finish a case you have open, and withdrawing may mean we can no longer process an application.",
      "To use these rights, contact us using the details below. If you are unhappy with how we handled a request, you may also complain to the data protection authority in your country.",
    ],
  },
  {
    title: "10. Children",
    body: [
      "Many applicants are 17 or 18. If you are under 18, a parent or guardian should know about and agree to your application and to this policy. Do not create an account for someone else without their knowledge. If you believe a child has given us information without a guardian's agreement, contact us and we will deal with it.",
    ],
  },
  {
    title: "11. Changes",
    body: [
      "We may update this policy. The date at the top shows the latest version. If a change is important we will tell account holders, for example by email or when they next sign in.",
    ],
  },
]

export default function SitePrivacy() {
  const { t } = useTranslation()
  useSeo({
    title: t("privacy.seoTitle", { defaultValue: "Privacy Policy" }),
    description: t("privacy.seoDescription", { defaultValue: "How CAS collects, uses, shares and protects personal information." }),
    canonicalPath: "/site/privacy",
  })

  return (
    <div className="space-y-6">
      <SitePageHeader
        title={t("privacy.title", { defaultValue: "Privacy Policy" })}
        subtitle={t("privacy.subtitle", { defaultValue: "Last updated {{date}}", date: UPDATED })}
      />

      <div className="space-y-6 rounded-sm border bg-card p-6 shadow-sm sm:p-8">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="font-semibold text-cas-navy">{s.title}</h2>
            {s.body.map((p) => (
              <p key={p} className="mt-2 text-sm leading-relaxed text-muted-foreground">{p}</p>
            ))}
          </section>
        ))}

        <section>
          <h2 className="font-semibold text-cas-navy">12. Contact us</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            For any privacy question or request, write to{" "}
            <a href={`mailto:${CONTACT.emailGeneral}`} className="underline hover:text-cas-navy">{CONTACT.emailGeneral}</a>
            {" "}or use the <Link to="/site/contact" className="underline hover:text-cas-navy">contact page</Link>. Please tell us which account or email address your request is about so we can find your information.
          </p>
        </section>
      </div>
    </div>
  )
}
