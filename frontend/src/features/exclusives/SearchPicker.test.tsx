import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"

import { renderWithProviders } from "@/test/utils"

import SearchPicker from "./SearchPicker"

function Harness({ search }: { search: (q: string) => Promise<{ total: number; data: { id: number; label: string }[] }> }) {
  const [value, setValue] = useState<string | null>(null)

  return <SearchPicker id="p" label="Program" queryKey="t" placeholder="Search programs" search={search} value={value} onPick={(i) => setValue(i.label)} onClear={() => setValue(null)} />
}

it("searches the server as you type, picks with the keyboard, and can be changed", async () => {
  const search = vi.fn((q: string) => Promise.resolve(q ? { total: 1, data: [{ id: 7, label: "Zhejiang Clinical Medicine" }] } : { total: 120, data: [{ id: 1, label: "Anhui Nursing" }] }))
  const user = userEvent.setup()
  renderWithProviders(<Harness search={search} />)

  await user.click(screen.getByRole("combobox", { name: "Program" }))
  expect(await screen.findByRole("option", { name: "Anhui Nursing" })).toBeInTheDocument()
  expect(screen.getByText(/Showing 1 of 120/)).toBeInTheDocument()

  await user.type(screen.getByRole("combobox", { name: "Program" }), "zhe")
  await waitFor(() => expect(search).toHaveBeenCalledWith("zhe"))
  expect(await screen.findByRole("option", { name: "Zhejiang Clinical Medicine" })).toBeInTheDocument()

  await user.keyboard("{Enter}")
  expect(await screen.findByText("Zhejiang Clinical Medicine")).toBeInTheDocument()
  expect(screen.queryByRole("combobox")).not.toBeInTheDocument()

  await user.click(screen.getByRole("button", { name: "Change program" }))
  expect(screen.getByRole("combobox", { name: "Program" })).toBeInTheDocument()
})

it("lets a name that is not in the list be used as typed", async () => {
  const search = vi.fn(() => Promise.resolve({ total: 0, data: [] }))
  const onCustom = vi.fn()
  const user = userEvent.setup()
  renderWithProviders(<SearchPicker id="p" label="Program" queryKey="c" placeholder="Search programs" search={search} value={null} onPick={vi.fn()} onCustom={onCustom} onClear={vi.fn()} />)

  await user.type(screen.getByRole("combobox", { name: "Program" }), "My New Program")
  await user.click(await screen.findByRole("option", { name: /Use "My New Program" as typed/ }))
  expect(onCustom).toHaveBeenCalledWith("My New Program")
})
