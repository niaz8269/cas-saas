import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"

import CountryCombobox from "@/components/CountryCombobox"

const ITEMS = [{ value: "1", label: "Pakistan" }, { value: "2", label: "Philippines" }, { value: "3", label: "Netherlands" }, { value: "4", label: "Myanmar" }]

function Harness({ onChange }: { onChange?: (v: string) => void }) {
  const [value, setValue] = useState("")

  return (
    <>
      <label htmlFor="c">Country</label>
      <CountryCombobox id="c" items={ITEMS} value={value} onChange={(v) => { setValue(v); onChange?.(v) }} placeholder="Select your country" />
      <output data-testid="value">{value}</output>
    </>
  )
}

it("shows the country you meant when the name is misspelled, and stores it when picked", async () => {
  const onChange = vi.fn()
  const user = userEvent.setup()
  render(<Harness onChange={onChange} />)

  await user.click(screen.getByRole("combobox", { name: "Country" }))
  await user.type(screen.getByRole("combobox", { name: "Country" }), "Pakitsan")

  expect(await screen.findByText("Closest matches")).toBeInTheDocument()
  await user.click(screen.getByRole("option", { name: "Pakistan" }))

  expect(onChange).toHaveBeenLastCalledWith("1")
  expect(screen.getByRole("combobox", { name: "Country" })).toHaveValue("Pakistan")
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
})

it("finds an other name and picks with the keyboard", async () => {
  const user = userEvent.setup()
  render(<Harness />)

  await user.type(screen.getByRole("combobox", { name: "Country" }), "holland")
  expect(await screen.findByRole("option", { name: "Netherlands" })).toBeInTheDocument()
  await user.keyboard("{Enter}")

  expect(screen.getByTestId("value")).toHaveTextContent("3")
  expect(screen.getByRole("combobox", { name: "Country" })).toHaveValue("Netherlands")
})

it("says so when nothing is close, and never picks a loose guess on Tab", async () => {
  const user = userEvent.setup()
  render(<Harness />)

  await user.type(screen.getByRole("combobox", { name: "Country" }), "zzzzqx")
  expect(await screen.findByText("No country matches. Check the spelling.")).toBeInTheDocument()

  await user.clear(screen.getByRole("combobox", { name: "Country" }))
  await user.type(screen.getByRole("combobox", { name: "Country" }), "Pakitsan")
  await user.tab()

  await waitFor(() => expect(screen.getByTestId("value")).toHaveTextContent(""))
})

it("shows the whole list when opened with nothing typed", async () => {
  const user = userEvent.setup()
  render(<Harness />)

  await user.click(screen.getByRole("combobox", { name: "Country" }))

  expect(await screen.findAllByRole("option")).toHaveLength(ITEMS.length)
})
