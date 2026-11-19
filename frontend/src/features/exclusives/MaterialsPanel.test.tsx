import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import MaterialsPanel from "./MaterialsPanel"

it("uploads several files at once, names each after its file, and lists the one that failed", async () => {
  const bodies: FormData[] = []
  vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url = String(input)
    if (init?.method === "POST") {
      const body = init.body as FormData
      bodies.push(body)
      if ((body.get("file") as File).name === "bad.pdf") {
        return Promise.resolve(jsonResponse({ message: "The file failed.", errors: { file: ["Too large."] } }, 422))
      }

      return Promise.resolve(jsonResponse({ data: { id: bodies.length } }, 201))
    }
    if (url.includes("/exclusives/5")) return Promise.resolve(jsonResponse({ data: { id: 5, materials: [] } }))

    return Promise.resolve(jsonResponse({ data: [] }))
  })
  const user = userEvent.setup()
  renderWithProviders(<MaterialsPanel offerId={5} canManage />)

  const input = await screen.findByLabelText("Choose files to upload")
  expect(input).toHaveAttribute("multiple")
  await user.upload(input, [
    new File(["a"], "brochure 2027.pdf", { type: "application/pdf" }),
    new File(["b"], "bad.pdf", { type: "application/pdf" }),
    new File(["c"], "banner.png", { type: "image/png" }),
  ])

  await waitFor(() => expect(bodies).toHaveLength(3))
  expect(bodies.map((b) => b.get("title"))).toEqual(["brochure 2027", "bad", "banner"])
  expect(await screen.findByText("1 file was not uploaded:")).toBeInTheDocument()
  expect(screen.getByText("bad.pdf: Too large.")).toBeInTheDocument()
})
