import {
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@workspace/ui/components/chart-content"
import {
  CHART_THEME_ENTRIES,
  ChartProvider,
  type ChartConfig,
} from "@workspace/ui/components/chart-context"
import { cn } from "@workspace/ui/lib/utils"
import * as React from "react"
import * as RechartsPrimitive from "recharts"

const INITIAL_DIMENSION = { width: 320, height: 200 } as const

function ChartContainer({
  id,
  className,
  children,
  config,
  initialDimension = INITIAL_DIMENSION,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >["children"]
  initialDimension?: {
    width: number
    height: number
  }
}) {
  const uniqueId = React.useId()
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`

  return (
    <ChartProvider config={config}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer
          initialDimension={initialDimension}
        >
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartProvider>
  )
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const css = React.useMemo(() => buildChartStyleCss(id, config), [id, config])
  const styleHtml = React.useMemo(() => ({ __html: css }), [css])

  if (!css) {
    return null
  }

  return <style dangerouslySetInnerHTML={styleHtml} />
}

function buildChartStyleCss(id: string, config: ChartConfig) {
  const colorConfig = Object.entries(config).filter(
    ([, itemConfig]) => itemConfig.theme ?? itemConfig.color
  )

  if (!colorConfig.length) {
    return ""
  }

  return CHART_THEME_ENTRIES.map(
    ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme] ?? itemConfig.color

    return color ? `  --color-${key}: ${color};` : null
  })
  .join("\n")}
}
`
  ).join("\n")
}

export {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}
