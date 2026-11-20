import type { ComponentProps } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

/**
 * A link from the public website into the student/agency portal. The portal opens in its own tab so the
 * visitor keeps their place on the website, and screen readers are told the link opens a new tab.
 */
export default function PortalLink({ children, ...props }: ComponentProps<typeof Link>) {
  const { t } = useTranslation()
  const hint = t("newTab", { defaultValue: "(opens in a new tab)" })
  const label = props["aria-label"]

  return (
    <Link {...props} target="_blank" rel="noopener noreferrer" aria-label={label ? `${label} ${hint}` : undefined}>
      {children}
      {!label && <span className="sr-only"> {hint}</span>}
    </Link>
  )
}
