import { toast } from "@workspace/ui/components/sonner"
import { useEffect, useRef, useState } from "react"

import {
  PRICING_AUTOSAVE_DELAY_MS,
  PRICING_AUTOSAVE_RETRY_DELAY_MS,
  getNormalizedDraftItems,
  getPricingItemsSignature,
  hasIncompleteDraftItem,
  type PricingDraftItem,
  type PricingSaveState,
} from "./pricing-items"

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
  const savedPricingSignatureRef = useRef(
    getPricingItemsSignature(initialItems)
  )
  const saveTimerRef = useRef<number | null>(null)
  const isSavingRef = useRef(false)

  useEffect(() => {
    clearSaveTimer()
    latestDraftItemsRef.current = initialItems
    savedPricingSignatureRef.current = getPricingItemsSignature(initialItems)
    isSavingRef.current = false
    setIsSaving(false)
    setSaveState("idle")
  }, [initialItems])

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
    const nextSignature = getPricingItemsSignature(nextItems)

    if (nextSignature === savedPricingSignatureRef.current) {
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
    const nextSignature = getPricingItemsSignature(nextItems)

    if (nextSignature === savedPricingSignatureRef.current) {
      setSaveState("idle")
      return
    }

    await saveItemsNow(nextItems, nextSignature)
  }

  async function saveItemsNow(
    nextItems: PricingDraftItem[],
    signature: string
  ) {
    isSavingRef.current = true
    setIsSaving(true)
    setSaveState("saving")

    try {
      await saveItems(nextItems)
      savedPricingSignatureRef.current = signature
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
    const latestSignature = getPricingItemsSignature(latestItems)

    if (
      !hasIncompleteDraftItem(latestDraftItems) &&
      latestSignature !== savedPricingSignatureRef.current
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
