/** Photos behind the public page headers; credits are shown with each photo. */
export interface HeaderImage {
  src: string
  credit?: string
}

export const HEADER_IMAGES = {
  default: { src: "/images/hero-great-wall.webp" },
  universities: { src: "/photos/26381dd4a912e3.webp", credit: "galaygobi, CC BY 2.0, via Wikimedia Commons" },
  programs: { src: "/photos/5ce27b72beb161.webp", credit: "Howchou, CC BY-SA 3.0, via Wikimedia Commons" },
  scholarships: { src: "/photos/ff2e51e96431bc.webp", credit: "Lukacs~commonswiki (assumed author), CC BY 2.5, via Wikimedia Commons" },
} satisfies Record<string, HeaderImage>

/** Campus photos for the home page highlight tiles, in tile order. */
export const HIGHLIGHT_PHOTOS: HeaderImage[] = [
  { src: "/photos/dda80ea0abcf39.webp", credit: "Urga, CC BY-SA 3.0, via Wikimedia Commons" },
  { src: "/photos/80dd5b54dfc2d0.webp", credit: "Daniel Berthold, CC BY-SA 3.0, via Wikimedia Commons" },
  { src: "/photos/48cb5fb6b40a88.webp", credit: "N509FZ, CC BY-SA 4.0, via Wikimedia Commons" },
  { src: "/photos/cffbf5de2ba088.webp", credit: "瑞丽江的河水, CC BY-SA 4.0, via Wikimedia Commons" },
  { src: "/photos/22a4b8e9766d5f.webp", credit: "Zhangzhugang, CC BY-SA 4.0, via Wikimedia Commons" },
  { src: "/photos/090471e90ca91c.webp", credit: "Flsxx, CC BY-SA 3.0, via Wikimedia Commons" },
]
