import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ApiError } from "@/lib/api"
import { renderWithProviders } from "@/test/utils"

import RowActions from "./RowActions"

it("offers Open, Edit and Delete, and deletes only after a confirmation", async () => {
  const user = userEvent.setup()
  const onOpen = vi.fn()
  const onEdit = vi.fn()
  const onDelete = vi.fn().mockResolvedValue(undefined)
  renderWithProviders(<RowActions name="Lanzhou University" onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} />)

  await user.click(screen.getByRole("button", { name: "Actions for Lanzhou University" }))
  await user.click(await screen.findByRole("menuitem", { name: "Edit" }))
  expect(onEdit).toHaveBeenCalled()

  await user.click(screen.getByRole("button", { name: "Actions for Lanzhou University" }))
  await user.click(await screen.findByRole("menuitem", { name: "Delete" }))
  expect(onDelete).not.toHaveBeenCalled()
  expect(screen.getByText("Delete Lanzhou University?")).toBeInTheDocument()

  await user.click(screen.getByRole("button", { name: "Delete" }))
  expect(onDelete).toHaveBeenCalledTimes(1)
})

it("keeps the box open and says why when the server refuses", async () => {
  const user = userEvent.setup()
  const onDelete = vi.fn().mockRejectedValue(new ApiError(403, { message: "Only a Super Admin can delete a Super Admin account." }))
  renderWithProviders(<RowActions name="Root" onDelete={onDelete} />)

  await user.click(screen.getByRole("button", { name: "Actions for Root" }))
  await user.click(await screen.findByRole("menuitem", { name: "Delete" }))
  await user.click(screen.getByRole("button", { name: "Delete" }))

  expect(await screen.findByRole("alert")).toHaveTextContent("Only a Super Admin can delete a Super Admin account.")
})

it("shows nothing at all when the person may do none of it", () => {
  const { container } = renderWithProviders(<RowActions name="Locked" />)

  expect(container).toBeEmptyDOMElement()
})

it("hides Delete when it is not allowed", async () => {
  const user = userEvent.setup()
  renderWithProviders(<RowActions name="Ro" onOpen={vi.fn()} onEdit={vi.fn()} />)

  await user.click(screen.getByRole("button", { name: "Actions for Ro" }))
  expect(await screen.findByRole("menuitem", { name: "Edit" })).toBeInTheDocument()
  expect(screen.queryByRole("menuitem", { name: "Delete" })).not.toBeInTheDocument()
})
