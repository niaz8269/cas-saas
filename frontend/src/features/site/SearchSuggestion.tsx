import { SearchCheck } from "lucide-react"
import { Trans } from "react-i18next"

/**
 * Shown above search results when the server found nothing for what was typed and searched for the closest
 * correctly spelled words instead ("herbin" shows the results for "harbin").
 */
export default function SearchSuggestion({ suggestion }: { suggestion?: { original: string; query: string } | null }) {
  if (!suggestion) return null

  return (
    <p role="status" className="flex items-start gap-2 rounded-sm border border-cas-navy/15 bg-cas-navy-50 px-4 py-3 text-sm text-cas-navy">
      <SearchCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        <Trans
          i18nKey="searchSuggestion.text"
          values={{ original: suggestion.original, query: suggestion.query }}
          components={{ strong: <strong className="font-semibold" /> }}
        />
      </span>
    </p>
  )
}
