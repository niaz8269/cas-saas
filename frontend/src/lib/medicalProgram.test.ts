import { isMedicalProgram, mediumFor } from "./medicalProgram"

it("recognises the medical programs", () => {
  for (const name of ["MBBS", "Bachelor of Dental Surgery (BDS)", "Nursing", "Pharmacy", "Pharmaceutical Engineering", "Stomatology", "Clinical Medicine", "Master of Nursing Science"]) {
    expect(isMedicalProgram(name)).toBe(true)
  }
})

it("does not treat other programs as medical", () => {
  for (const name of ["Civil Engineering", "Business Administration", "International Chinese Language Education", "Computer Science and Technology", "", null, undefined]) {
    expect(isMedicalProgram(name)).toBe(false)
  }
})

it("names the medium of instruction only for a medical program that has one", () => {
  expect(mediumFor({ name: "MBBS", teaching_language: "English" })).toBe("English")
  expect(mediumFor({ name: "Nursing", teaching_language: null })).toBeNull()
  expect(mediumFor({ name: "Civil Engineering", teaching_language: "English" })).toBeNull()
})
