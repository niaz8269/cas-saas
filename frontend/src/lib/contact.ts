/**
 * CAS's public contact details, shown in the footer, the help bar and the
 * contact page.
 */
export const CONTACT = {
  phone: "+8617640412827",
  phoneDisplay: "+86 176 4041 2827",
  whatsapp: "https://wa.me/8617640412827",
  // Used only by the floating WhatsApp button at the bottom left of the site; every other WhatsApp link and the QR code use the number above.
  whatsappButton: "https://wa.me/8618041566030",
  wechat: "CAS-KAMI",
  // The WeChat account shown in the thin bar at the top of every page, with its own QR code.
  wechatTopBar: "CAS-Edu",
  wechatTopBarQr: "/images/wechat-qr-cas-edu.jpg",
  emailAdmissions: "admissions@cas.moe",
  emailGeneral: "info@cas.moe",
} as const
