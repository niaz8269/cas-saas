import { Button } from "@/components/ui/button"

function App() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Consultancy for Abroad Study
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-cas-navy">CAS ERP</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Frontend scaffold is up — React 18, Tailwind 4 and shadcn/ui are wired
          to the CAS design system.
        </p>
        <Button className="mt-6 w-full">Continue</Button>
      </div>
    </div>
  )
}

export default App
