import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import ImageUpload from "./ImageUpload"

beforeEach(() => vi.restoreAllMocks())

it("uploads a file and reports back the stored path + preview url", async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
    jsonResponse({ path: "catalog/abc.webp", url: "http://minio/cas/catalog/abc.webp" }),
  ))

  const { container } = renderWithProviders(
    <ImageUpload label="Logo" previewUrl={null} onChange={onChange} />,
  )

  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  await user.upload(input, new File(["x"], "logo.png", { type: "image/png" }))

  await waitFor(() => expect(onChange).toHaveBeenCalledWith("catalog/abc.webp", "http://minio/cas/catalog/abc.webp"))
})

it("accepts a pasted URL", async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()

  renderWithProviders(<ImageUpload label="Logo" previewUrl={null} onChange={onChange} />)

  const urlField = screen.getByLabelText("Logo URL")
  await user.type(urlField, "https://cdn.example/logo.webp")
  await user.tab() // blur

  expect(onChange).toHaveBeenCalledWith("https://cdn.example/logo.webp", "https://cdn.example/logo.webp")
})

it("shows a preview and a remove action when a value is set", async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()

  renderWithProviders(<ImageUpload label="Logo" previewUrl="https://cdn/logo.webp" onChange={onChange} />)

  expect(screen.getByRole("img")).toHaveAttribute("src", "https://cdn/logo.webp")
  await user.click(screen.getByRole("button", { name: /Remove/ }))
  expect(onChange).toHaveBeenCalledWith("", null)
})
