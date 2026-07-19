import { Download } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { downloadFile } from "@/lib/api"

/**
 * Downloads a CSV export for a list view. `path` should already carry the same
 * filters the list is showing so the export matches what's on screen.
 */
export default function ExportButton({ path, filename }: { path: string; filename: string }) {
  const [busy, setBusy] = useState(false)

  return (
    <Button
      variant="secondary"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        try {
          await downloadFile(path, filename)
        } catch {
          // Download failures are non-critical; the button just re-enables.
        } finally {
          setBusy(false)
        }
      }}
    >
      <Download className="size-4" /> {busy ? "Exporting…" : "Export"}
    </Button>
  )
}
