import { ImagePlus, Loader2, X } from "lucide-react"
import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { uploadImage } from "@/features/catalog/api"
import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"

/**
 * A catalog image field: upload a file (server converts to WebP) or paste
 * an external URL. `value` is the stored reference (object key or URL);
 * `previewUrl` is what to display. onChange reports both back.
 */
export default function ImageUpload({
  label,
  previewUrl,
  onChange,
  aspect = "square",
}: {
  label: string
  previewUrl: string | null
  onChange: (path: string, previewUrl: string | null) => void
  aspect?: "square" | "wide"
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const { path, url } = await uploadImage(file)
      onChange(path, url)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed.")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>

      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-subtle",
            aspect === "square" ? "size-16" : "h-16 w-28",
          )}
        >
          {previewUrl ? (
            <img src={previewUrl} alt={`${label} preview`} className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="size-5 text-muted-foreground" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <Button type="button" size="sm" variant="secondary" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
              {uploading ? "Uploading…" : "Upload"}
            </Button>
            {previewUrl && (
              <Button type="button" size="sm" variant="ghost" onClick={() => onChange("", null)}>
                <X className="size-4" /> Remove
              </Button>
            )}
          </div>
          <Input
            placeholder="…or paste an image URL"
            defaultValue={previewUrl && /^https?:\/\//.test(previewUrl) ? previewUrl : ""}
            onBlur={(e) => {
              const v = e.target.value.trim()
              if (v) onChange(v, v)
            }}
            aria-label={`${label} URL`}
          />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  )
}
