import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { renderWithProviders } from "@/test/utils"

import { CustomFieldsCard } from "./applySteps"

it("renders a radio custom field and reports the chosen option", async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  const fields = [
    { key: "preferred_major", label: "Preferred major", type: "radio" as const, required: true, options: ["Medicine", "Engineering"] },
  ]

  renderWithProviders(<CustomFieldsCard fields={fields} answers={{}} onChange={onChange} />)

  await user.click(screen.getByRole("radio", { name: "Medicine" }))

  expect(onChange).toHaveBeenCalledWith("preferred_major", "Medicine")
})
