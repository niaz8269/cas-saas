// One sentence with a link to a guide on xjmu.online (the admissions site CAS runs for Xinjiang Medical
// University), shown at the end of the page it is keyed by. The same list is in backend/config/partner_guides.php
// (used for the server-rendered page text); PartnerGuidesTest on the backend keeps the two in step.
// Each entry is a list of parts: plain text, or [label, url] for a link.
export type GuidePart = string | [label: string, url: string]

const X = "https://xjmu.online"

export const PARTNER_GUIDES: Record<string, GuidePart[]> = {
  "/site/universities/xinjiang-medical-university": [
    "CAS also runs the admissions site for this university: ",
    ["Xinjiang Medical University admissions for international students", `${X}/`],
    ". It includes a ",
    ["full guide to Xinjiang Medical University", `${X}/xinjiang-medical-university`],
    ".",
  ],
  "/site/mbbs-in-china": [
    "For one university explained in full, read the ",
    ["MBBS in China 2027 guide", `${X}/mbbs-in-china-2027`],
    " from Xinjiang Medical University admissions.",
  ],
  "/site/mbbs-in-china-fees": [
    "To see how the costs add up over six years, read ",
    ["a worked example of MBBS fees at one university", `${X}/mbbs-in-china-fees-2027`],
    ".",
  ],
  "/site/mbbs-in-china-admission-requirements": [
    "Xinjiang Medical University admissions explains ",
    ["eligibility for MBBS in China in 2027", `${X}/mbbs-in-china-eligibility-2027`],
    " step by step.",
  ],
  "/site/mbbs-in-china-for-pakistani-students": [
    "For a single university in detail, see ",
    ["XJMU's guide for Pakistani students", `${X}/mbbs-in-china-for-pakistani-students`],
    ".",
  ],
  "/site/mbbs-in-china-for-indian-students": [
    "For a single university in detail, see ",
    ["XJMU's guide for Indian students", `${X}/mbbs-in-china-for-indian-students`],
    ".",
  ],
  "/site/mbbs-in-china-for-bangladeshi-students": [
    "Xinjiang Medical University admissions has a ",
    ["guide for Bangladeshi and Nepali students", `${X}/mbbs-in-china-for-bangladeshi-nepali-students`],
    ".",
  ],
  "/site/news/moe-approves-43-universities-english-mbbs-2027": [
    "Further reading: ",
    ["the MOE list explained", `${X}/moe-listed-mbbs-universities-in-china`],
    " by Xinjiang Medical University admissions.",
  ],
  "/site/news/china-x1-student-visa-guide": [
    "Medical students can also read the ",
    ["student visa steps for MBBS students", `${X}/china-student-visa-for-mbbs`],
    ".",
  ],
  "/site/news/china-university-application-deadlines-2027-intakes": [
    "For medicine, see the ",
    ["MBBS admission calendar for 2027", `${X}/mbbs-in-china-admission-calendar-2027`],
    " from Xinjiang Medical University admissions.",
  ],
  "/site/news/top-medical-universities-in-china-for-international-students": [
    "Further reading: a ",
    ["comparison of MBBS universities in China", `${X}/compare-mbbs-universities-in-china`],
    ".",
  ],
  "/site/news/scholarships-in-china-2027-how-to-find-and-apply": [
    "For medicine, read about ",
    ["MBBS scholarships for 2027", `${X}/mbbs-in-china-scholarship-2027`],
    ".",
  ],
  "/site/news/mbbs-in-china-2027-how-to-prepare-and-apply": [
    "Students from Pakistan should also read the ",
    ["PMDC and MDCAT rules for MBBS in China", `${X}/mdcat-pmdc-rules-for-mbbs-in-china`],
    ".",
  ],
}
