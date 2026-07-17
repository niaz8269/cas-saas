import { toCsv } from "./csv"

it("serialises header and rows with CRLF line endings", () => {
  const csv = toCsv(["Code", "Applications"], [["JLMU", 5], ["DMU", 3]])

  expect(csv).toBe("Code,Applications\r\nJLMU,5\r\nDMU,3")
})

it("quotes values containing commas, quotes or newlines", () => {
  const csv = toCsv(["Name", "Note"], [
    ["Global Study, Ltd", 'He said "hi"'],
    ["Multi\nline", "plain"],
  ])

  expect(csv).toBe(
    'Name,Note\r\n"Global Study, Ltd","He said ""hi"""\r\n"Multi\nline",plain',
  )
})

it("renders null and undefined as empty cells", () => {
  expect(toCsv(["A", "B"], [[null, undefined]])).toBe("A,B\r\n,")
})
