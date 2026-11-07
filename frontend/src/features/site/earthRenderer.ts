/**
 * Draws a real photograph of the Earth onto a canvas as an orthographic globe (a ball seen from space).
 *
 * The texture is an equirectangular NASA Blue Marble image. For a fixed tilt and zoom, every pixel of the
 * ball maps to the same latitude and the same longitude *offset*, so those are worked out once; turning the
 * globe east or west then only shifts which texture column each pixel reads. That keeps it smooth on phones.
 */

export interface EarthTexture {
  w: number
  h: number
  data: Uint8ClampedArray
}

/** Load an image and read its pixels. Resolves to null if the browser cannot (or the file is missing). */
export function loadEarthTexture(url: string): Promise<EarthTexture | null> {
  if (typeof Image === "undefined" || typeof document === "undefined") return Promise.resolve(null)

  return new Promise((resolve) => {
    const img = new Image()
    img.decoding = "async"
    img.onload = () => {
      try {
        const c = document.createElement("canvas")
        c.width = img.naturalWidth
        c.height = img.naturalHeight
        const ctx = c.getContext("2d", { willReadFrequently: true })
        if (!ctx) return resolve(null)
        ctx.drawImage(img, 0, 0)
        resolve({ w: c.width, h: c.height, data: ctx.getImageData(0, 0, c.width, c.height).data })
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

const SHADE_MAX = 1.3

// Light comes from the upper left, in front of the ball.
const LIGHT = (() => {
  const v = [-0.45, 0.5, 0.74]
  const n = Math.hypot(v[0], v[1], v[2])

  return [v[0] / n, v[1] / n, v[2] / n]
})()

export interface EarthMap {
  res: number
  /** Output pixel positions of the pixels that are on the ball. */
  pix: Int32Array
  /** Longitude of each pixel relative to the centre of the view, in degrees. */
  lonOff: Float32Array
  /** Texture row for each pixel. */
  row: Uint16Array
  /** Brightness (0-255, 128 = unchanged) and atmosphere rim strength (0-255). */
  shade: Uint8Array
  rim: Uint8Array
  count: number
}

/** Work out the pixel-to-sphere mapping for a view tilted to latitude `lat0` (radians). */
export function buildEarthMap(res: number, radiusPx: number, lat0: number, texH: number): EarthMap {
  const cx = res / 2
  const cy = res / 2
  const max = res * res
  const pix = new Int32Array(max)
  const lonOff = new Float32Array(max)
  const row = new Uint16Array(max)
  const shade = new Uint8Array(max)
  const rim = new Uint8Array(max)
  const sinP0 = Math.sin(lat0)
  const cosP0 = Math.cos(lat0)
  const r2 = radiusPx * radiusPx
  let n = 0

  for (let py = 0; py < res; py++) {
    const dy = cy - (py + 0.5)
    for (let px = 0; px < res; px++) {
      const dx = px + 0.5 - cx
      const d2 = dx * dx + dy * dy
      if (d2 >= r2) continue

      const x = dx / radiusPx
      const y = dy / radiusPx
      const rho = Math.sqrt(d2) / radiusPx
      const z = Math.sqrt(1 - rho * rho)
      let lat: number
      let lon: number

      if (rho < 1e-9) {
        lat = lat0
        lon = 0
      } else {
        const c = Math.asin(rho)
        const sinC = Math.sin(c)
        const cosC = z
        lat = Math.asin(cosC * sinP0 + (y * sinC * cosP0) / rho)
        lon = Math.atan2(x * sinC, rho * cosP0 * cosC - y * sinP0 * sinC)
      }

      pix[n] = py * res + px
      lonOff[n] = (lon * 180) / Math.PI
      row[n] = Math.min(texH - 1, Math.max(0, Math.floor(((Math.PI / 2 - lat) / Math.PI) * texH)))
      const diffuse = Math.max(0, x * LIGHT[0] + y * LIGHT[1] + z * LIGHT[2])
      // Brightness 0.25 (night side) .. 1.2 (facing the light), stored as 0-255 of a 1.3 maximum.
      shade[n] = Math.round(255 * Math.min(1, (0.25 + 0.95 * diffuse) / SHADE_MAX))
      rim[n] = Math.round(255 * Math.pow(1 - z, 2.6))
      n++
    }
  }

  return { res, pix: pix.subarray(0, n), lonOff: lonOff.subarray(0, n), row: row.subarray(0, n), shade: shade.subarray(0, n), rim: rim.subarray(0, n), count: n }
}

/** Paint the ball for the given centre longitude (degrees). */
export function drawEarth(map: EarthMap, tex: EarthTexture, lon0: number, out: ImageData): void {
  const o = out.data
  const { w, data } = tex
  const { pix, lonOff, row, shade, rim, count } = map
  o.fill(0)

  for (let k = 0; k < count; k++) {
    let lon = lonOff[k] + lon0 // degrees east
    lon = ((lon % 360) + 540) % 360 // texture column 0 is longitude -180
    const col = Math.min(w - 1, ((lon / 360) * w) | 0)
    const t = (row[k] * w + col) * 4
    const s = (shade[k] / 255) * SHADE_MAX
    const a = rim[k] / 255
    const p = pix[k] * 4
    // Sunlight on the photo, then a thin blue glow of atmosphere at the edge.
    o[p] = data[t] * s * (1 - 0.45 * a) + 70 * a
    o[p + 1] = data[t + 1] * s * (1 - 0.45 * a) + 140 * a
    o[p + 2] = data[t + 2] * s * (1 - 0.35 * a) + 255 * a * 0.85
    o[p + 3] = 255
  }
}
