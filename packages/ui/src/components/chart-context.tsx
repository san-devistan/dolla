import * as React from "react"

const CHART_THEME_ENTRIES = [
  ["light", ""],
  ["dark", ".dark"],
] as const

type ChartTheme = (typeof CHART_THEME_ENTRIES)[number][0]

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<ChartTheme, string> }
  )
>

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function ChartProvider({
  children,
  config,
}: React.PropsWithChildren<{ config: ChartConfig }>) {
  const value = React.useMemo(() => ({ config }), [config])

  return <ChartContext.Provider value={value}>{children}</ChartContext.Provider>
}

function useChart() {
  const context = React.use(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}

export { CHART_THEME_ENTRIES, ChartProvider, useChart }
