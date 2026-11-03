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
