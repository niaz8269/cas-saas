import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { SitePageHeader } from "@/features/site/components"
import { CONTACT } from "@/lib/contact"
import { useSeo } from "@/lib/seo"

const UPDATED = "7 November 2026"

/** Plain-language terms for using the CAS website and services. */
const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. About these terms",
    body: [
      "These terms apply when you use the CAS website (cas.moe), create a student or partner account, or use the services of CAS — Consultancy for Abroad Study (“CAS”, “we”, “us”). By using the site or an account you agree to them. If you do not agree, please do not use the site.",
    ],
  },
  {
    title: "2. What we do",
    body: [
      "CAS is a consultancy. We help students choose universities and programs in China, prepare and submit applications, apply for scholarships, and prepare for the student visa. We act on your behalf in dealing with universities and, where relevant, with the Chinese embassy or consulate.",
      "CAS is not a university, a government body or an immigration authority. A university or authority makes every admission, scholarship and visa decision.",
    ],
  },
  {
    title: "3. No guarantees",
    body: [
      "We give honest advice and do our work with care, but we cannot guarantee admission, a scholarship, a visa, a place in a particular university or program, or the timing of any decision. Admission rules, quotas, fees and dates are set by the universities and authorities and can change without notice.",
    ],
  },
  {
    title: "4. Information on this website",
    body: [
      "University, program, fee, intake and scholarship information on the site is provided for reference and may change. Always confirm the details that matter to you with us or with the university before you pay or decide. Tuition and other figures are usually shown in Chinese yuan (CNY).",
    ],
  },
  {
    title: "5. Your responsibilities",
    body: [
      "You must give us information and documents that are true, complete and your own. Passports, certificates, transcripts, bank statements and similar documents must be genuine. If a document turns out to be false or misleading we may stop work on your case, and the university or authority may reject or cancel your application, admission or visa.",
      "Keep your account details and password to yourself, and tell us promptly if you think someone else has used your account. You are responsible for what happens under your account.",
      "You are also responsible for meeting the deadlines, health, age, language and other requirements of the university and the visa authority, and for following the laws of China while you study there.",
    ],
  },
  {
    title: "6. Fees and payment",
    body: [
      "Our fees, and any application, processing or other charges, are shown on your invoice or in the service agreement we give you before you commit. Payment is by bank transfer to one of the bank accounts printed on the invoice. Please pay only to the account shown on your CAS invoice and quote the invoice number. If you are unsure whether payment details are genuine, contact us first through the details below.",
      "Upload your transfer receipt in your account so we can match it. An invoice is marked paid only after we have confirmed the money has arrived.",
      "University tuition, accommodation and similar charges belong to the university and follow its own payment and refund rules, which are separate from our fees.",
    ],
  },
  {
    title: "7. Refunds and cancellation",
    body: [
      "Whether and how much of our fee is refundable depends on the work already done and on the terms stated on your invoice or in your service agreement. Amounts that CAS has already paid to, or that are held by, a university, embassy, courier or other third party are refunded only if, and to the extent that, that third party refunds them to us.",
      "If you want to cancel or withdraw, tell us in writing as soon as you can.",
    ],
  },
  {
    title: "8. Universities, partners and agents",
    body: [
      "We work with universities and partner organisations. We may share the information needed for your application with them, and their own terms and fees apply to the services they provide.",
      "Agents and partners who register with CAS work under the partner agreement they sign with us. Registering does not make anyone a CAS employee or give them authority to act for CAS beyond that agreement.",
    ],
  },
  {
    title: "9. Your personal information",
    body: [
      "We collect the information you give us (such as your name, contact details, education, passport and documents) and information about how your application progresses. We use it to run your application and visa process, to contact you, to send the notices you ask for, to keep our records and to meet legal obligations.",
      "We share it only with the universities, embassies, partners and service providers who need it to do their part, and we keep your uploaded documents private. We do not sell your personal information. You can ask us to show, correct or delete your information by writing to us, although we may have to keep some records where the law or an unfinished case requires it.",
    ],
  },
  {
    title: "10. Acceptable use",
    body: [
      "Do not misuse the site: do not try to break into accounts or systems, upload harmful files, copy the catalog in bulk, send spam through our forms, or use the site to mislead others. We may suspend or close an account that breaks these terms.",
    ],
  },
  {
    title: "11. Content and photos",
    body: [
      "The CAS name, logo and the original text, design and data of this site belong to CAS or its licensors. Photos and logos of universities and other third parties belong to their owners and are used with their permission or under the licence stated for them. You may not reuse our content commercially without our written consent.",
    ],
  },
  {
    title: "12. Our responsibility",
    body: [
      "We will do our work with reasonable care. To the extent the law allows, CAS is not responsible for losses caused by decisions or delays of universities, embassies or other authorities, by changes to rules, fees or dates, by information you gave us that was wrong or incomplete, or by events beyond our reasonable control. Nothing in these terms limits liability that cannot be limited by law, such as for fraud.",
    ],
  },
  {
    title: "13. Changes to these terms",
    body: [
      "We may update these terms from time to time. The date at the top shows the latest version. If you keep using the site or your account after a change, you accept the updated terms. Where you have signed a service agreement with us, that agreement also applies and prevails if it differs from these terms.",
    ],
  },
]

export default function SiteTerms() {
  const { t } = useTranslation()
  useSeo({
    title: t("terms.seoTitle", { defaultValue: "Terms & Conditions" }),
    description: t("terms.seoDescription", { defaultValue: "The terms for using the CAS website and services." }),
    canonicalPath: "/site/terms",
  })

  return (
    <div className="space-y-6">
      <SitePageHeader
        title={t("terms.title", { defaultValue: "Terms & Conditions" })}
        subtitle={t("terms.subtitle", { defaultValue: "Last updated {{date}}", date: UPDATED })}
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
          <h2 className="font-semibold text-cas-navy">14. Contact us</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Questions about these terms or your information: write to{" "}
            <a href={`mailto:${CONTACT.emailGeneral}`} className="underline hover:text-cas-navy">{CONTACT.emailGeneral}</a>
            {" "}or use the <Link to="/site/contact" className="underline hover:text-cas-navy">contact page</Link>.
          </p>
        </section>
      </div>
    </div>
  )
}
