/**
 * Location photos used as university covers when a university has no photo of
 * its own. They show the province's best-known city view, NOT the campus, and
 * are always shown with their credit. Images and credits are taken from the
 * SAS site's licensed set (https://sas.cas.moe/image-credits): Unsplash licence,
 * or the Creative Commons / public-domain licence named in each credit.
 */
export interface ProvinceCover {
  src: string
  credit: string
}

const U = (caption: string, photographer: string) => `${caption} — photo by ${photographer} on Unsplash`
const W = (city: string, author: string, licence: string) => `${city} — ${author}, ${licence}, via Wikimedia Commons`

const COVERS: Record<string, string> = {
  anhui: W("Hefei", "钉钉", "CC BY-SA 4.0"),
  beijing: U("Temple of Heaven, Beijing", "Victor He"),
  chongqing: U("Chongqing at night", "Paz ifical"),
  fujian: W("Xiamen", "Jay Huang from Pleasanton, USA", "CC BY 2.0"),
  gansu: W("Lanzhou", "Pieceofmetalwork", "CC BY-SA 4.0"),
  guangdong: U("Guangzhou skyline", "Zheng XUE"),
  guangxi: U("Li River, Guangxi", "Sergio Li"),
  guizhou: W("Guiyang", "Ryedamien", "CC BY-SA 4.0"),
  hainan: W("Haikou", "Anna Frodesiak", "public domain"),
  hebei: W("Shijiazhuang", "E2568", "CC0"),
  heilongjiang: W("Harbin", "xiquinhosilva", "CC BY 2.0"),
  henan: W("Zhengzhou", "Windmemories", "CC BY-SA 4.0"),
  hubei: W("Wuhan", "螺钉", "CC BY-SA 4.0"),
  hunan: W("Changsha", "Calton", "CC BY-SA 3.0"),
  "inner-mongolia": W("Hohhot", "Jonashtand", "CC BY-SA 4.0"),
  jiangsu: W("Nanjing", "xiquinhosilva", "CC BY 2.0"),
  jiangxi: W("Nanchang", "Windmemories", "CC BY-SA 4.0"),
  jilin: W("Changchun", "N509FZ", "CC BY-SA 4.0"),
  liaoning: W("Dalian", "Michael Saechang", "CC BY-SA 2.0"),
  ningxia: W("Yinchuan", "xiquinhosilva", "CC BY 2.0"),
  qinghai: W("Xining", "xiquinhosilva", "CC BY 2.0"),
  shaanxi: U("Xi'an city wall", "Yux Xiang"),
  shandong: W("Jinan", "Song Hongxiao", "CC BY-SA 3.0"),
  shanghai: U("Pudong skyline, Shanghai", "Edward He"),
  shanxi: W("Taiyuan", "xiquinhosilva", "CC BY 2.0"),
  sichuan: W("Chengdu", "FISU", "CC BY 3.0"),
  tianjin: U("Tianjin Eye and the Hai River", "Zihan Wong"),
  xinjiang: W("Urumqi", "Albertaont", "CC BY-SA 4.0"),
  yunnan: W("Kunming", "瑞丽江的河水", "CC BY-SA 4.0"),
  zhejiang: U("Lakeside pavilion, Hangzhou", "Luobing"),
}

/** The location cover for a province, or null when there is no licensed photo. */
export function provinceCover(province: string | null | undefined): ProvinceCover | null {
  if (!province) return null
  const key = province.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "")
  const credit = COVERS[key]

  return credit ? { src: `/covers/${key}.jpg`, credit } : null
}
