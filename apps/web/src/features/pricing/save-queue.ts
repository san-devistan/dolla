import { toast } from "@workspace/ui/lib/toast"
import { useEffect, useRef, useState } from "react"

import {
  PRICING_AUTOSAVE_DELAY_MS,
  PRICING_AUTOSAVE_RETRY_DELAY_MS,
  getNormalizedDraftItems,
  getPricingItemsSnapshot,
  hasIncompleteDraftItem,
  type PricingDraftItem,
  type PricingSaveState,
} from "./items"

type PricingSaveQueueOptions = {
  initialItems: PricingDraftItem[]
  onItemsSaved: (items: PricingDraftItem[]) => void
  saveItems: (items: PricingDraftItem[]) => Promise<void>
}

function usePricingSaveQueue({
  initialItems,
  onItemsSaved,
  saveItems,
}: PricingSaveQueueOptions) {
  const [isSaving, setIsSaving] = useState(false)
  const [saveState, setSaveState] = useState<PricingSaveState>("idle")
  const latestDraftItemsRef = useRef(initialItems)
  const savedPricingSnapshotRef = useRef<string | null>(null)
  const saveTimerRef = useRef<number | null>(null)
  const isSavingRef = useRef(false)

  if (savedPricingSnapshotRef.current === null) {
    savedPricingSnapshotRef.current = getPricingItemsSnapshot(initialItems)
  }

  useEffect(() => () => clearSaveTimer(), [])

  function clearSaveTimer() {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
  }

  function scheduleSave(
    nextDraftItems: PricingDraftItem[],
    delay = PRICING_AUTOSAVE_DELAY_MS
  ) {
    latestDraftItemsRef.current = nextDraftItems
    clearSaveTimer()

    if (hasIncompleteDraftItem(nextDraftItems)) {
      setSaveState("incomplete")
      return
    }

    const nextItems = getNormalizedDraftItems(nextDraftItems)
    const nextSnapshot = getPricingItemsSnapshot(nextItems)

    if (nextSnapshot === savedPricingSnapshotRef.current) {
      setSaveState("idle")
      return
    }

    setSaveState(isSavingRef.current ? "saving" : "pending")
    saveTimerRef.current = window.setTimeout(() => {
      void flushSave()
    }, delay)
  }

  async function flushSave() {
    clearSaveTimer()

    if (isSavingRef.current) {
      scheduleSave(latestDraftItemsRef.current, PRICING_AUTOSAVE_RETRY_DELAY_MS)
      return
    }

    const draftItemsToSave = latestDraftItemsRef.current

    if (hasIncompleteDraftItem(draftItemsToSave)) {
      setSaveState("incomplete")
      return
    }

    const nextItems = getNormalizedDraftItems(draftItemsToSave)
    const nextSnapshot = getPricingItemsSnapshot(nextItems)

    if (nextSnapshot === savedPricingSnapshotRef.current) {
      setSaveState("idle")
      return
    }

    await saveItemsNow(nextItems, nextSnapshot)
  }

  async function saveItemsNow(nextItems: PricingDraftItem[], snapshot: string) {
    isSavingRef.current = true
    setIsSaving(true)
    setSaveState("saving")

    try {
      await saveItems(nextItems)
      savedPricingSnapshotRef.current = snapshot
      onItemsSaved(nextItems)
      setSaveState("saved")
    } catch (error) {
      setSaveState("error")
      toast.error(getErrorMessage(error))
    } finally {
      isSavingRef.current = false
      setIsSaving(false)
      queueFollowUpSaveIfNeeded()
    }
  }

  function queueFollowUpSaveIfNeeded() {
    const latestDraftItems = latestDraftItemsRef.current
    const latestItems = getNormalizedDraftItems(latestDraftItems)
    const latestSnapshot = getPricingItemsSnapshot(latestItems)

    if (
      !hasIncompleteDraftItem(latestDraftItems) &&
      latestSnapshot !== savedPricingSnapshotRef.current
    ) {
      scheduleSave(latestDraftItems, PRICING_AUTOSAVE_RETRY_DELAY_MS)
    }
  }

  return { isSaving, saveState, scheduleSave }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Action failed."
}

export { usePricingSaveQueue }
