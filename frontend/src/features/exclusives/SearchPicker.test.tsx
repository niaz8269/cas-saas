import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"

import { renderWithProviders } from "@/test/utils"

import SearchPicker from "./SearchPicker"

function Harness({ search }: { search: (q: string) => Promise<{ id: number; label: string }[]> }) {
  const [value, setValue] = useState<string | null>(null)

  return <SearchPicker id="p" label="Program" queryKey="t" placeholder="Search programs" search={search} value={value} onPick={(i) => setValue(i.label)} onClear={() => setValue(null)} />
}

it("searches the server as you type, picks with the keyboard, and can be changed", async () => {
  const search = vi.fn((q: string) => Promise.resolve(q ? [{ id: 7, label: "Zhejiang Clinical Medicine" }] : [{ id: 1, label: "Anhui Nursing" }]))
  const user = userEvent.setup()
  renderWithProviders(<Harness search={search} />)

  await user.click(screen.getByRole("combobox", { name: "Program" }))
  expect(await screen.findByRole("option", { name: "Anhui Nursing" })).toBeInTheDocument()

  await user.type(screen.getByRole("combobox", { name: "Program" }), "zhe")
  await waitFor(() => expect(search).toHaveBeenCalledWith("zhe"))
  expect(await screen.findByRole("option", { name: "Zhejiang Clinical Medicine" })).toBeInTheDocument()

  await user.keyboard("{Enter}")
  expect(await screen.findByText("Zhejiang Clinical Medicine")).toBeInTheDocument()
  expect(screen.queryByRole("combobox")).not.toBeInTheDocument()

  await user.click(screen.getByRole("button", { name: "Change program" }))
  expect(screen.getByRole("combobox", { name: "Program" })).toBeInTheDocument()
})
