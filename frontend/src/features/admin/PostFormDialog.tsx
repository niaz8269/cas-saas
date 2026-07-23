import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import RichTextEditor from "@/components/RichTextEditor"
import { createPost, updatePost, uploadImage, POST_LOCALES, type Post, type PostLocale, type PostTranslations, type PostWritePayload } from "@/features/admin/api"
import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"

const LANG_LABELS: Record<PostLocale, string> = {
  en: "English", zh: "中文", ar: "العربية", fr: "Français", id: "Indonesia",
}

const baseSchema = z.object({
  type: z.enum(["news", "blog", "event"]),
  title: z.string().min(1, "Title is required").max(200),
  slug: z.string().max(220).optional(),
  category: z.string().max(80).optional(),
  excerpt: z.string().max(500).optional(),
  cover_image_path: z.string().max(255).optional(),
  status: z.enum(["draft", "published"]),
  event_date: z.string().optional(),
  location: z.string().max(180).optional(),
  register_url: z.string().max(255).optional(),
})

const schema = baseSchema.refine((d) => d.type !== "event" || !!d.event_date, {
  message: "Event date is required",
  path: ["event_date"],
})

type Values = z.infer<typeof baseSchema>

/** ISO → the value a <input type="datetime-local"> expects (local, no zone). */
function toLocalInput(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toValues(p?: Post): Values {
  return {
    type: (p?.type as Values["type"]) ?? "news",
    title: p?.title ?? "",
    slug: p?.slug ?? "",
    category: p?.category ?? "",
    excerpt: p?.excerpt ?? "",
    cover_image_path: p?.cover_image_path ?? "",
    status: (p?.status as Values["status"]) ?? "draft",
    event_date: toLocalInput(p?.event_date ?? null),
    location: p?.location ?? "",
    register_url: p?.register_url ?? "",
  }
}

export default function PostFormDialog({ post, open, onOpenChange }: {
  post?: Post
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const isEdit = Boolean(post)
  const [body, setBody] = useState(post?.body ?? "")
  const [coverPreview, setCoverPreview] = useState(post?.cover_image_url ?? "")
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Title/excerpt/body are per-language; "en" edits the base fields, the rest
  // edit the `translations` map.
  const [lang, setLang] = useState<PostLocale>("en")
  const [translations, setTranslations] = useState<PostTranslations>(post?.translations ?? {})

  const setTr = (field: "title" | "excerpt" | "body", value: string) =>
    setTranslations((t) => ({ ...t, [lang]: { ...t[lang], [field]: value } }))

  const { register, handleSubmit, reset, setError, setValue, watch, formState: { errors } } =
    useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(post) })

  useEffect(() => {
    if (!open) return
    reset(toValues(post))
    setBody(post?.body ?? "")
    setCoverPreview(post?.cover_image_url ?? "")
    setTranslations(post?.translations ?? {})
    setLang("en")
  }, [open, post, reset])

  const type = watch("type")
  const coverPath = watch("cover_image_path")
  const coverSrc = coverPath?.startsWith("http") ? coverPath : coverPreview

  const upload = useMutation({
    mutationFn: uploadImage,
    onSuccess: (res) => {
      setValue("cover_image_path", res.path, { shouldDirty: true, shouldValidate: true })
      setCoverPreview(res.url)
    },
  })

  const mutation = useMutation({
    mutationFn: (v: Values) => {
      const payload: PostWritePayload = {
        type: v.type,
        title: v.title,
        slug: v.slug || undefined,
        category: v.category || null,
        excerpt: v.excerpt || null,
        cover_image_path: v.cover_image_path || null,
        status: v.status,
        body: body || null,
        translations: Object.keys(translations).length ? translations : undefined,
        event_date: v.type === "event" ? v.event_date || null : null,
        location: v.type === "event" ? v.location || null : null,
        register_url: v.type === "event" ? v.register_url || null : null,
      }

      return isEdit ? updatePost(post!.id, payload) : createPost(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] })
      onOpenChange(false)
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 422) {
        for (const [field, messages] of Object.entries(error.errors)) {
          if (field in baseSchema.shape) setError(field as keyof Values, { type: "server", message: messages[0] })
        }

        return
      }
      setError("root", { type: "server", message: error instanceof ApiError ? error.message : "Something went wrong." })
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit post" : "New post"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 pb-2">
            {errors.root && <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{errors.root.message}</p>}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setValue("type", v as Values["type"])}>
                  <SelectTrigger aria-label="Type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="news">News</SelectItem>
                    <SelectItem value="blog">Blog</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={watch("status")} onValueChange={(v) => setValue("status", v as Values["status"])}>
                  <SelectTrigger aria-label="Status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Content-language switcher — scopes the title, excerpt and body. */}
            <div className="space-y-1.5">
              <Label>Content language</Label>
              <div className="flex w-fit flex-wrap gap-1 rounded-lg border bg-card p-1">
                {POST_LOCALES.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLang(l)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      lang === l ? "bg-cas-navy text-white" : "text-muted-foreground hover:bg-subtle",
                    )}
                  >
                    {LANG_LABELS[l]}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                English is the default shown when a translation is missing. Slug, cover and dates are shared across languages.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="post-title">Title</Label>
              {lang === "en" ? (
                <Input id="post-title" {...register("title")} />
              ) : (
                <Input
                  id="post-title"
                  value={translations[lang]?.title ?? ""}
                  onChange={(e) => setTr("title", e.target.value)}
                  placeholder={watch("title")}
                />
              )}
              {errors.title && <p role="alert" className="text-sm text-destructive">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="post-slug">Slug (optional)</Label>
                <Input id="post-slug" placeholder="auto from title" {...register("slug")} />
                {errors.slug && <p role="alert" className="text-sm text-destructive">{errors.slug.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="post-category">Category (optional)</Label>
                <Input id="post-category" {...register("category")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cover image (optional)</Label>
              {coverSrc && (
                <img src={coverSrc} alt="Cover preview" className="h-36 w-full rounded-lg border border-line object-cover" />
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) upload.mutate(file)
                  e.target.value = ""
                }}
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={upload.isPending}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {upload.isPending ? "Uploading…" : coverSrc ? "Replace image" : "Upload image"}
                </Button>
                {(coverPath || coverPreview) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setValue("cover_image_path", "", { shouldDirty: true })
                      setCoverPreview("")
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <Input placeholder="…or paste an image URL" {...register("cover_image_path")} />
              <p className="text-xs text-muted-foreground">Auto-resized and converted to WebP on upload. JPEG/PNG/WebP, max 5 MB.</p>
              {upload.isError && (
                <p role="alert" className="text-sm text-destructive">
                  {upload.error instanceof ApiError ? upload.error.message : "Upload failed."}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="post-excerpt">Excerpt (optional)</Label>
              {lang === "en" ? (
                <Textarea id="post-excerpt" rows={2} {...register("excerpt")} />
              ) : (
                <Textarea
                  id="post-excerpt"
                  rows={2}
                  value={translations[lang]?.excerpt ?? ""}
                  onChange={(e) => setTr("excerpt", e.target.value)}
                />
              )}
            </div>

            {type === "event" && (
              <div className="grid grid-cols-2 gap-3 rounded-lg border bg-subtle p-3">
                <div className="space-y-2">
                  <Label htmlFor="post-event-date">Event date &amp; time</Label>
                  <Input id="post-event-date" type="datetime-local" {...register("event_date")} />
                  {errors.event_date && <p role="alert" className="text-sm text-destructive">{errors.event_date.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="post-location">Location</Label>
                  <Input id="post-location" {...register("location")} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="post-register">Registration URL</Label>
                  <Input id="post-register" placeholder="https://…" {...register("register_url")} />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Body</Label>
              <RichTextEditor
                key={`${post?.id ?? "new"}-${lang}`}
                value={lang === "en" ? body : translations[lang]?.body ?? ""}
                onChange={(v) => (lang === "en" ? setBody(v) : setTr("body", v))}
              />
            </div>
          </div>

          <DialogFooter className="mt-2 shrink-0 border-t pt-3">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Create post"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
