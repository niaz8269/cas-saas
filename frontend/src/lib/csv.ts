export type CsvValue = string | number | null | undefined

/** Serialise a header + rows to RFC-4180-ish CSV text (CRLF, quoted when needed). */
export function toCsv(header: string[], rows: CsvValue[][]): string {
  const escape = (value: CsvValue): string => {
    const s = value == null ? "" : String(value)

    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }

  return [header, ...rows].map((row) => row.map(escape).join(",")).join("\r\n")
}

/** Build a CSV and trigger a client-side download. */
export function downloadCsv(filename: string, header: string[], rows: CsvValue[][]): void {
  const blob = new Blob([toCsv(header, rows)], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
