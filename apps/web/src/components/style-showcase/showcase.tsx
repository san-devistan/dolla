import { PrimaryColumn } from "@/components/style-showcase/primary-column"
import { SecondaryColumn } from "@/components/style-showcase/secondary-column"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { ArrowUpRightIcon, DownloadIcon, RadioTowerIcon } from "lucide-react"

function StyleShowcase() {
  return (
    <main className="min-h-[90svh] bg-background text-foreground">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:56px_56px] opacity-35" />
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-5 sm:px-6 lg:px-8">
        <ShowcaseHeader />
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
          <PrimaryColumn />
          <SecondaryColumn />
        </div>
        <ShowcaseFooter />
      </section>
    </main>
  )
}

function ShowcaseHeader() {
  return (
    <header className="flex flex-col gap-6 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex max-w-3xl flex-col gap-3">
        <Badge>
          <RadioTowerIcon data-icon="inline-start" />
          Shared UI
        </Badge>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-wide text-balance uppercase sm:text-5xl">
            Operations desk
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            A compact workspace for dense product surfaces, form controls,
            tables, and command actions.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline">
          <DownloadIcon data-icon="inline-start" />
          Export
        </Button>
        <Button>
          <ArrowUpRightIcon data-icon="inline-start" />
          Publish
        </Button>
      </div>
    </header>
  )
}

function ShowcaseFooter() {
  return (
    <footer className="flex flex-col gap-3 border-t pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>Preset applied through the web app into shared UI.</span>
      <span className="font-medium tracking-widest uppercase">packages/ui</span>
    </footer>
  )
}

export { StyleShowcase }
