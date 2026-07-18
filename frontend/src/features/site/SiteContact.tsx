import { Globe, Mail, MapPin, MessageCircle } from "lucide-react"

import EnquiryForm from "@/features/site/EnquiryForm"

const OFFICES = [
  { city: "Head Office", detail: "Beijing, China" },
  { city: "Islamabad", detail: "Pakistan" },
]

export default function SiteContact() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-cas-navy sm:text-3xl">Get in touch</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Request a free consultation and a CAS counselor will guide you through your options.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Contact details */}
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="font-semibold text-cas-navy">Talk to us</h2>
            <ul className="mt-4 space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <Globe className="mt-0.5 size-5 text-cas-navy" />
                <span><span className="block font-medium">Website</span><a href="https://www.cas.moe" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-cas-navy">www.cas.moe</a></span>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="mt-0.5 size-5 text-cas-navy" />
                <span><span className="block font-medium">Email</span><a href="mailto:info@cas.moe" className="text-muted-foreground hover:text-cas-navy">info@cas.moe</a></span>
              </li>
              <li className="flex items-start gap-3">
                <MessageCircle className="mt-0.5 size-5 text-cas-navy" />
                <span><span className="block font-medium">WhatsApp</span><span className="text-muted-foreground">Available by city — ask us for your nearest advisor</span></span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="font-semibold text-cas-navy">Offices</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {OFFICES.map((o) => (
                <li key={o.city} className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-5 text-cas-navy" />
                  <span><span className="block font-medium">{o.city}</span><span className="text-muted-foreground">{o.detail}</span></span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Enquiry form */}
        <div className="lg:col-span-3">
          <EnquiryForm />
        </div>
      </div>
    </div>
  )
}
