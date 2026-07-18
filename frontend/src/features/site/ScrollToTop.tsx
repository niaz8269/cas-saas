import { useEffect } from "react"
import { useLocation } from "react-router-dom"

/** Reset scroll to the top on navigation, but let in-page #anchors jump. */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) return
    window.scrollTo(0, 0)
  }, [pathname, hash])

  return null
}
