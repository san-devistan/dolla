import type { ChartConfig } from "@workspace/ui/components/chart-context"

function getPayloadKey(
  item: { dataKey?: unknown; name?: unknown },
  explicitKey: string | undefined
) {
  return stringifyChartValue(explicitKey ?? item.dataKey ?? item.name)
}

function stringifyChartValue(value: unknown) {
  if (typeof value === "number" || typeof value === "string") {
    return String(value)
  }

  return "value"
}

function getPayloadColor(payload: unknown) {
  const fill = getProperty(getObject(payload), "fill")

  return typeof fill === "string" ? fill : undefined
}

function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string
) {
  const payloadObject = getObject(payload)

  if (!payloadObject) {
    return undefined
  }

  const nestedPayload = getObject(getProperty(payloadObject, "payload"))
  const configLabelKey =
    getStringProperty(payloadObject, key) ??
    getStringProperty(nestedPayload, key) ??
    key

  return configLabelKey in config ? config[configLabelKey] : config[key]
}

function getObject(value: unknown): object | null {
  return typeof value === "object" && value !== null ? value : null
}

function getProperty(record: object | null, key: string) {
  return record ? Reflect.get(record, key) : undefined
}

function getStringProperty(record: object | null, key: string) {
  const value = getProperty(record, key)

  return typeof value === "string" ? value : undefined
}

export { getPayloadColor, getPayloadConfigFromPayload, getPayloadKey }
