import type { PricingItem } from "@/lib/cloudinary.server"

type PricingDraftItem = PricingItem
type PricingDraftField = "name" | "description" | "price"
type PricingSaveState =
  | "idle"
  | "pending"
  | "saving"
  | "saved"
  | "incomplete"
  | "error"

const PRICING_AUTOSAVE_DELAY_MS = 650
const PRICING_AUTOSAVE_RETRY_DELAY_MS = 250

function getEditablePricingItems(items: PricingItem[]) {
  return items.map((item) => ({ ...item }))
}

function createDraftPricingItem() {
  return {
    id: `pricing-draft-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "",
    description: "",
    price: "",
  } satisfies PricingDraftItem
}

function getNormalizedDraftItems(items: PricingDraftItem[]) {
  return items.flatMap((item) => {
    const name = item.name.trim()
    const description = item.description.trim()
    const price = item.price.trim()

    if (!name && !description && !price) {
      return []
    }

    return [{ id: item.id, name, description, price }]
  })
}

type NormalizedPricingItems = ReturnType<typeof getNormalizedDraftItems>

function hasIncompleteDraftItem(items: PricingDraftItem[]) {
  return items.some((item) => {
    const hasName = Boolean(item.name.trim())
    const hasDescription = Boolean(item.description.trim())
    const hasPrice = Boolean(item.price.trim())

    return (hasName || hasDescription || hasPrice) && (!hasName || !hasPrice)
  })
}

function getPricingItemsSnapshot(items: PricingItem[]) {
  return JSON.stringify(getNormalizedDraftItems(items))
}

function getPricingSaveStatusLabel(state: PricingSaveState) {
  if (state === "pending" || state === "saving") {
    return "Saving..."
  }

  if (state === "saved") {
    return "Saved"
  }

  if (state === "incomplete") {
    return "Add a prestation name and price."
  }

  if (state === "error") {
    return "Changes could not be saved."
  }

  return null
}

export {
  PRICING_AUTOSAVE_DELAY_MS,
  PRICING_AUTOSAVE_RETRY_DELAY_MS,
  createDraftPricingItem,
  getEditablePricingItems,
  getNormalizedDraftItems,
  getPricingItemsSnapshot,
  getPricingSaveStatusLabel,
  hasIncompleteDraftItem,
}
export type {
  NormalizedPricingItems,
  PricingDraftField,
  PricingDraftItem,
  PricingSaveState,
}
