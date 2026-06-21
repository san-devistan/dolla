import type { ChartConfig } from "@workspace/ui/components/chart-context"
import {
  getPayloadColor,
  getPayloadConfigFromPayload,
} from "@workspace/ui/components/chart-utils"
import { cn } from "@workspace/ui/lib/utils"
import * as React from "react"
import type * as RechartsPrimitive from "recharts"
import type { TooltipValueType } from "recharts"

type TooltipNameType = number | string
type ChartTooltipPayloadItem = NonNullable<
  RechartsPrimitive.DefaultTooltipContentProps<
    TooltipValueType,
    TooltipNameType
  >["payload"]
>[number]

type ChartTooltipItemProps = {
  color?: string
  config: ChartConfig
  formatter?: RechartsPrimitive.DefaultTooltipContentProps<
    TooltipValueType,
    TooltipNameType
  >["formatter"]
  hideIndicator?: boolean
  indicator: "dashed" | "dot" | "line"
  item: ChartTooltipPayloadItem
  itemIndex: number
  itemKey: string
  nestLabel: boolean
  tooltipLabel: React.ReactNode
}

function ChartTooltipItem({
  color,
  config,
  formatter,
  hideIndicator,
  indicator,
  item,
  itemIndex,
  itemKey,
  nestLabel,
  tooltipLabel,
}: ChartTooltipItemProps) {
  const itemConfig = getPayloadConfigFromPayload(config, item, itemKey)
  const indicatorColor = color ?? getPayloadColor(item.payload) ?? item.color

  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
        indicator === "dot" && "items-center"
      )}
    >
      {formatter && item.value !== undefined && item.name ? (
        formatter(item.value, item.name, item, itemIndex, item.payload)
      ) : (
        <ChartTooltipItemContent
          hideIndicator={hideIndicator}
          indicator={indicator}
          indicatorColor={indicatorColor}
          item={item}
          itemConfig={itemConfig}
          nestLabel={nestLabel}
          tooltipLabel={tooltipLabel}
        />
      )}
    </div>
  )
}

type ChartTooltipItemContentProps = Pick<
  ChartTooltipItemProps,
  "hideIndicator" | "indicator" | "item" | "nestLabel" | "tooltipLabel"
> & {
  indicatorColor: string | undefined
  itemConfig: ChartConfig[string] | undefined
}

function ChartTooltipItemContent({
  hideIndicator,
  indicator,
  indicatorColor,
  item,
  itemConfig,
  nestLabel,
  tooltipLabel,
}: ChartTooltipItemContentProps) {
  return (
    <>
      {itemConfig?.icon ? (
        <itemConfig.icon />
      ) : (
        !hideIndicator && (
          <ChartTooltipIndicator
            color={indicatorColor}
            indicator={indicator}
            nestLabel={nestLabel}
          />
        )
      )}
      <ChartTooltipItemValue
        item={item}
        itemConfig={itemConfig}
        nestLabel={nestLabel}
        tooltipLabel={tooltipLabel}
      />
    </>
  )
}

function ChartTooltipIndicator({
  color,
  indicator,
  nestLabel,
}: {
  color: string | undefined
  indicator: ChartTooltipItemProps["indicator"]
  nestLabel: boolean
}) {
  const style = React.useMemo(
    () =>
      ({
        "--color-bg": color,
        "--color-border": color,
      }) as React.CSSProperties,
    [color]
  )

  return (
    <div
      className={cn(
        "shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)",
        {
          "h-2.5 w-2.5": indicator === "dot",
          "w-1": indicator === "line",
          "w-0 border-[1.5px] border-dashed bg-transparent":
            indicator === "dashed",
          "my-0.5": nestLabel && indicator === "dashed",
        }
      )}
      style={style}
    />
  )
}

function ChartTooltipItemValue({
  item,
  itemConfig,
  nestLabel,
  tooltipLabel,
}: {
  item: ChartTooltipPayloadItem
  itemConfig: ChartConfig[string] | undefined
  nestLabel: boolean
  tooltipLabel: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex flex-1 justify-between leading-none",
        nestLabel ? "items-end" : "items-center"
      )}
    >
      <div className="grid gap-1.5">
        {nestLabel ? tooltipLabel : null}
        <span className="text-muted-foreground">
          {itemConfig?.label ?? item.name}
        </span>
      </div>
      {item.value != null && (
        <span className="font-mono font-medium text-foreground tabular-nums">
          {typeof item.value === "number"
            ? item.value.toLocaleString()
            : String(item.value)}
        </span>
      )}
    </div>
  )
}

export { ChartTooltipItem }
export type { ChartTooltipPayloadItem }
