import { GalleryHeader } from "@/features/cloudinary/gallery-header"
import type { CloudinaryPricing } from "@/lib/cloudinary.server"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { AlertTriangleIcon, PlusIcon } from "lucide-react"
import { useMemo } from "react"

import { getPricingSaveStatusLabel } from "./pricing-items"
import { PricingList } from "./pricing-list"
import { usePricingAutosave } from "./use-pricing-autosave"

function PricingPage({
  initialPricing,
  isAdminMode,
}: {
  initialPricing: CloudinaryPricing
  isAdminMode: boolean
}) {
  const {
    draftItems,
    editingItemId,
    handleAddItem,
    handleChangeItem,
    handleEditItem,
    handleFinishEditing,
    handleRemoveItem,
    isSaving,
    pricing,
    saveState,
  } = usePricingAutosave(initialPricing)
  const adminControls = useMemo(
    () =>
      isAdminMode
        ? {
            editingItemId,
            isSaving,
            onChangeItem: handleChangeItem,
            onEditItem: handleEditItem,
            onFinishEditing: handleFinishEditing,
            onRemoveItem: handleRemoveItem,
          }
        : undefined,
    [
      editingItemId,
      handleChangeItem,
      handleEditItem,
      handleFinishEditing,
      handleRemoveItem,
      isAdminMode,
      isSaving,
    ]
  )

  return (
    <main className="flex min-h-[90svh] flex-col bg-background text-foreground">
      <GalleryHeader
        categories={pricing.categories}
        isAdminMode={isAdminMode}
      />
      <section className="mx-auto flex w-full max-w-[980px] flex-1 flex-col justify-center px-4 py-10 font-heading md:px-8">
        <h1 className="text-xl font-semibold tracking-[0.1em] uppercase md:text-3xl">
          Tarifs
        </h1>
        <PricingList
          items={isAdminMode ? draftItems : pricing.items}
          adminControls={adminControls}
        />
        {isAdminMode ? (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSaving}
              onClick={handleAddItem}
            >
              <PlusIcon data-icon="inline-start" />
              Add
            </Button>
            <PricingSaveStatus state={saveState} />
          </div>
        ) : null}
        {isAdminMode && pricing.connection.error ? (
          <p className="mt-6 flex items-center gap-2 text-xs text-destructive">
            <AlertTriangleIcon className="size-3.5" />
            {pricing.connection.error}
          </p>
        ) : null}
      </section>
    </main>
  )
}

function PricingSaveStatus({
  state,
}: {
  state: ReturnType<typeof usePricingAutosave>["saveState"]
}) {
  const label = getPricingSaveStatusLabel(state)

  if (!label) {
    return null
  }

  return (
    <p
      aria-live="polite"
      className={cn(
        "font-sans text-xs text-muted-foreground",
        state === "error" || state === "incomplete" ? "text-destructive" : ""
      )}
    >
      {label}
    </p>
  )
}

export { PricingPage }
