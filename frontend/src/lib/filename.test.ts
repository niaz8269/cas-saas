import { filenameFromDisposition } from "@/lib/api"

it("reads the UTF-8 file name first, then the plain one", () => {
  expect(filenameFromDisposition("attachment; filename=\"fallback.zip\"; filename*=utf-8''%E5%BC%A0%E4%BC%9F-MBBS.zip")).toBe("张伟-MBBS.zip")
  expect(filenameFromDisposition("attachment; filename=\"Ali Khan-MBBS-Jilin.zip\"")).toBe("Ali Khan-MBBS-Jilin.zip")
  expect(filenameFromDisposition("attachment; filename=report.csv")).toBe("report.csv")
  expect(filenameFromDisposition(null)).toBeNull()
  expect(filenameFromDisposition("attachment")).toBeNull()
})
