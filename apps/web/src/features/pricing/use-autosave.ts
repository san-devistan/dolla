import { setCloudinaryPricingItemsFn } from "@/features/cloudinary/data/functions"
import type { CloudinaryPricing } from "@/lib/cloudinary.server"
import { useServerFn } from "@tanstack/react-start"
import { useState } from "react"

import {
  createDraftPricingItem,
  getEditablePricingItems,
  hasIncompleteDraftItem,
  type NormalizedPricingItems,
  type PricingDraftField,
} from "./items"
import { usePricingSaveQueue } from "./save-queue"

function usePricingAutosave(initialPricing: CloudinaryPricing) {
  const [pricing, setPricing] = useState<CloudinaryPricing>(initialPricing)
  const [draftItems, setDraftItems] = useState(() =>
    getEditablePricingItems(initialPricing.items)
  )
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const setPricingItems = useServerFn(setCloudinaryPricingItemsFn)
  const { isSaving, saveState, scheduleSave } = usePricingSaveQueue({
    initialItems: initialPricing.items,
    onItemsSaved: updateSavedPricingItems,
    saveItems: savePricingItems,
  })

  async function savePricingItems(items: NormalizedPricingItems) {
    await setPricingItems({ data: { items } })
  }

  function updateSavedPricingItems(items: NormalizedPricingItems) {
    setPricing((currentPricing) => ({ ...currentPricing, items }))
  }

  function handleAddItem() {
    const newItem = createDraftPricingItem()
    const nextItems = [...draftItems, newItem]

    setDraftItems(nextItems)
    setEditingItemId(newItem.id)
  }

  function handleChangeItem(
    itemId: string,
    field: PricingDraftField,
    value: string
  ) {
    const nextItems = draftItems.map((item) =>
      item.id === itemId ? { ...item, [field]: value } : item
    )

    setDraftItems(nextItems)
    scheduleSave(nextItems)
  }

  function handleRemoveItem(itemId: string) {
    const nextItems = draftItems.filter((item) => item.id !== itemId)

    setDraftItems(nextItems)
    setEditingItemId((currentItemId) =>
      currentItemId === itemId ? null : currentItemId
    )
    scheduleSave(nextItems, 0)
  }

  function handleFinishEditing(itemId: string) {
    const item = draftItems.find((draftItem) => draftItem.id === itemId)

    if (item && hasIncompleteDraftItem([item])) {
      scheduleSave(draftItems, 0)
      return
    }

    setEditingItemId(null)
    scheduleSave(draftItems, 0)
  }

  return {
    draftItems,
    editingItemId,
    handleAddItem,
    handleChangeItem,
    handleEditItem: setEditingItemId,
    handleFinishEditing,
    handleRemoveItem,
    isSaving,
    pricing,
    saveState,
  }
}

export { usePricingAutosave }
