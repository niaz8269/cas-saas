import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Download, FileText, Trash2, Upload } from "lucide-react"
import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  deleteMaterial,
  downloadMaterial,
  formatBytes,
  getExclusive,
  listLibrary,
  MATERIAL_CATEGORIES,
  uploadMaterial,
  type ExclusiveMaterial,
} from "@/features/exclusives/api"
import { ApiError } from "@/lib/api"

/**
 * The downloadable files of one exclusive, or of the general agency library when `offerId` is null. Staff with
 * the manage right can add and remove files; everyone with access can download them.
 */
export default function MaterialsPanel({ offerId, canManage }: { offerId: number | null; canManage: boolean }) {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("brochure")
  const [error, setError] = useState<string | null>(null)

  // Own keys: the detail views cache the whole offer under ["exclusive", id], which has a different shape.
  const key = offerId ? ["exclusive-materials", offerId] : ["exclusive-library"]
  const { data } = useQuery({
    queryKey: key,
    queryFn: async () => (offerId ? (await getExclusive(offerId)).data.materials ?? [] : (await listLibrary()).data),
  })
  const files: ExclusiveMaterial[] = data ?? []

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: key })
    void queryClient.invalidateQueries({ queryKey: ["exclusives"] })
    if (offerId) void queryClient.invalidateQueries({ queryKey: ["exclusive", offerId] })
  }

  // Several files can be chosen at once: each is sent in turn, a failed one does not stop the rest, and the
  // problems are listed by file name. The typed name applies only when a single file is chosen.
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [failed, setFailed] = useState<string[]>([])
  const uploading = progress !== null

  const uploadAll = async (chosen: File[]) => {
    setError(null)
    setFailed([])
    const problems: string[] = []
    for (const [i, file] of chosen.entries()) {
      setProgress({ done: i, total: chosen.length })
      const name = chosen.length === 1 && title.trim() ? title.trim() : file.name.replace(/\.[^.]+$/, "")
      try {
        await uploadMaterial(offerId, { title: name, category, file })
      } catch (e) {
        const reason = e instanceof ApiError ? (Object.values(e.errors ?? {})[0]?.[0] ?? e.message) : "Upload failed."
        problems.push(`${file.name}: ${reason}`)
      }
    }
    setProgress(null)
    setFailed(problems)
    if (problems.length < chosen.length) setTitle("")
    if (fileRef.current) fileRef.current.value = ""
    refresh()
  }
  const remove = useMutation({ mutationFn: deleteMaterial, onSuccess: refresh })
  const download = useMutation({ mutationFn: downloadMaterial, onError: () => setError("Could not download the file.") })

  return (
    <div className="space-y-3">
      {files.length === 0 && <p className="text-sm text-muted-foreground">No files yet.</p>}
      <ul className="divide-y rounded-md border">
        {files.map((f) => (
          <li key={f.id} className="flex items-center gap-3 p-3">
            <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{f.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {MATERIAL_CATEGORIES.find((c) => c.value === f.category)?.label ?? f.category} · {f.original_name} · {formatBytes(f.size)}
                {f.download_count != null ? ` · ${f.download_count} downloads` : ""}
              </p>
            </div>
            <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={`Download ${f.title}`} onClick={() => download.mutate(f)}>
              <Download className="size-4" />
            </Button>
            {canManage && (
              <Button type="button" variant="ghost" size="icon" className="size-8 text-destructive" aria-label={`Remove ${f.title}`} onClick={() => remove.mutate(f.id)}>
                <Trash2 className="size-4" />
              </Button>
            )}
          </li>
        ))}
      </ul>

      {canManage && (
        <div className="grid gap-3 rounded-md border bg-muted/30 p-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
          <div>
            <Label htmlFor={`mat-title-${offerId ?? "lib"}`}>File name shown to agencies (for one file)</Label>
            <Input id={`mat-title-${offerId ?? "lib"}`} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 2027 brochure" />
          </div>
          <div>
            <Label htmlFor={`mat-cat-${offerId ?? "lib"}`}>Type</Label>
            <select id={`mat-cat-${offerId ?? "lib"}`} value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
              {MATERIAL_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <input ref={fileRef} type="file" multiple className="sr-only" id={`mat-file-${offerId ?? "lib"}`} aria-label="Choose files to upload"
              onChange={(e) => { const chosen = Array.from(e.target.files ?? []); if (chosen.length > 0) void uploadAll(chosen) }} />
            <Button type="button" variant="secondary" disabled={uploading} onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" /> {progress ? `Uploading ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…` : "Upload files"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-3">Choose one or several files at once (hold Ctrl or Shift). With several, each keeps its own file name and the type above applies to all. PDF, images, Office files, zip or short video, up to 25 MB each. Shared only with approved agencies and staff.</p>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {failed.length > 0 && (
        <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-destructive">
          <p className="font-medium">{failed.length === 1 ? "1 file was not uploaded:" : `${failed.length} files were not uploaded:`}</p>
          <ul className="list-disc pl-5">{failed.map((f) => <li key={f}>{f}</li>)}</ul>
        </div>
      )}
    </div>
  )
}
