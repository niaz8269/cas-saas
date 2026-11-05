/**
 * Photos are shown clean, but anything a visitor saves or drags out of the page should carry the
 * CAS emblem. Just before the browser acts on a right-click, a drag or a long-press on one of the
 * site's own photos, the picture's source is switched to its CAS-emblem copy (/wm/...), so "Save
 * image as", "Copy image address", drag-to-desktop and "Save to Photos" all use that copy. The
 * clean source is restored right after. Screenshots and developer tools are out of reach for any website.
 */
const SAVEABLE = /^\/(photos|images)\/((?:photos\/)?[\w.-]+\.webp)$/
const OWN = /^\/(photos\/[\w.-]+\.webp|images\/(?:hero|header)[\w.-]*\.webp)$/

function ownPhotoPath(img: HTMLImageElement): string | null {
  try {
    const path = new URL(img.currentSrc || img.src, window.location.href).pathname

    return OWN.test(path) ? path : null
  } catch {
    return null
  }
}

function swapToWatermarked(img: HTMLImageElement) {
  if (img.dataset.casWm) return
  const path = ownPhotoPath(img)
  const match = path && SAVEABLE.exec(path)
  if (!match) return

  img.dataset.casWm = "1"
  img.dataset.casSrc = img.getAttribute("src") ?? ""
  img.dataset.casSrcset = img.getAttribute("srcset") ?? ""
  img.removeAttribute("srcset")
  img.src = `/wm/${match[1]}/${match[2]}`
}

function restore(img: HTMLImageElement) {
  if (!img.dataset.casWm) return
  img.src = img.dataset.casSrc ?? ""
  if (img.dataset.casSrcset) img.setAttribute("srcset", img.dataset.casSrcset)
  delete img.dataset.casWm
  delete img.dataset.casSrc
  delete img.dataset.casSrcset
}

const imageOf = (target: EventTarget | null) => (target instanceof Element ? target.closest("img") : null)

export function installPhotoGuard(): void {
  if (typeof document === "undefined") return
  const swapped = new Set<HTMLImageElement>()
  let swappedAt = 0

  const swap = (img: HTMLImageElement) => {
    swapToWatermarked(img)
    if (img.dataset.casWm) {
      swapped.add(img)
      swappedAt = Date.now()
    }
  }
  const restoreAll = () => {
    swapped.forEach(restore)
    swapped.clear()
  }

  // Desktop right-click, and long-press on Android (which sends the same event).
  document.addEventListener("contextmenu", (e) => {
    const img = imageOf(e.target)
    if (img) swap(img)
  }, true)

  // Dragging a photo out of the page.
  document.addEventListener("dragstart", (e) => {
    const img = imageOf(e.target)
    if (img) swap(img)
  }, true)
  document.addEventListener("dragend", restoreAll, true)

  // iOS long-press ("Save to Photos") sends no event: switch just before the callout appears.
  let timer: number | undefined
  document.addEventListener("touchstart", (e) => {
    const img = imageOf(e.target)
    if (!img) return
    window.clearTimeout(timer)
    timer = window.setTimeout(() => swap(img), 350)
  }, { passive: true, capture: true })
  const endTouch = () => {
    window.clearTimeout(timer)
    window.setTimeout(restoreAll, 4000)
  }
  document.addEventListener("touchend", endTouch, true)
  document.addEventListener("touchcancel", endTouch, true)

  // A context menu swallows the mouse; the first movement after it closes means the choice was made.
  document.addEventListener("pointermove", () => {
    if (swapped.size && Date.now() - swappedAt > 600) restoreAll()
  }, true)
  document.addEventListener("keydown", () => swapped.size && restoreAll(), true)
}
