import {
  useChart,
  type ChartConfig,
} from "@workspace/ui/components/chart-context"
import {
  getPayloadConfigFromPayload,
  getPayloadKey,
} from "@workspace/ui/components/chart-utils"
import { cn } from "@workspace/ui/lib/utils"
import * as React from "react"
import * as RechartsPrimitive from "recharts"

const ChartLegend = RechartsPrimitive.Legend

function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = "bottom",
  nameKey,
}: React.ComponentProps<"div"> & {
  hideIcon?: boolean
  nameKey?: string
} & RechartsPrimitive.DefaultLegendContentProps) {
  const { config } = useChart()

  if (!payload?.length) {
    return null
  }

  const visiblePayload = payload.filter((item) => item.type !== "none")

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-4",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className
      )}
    >
      {visiblePayload.map((item) => {
        const key = getPayloadKey(item, nameKey)
        const itemConfig = getPayloadConfigFromPayload(config, item, key)

        return (
          <ChartLegendItem
            key={key}
            hideIcon={hideIcon}
            item={item}
            itemConfig={itemConfig}
          />
        )
      })}
    </div>
  )
}

function ChartLegendItem({
  hideIcon,
  item,
  itemConfig,
}: {
  hideIcon: boolean
  item: RechartsPrimitive.LegendPayload
  itemConfig: ChartConfig[string] | undefined
}) {
  return (
    <div className="flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground">
      {itemConfig?.icon && !hideIcon ? (
        <itemConfig.icon />
      ) : (
        <ChartLegendIcon color={item.color} />
      )}
      {itemConfig?.label}
    </div>
  )
}

function ChartLegendIcon({ color }: { color: string | undefined }) {
  const style = React.useMemo(() => ({ backgroundColor: color }), [color])

  return <div className="h-2 w-2 shrink-0 rounded-[2px]" style={style} />
}

export { ChartLegend, ChartLegendContent }
