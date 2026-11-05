/** Photos behind the public page headers; credits are shown with each photo. */
export interface HeaderImage {
  src: string
  credit?: string
}

export const HEADER_IMAGES: Record<"default" | "universities" | "programs" | "scholarships" | "cities", HeaderImage> = {
  // Supplied by the site owner (photographer and licence to be confirmed; see docs/CONTENT_MEDIA_AUDIT.md).
  default: { src: "/images/header-default.webp" },
  universities: { src: "/images/header-universities.webp" },
  scholarships: { src: "/images/header-scholarships.webp" },
  cities: { src: "/images/header-cities.webp" },
  // The same Tianjin photo the city pages use, with its Wikimedia Commons credit.
  programs: { src: "/photos/62178813c2fd09.webp", credit: "KangTyngrwey, CC BY-SA 4.0, via Wikimedia Commons" },
}

/** Campus photos for the home page highlight tiles, in tile order. */
export const HIGHLIGHT_PHOTOS: HeaderImage[] = [
  { src: "/photos/dda80ea0abcf39.webp", credit: "Urga, CC BY-SA 3.0, via Wikimedia Commons" },
  { src: "/photos/80dd5b54dfc2d0.webp", credit: "Daniel Berthold, CC BY-SA 3.0, via Wikimedia Commons" },
  { src: "/photos/48cb5fb6b40a88.webp", credit: "N509FZ, CC BY-SA 4.0, via Wikimedia Commons" },
  { src: "/photos/cffbf5de2ba088.webp", credit: "瑞丽江的河水, CC BY-SA 4.0, via Wikimedia Commons" },
  { src: "/photos/22a4b8e9766d5f.webp", credit: "Zhangzhugang, CC BY-SA 4.0, via Wikimedia Commons" },
  { src: "/photos/090471e90ca91c.webp", credit: "Flsxx, CC BY-SA 3.0, via Wikimedia Commons" },
]
