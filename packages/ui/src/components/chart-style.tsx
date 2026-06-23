import {
  CHART_THEME_ENTRIES,
  type ChartConfig,
} from "@workspace/ui/components/chart-context"
import * as React from "react"

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = React.useMemo(
    () =>
      Object.entries(config).filter(
        ([, itemConfig]) => itemConfig.theme ?? itemConfig.color
      ),
    [config]
  )
  const cssText = React.useMemo(
    () => getChartCssText(id, colorConfig),
    [colorConfig, id]
  )

  if (!colorConfig.length) {
    return null
  }

  return <style>{cssText}</style>
}

function getChartCssText(
  id: string,
  colorConfig: Array<[string, ChartConfig[string]]>
) {
  return CHART_THEME_ENTRIES.map(
    ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .flatMap(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme] ?? itemConfig.color
    return color ? [`  --color-${key}: ${color};`] : []
  })
  .join("\n")}
}
`
  ).join("\n")
}

export { ChartStyle }
