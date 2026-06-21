import {
  useChart,
  type ChartConfig,
} from "@workspace/ui/components/chart-context"
import { ChartTooltipItem } from "@workspace/ui/components/chart-tooltip-item"
import {
  getPayloadConfigFromPayload,
  getPayloadKey,
} from "@workspace/ui/components/chart-utils"
import { cn } from "@workspace/ui/lib/utils"
import * as React from "react"
import * as RechartsPrimitive from "recharts"
import type { TooltipValueType } from "recharts"

type TooltipNameType = number | string
type ChartTooltipContentProps = React.ComponentProps<
  typeof RechartsPrimitive.Tooltip
> &
  React.ComponentProps<"div"> & {
    hideLabel?: boolean
    hideIndicator?: boolean
    indicator?: "line" | "dot" | "dashed"
    nameKey?: string
    labelKey?: string
  } & Omit<
    RechartsPrimitive.DefaultTooltipContentProps<
      TooltipValueType,
      TooltipNameType
    >,
    "accessibilityLayer"
  >
const ChartTooltip = RechartsPrimitive.Tooltip

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: ChartTooltipContentProps) {
  const { config } = useChart()
  const tooltipLabel = useTooltipLabel({
    config,
    hideLabel,
    label,
    labelClassName,
    labelFormatter,
    labelKey,
    payload,
  })

  if (!active || !payload?.length) {
    return null
  }

  const nestLabel = payload.length === 1 && indicator !== "dot"
  const visiblePayload = payload.filter((item) => item.type !== "none")

  return (
    <div
      className={cn(
        "grid min-w-32 items-start gap-1.5 bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-sm ring-1 ring-foreground/10",
        className
      )}
    >
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">
        {visiblePayload.map((item, index) => {
          const key = getPayloadKey(item, nameKey)

          return (
            <ChartTooltipItem
              key={key}
              color={color}
              config={config}
              formatter={formatter}
              hideIndicator={hideIndicator}
              indicator={indicator}
              item={item}
              itemIndex={index}
              itemKey={key}
              nestLabel={nestLabel}
              tooltipLabel={tooltipLabel}
            />
          )
        })}
      </div>
    </div>
  )
}

type TooltipLabelOptions = Pick<
  ChartTooltipContentProps,
  | "hideLabel"
  | "label"
  | "labelClassName"
  | "labelFormatter"
  | "labelKey"
  | "payload"
> & {
  config: ChartConfig
}

function useTooltipLabel({
  config,
  hideLabel,
  label,
  labelClassName,
  labelFormatter,
  labelKey,
  payload,
}: TooltipLabelOptions) {
  return React.useMemo(() => {
    if (hideLabel || !payload?.length) {
      return null
    }

    const [item] = payload
    const key = getPayloadKey(item, labelKey)
    const itemConfig = getPayloadConfigFromPayload(config, item, key)
    const value =
      !labelKey && typeof label === "string"
        ? (config[label]?.label ?? label)
        : itemConfig?.label

    if (labelFormatter) {
      return (
        <div className={cn("font-medium", labelClassName)}>
          {labelFormatter(value, payload)}
        </div>
      )
    }

    if (!value) {
      return null
    }

    return <div className={cn("font-medium", labelClassName)}>{value}</div>
  }, [
    config,
    hideLabel,
    label,
    labelClassName,
    labelFormatter,
    labelKey,
    payload,
  ])
}

export { ChartTooltip, ChartTooltipContent }
