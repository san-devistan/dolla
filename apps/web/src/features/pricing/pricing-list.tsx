import type { PricingItem } from "@/lib/cloudinary.server"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"
import { CheckIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { type ChangeEvent, useCallback } from "react"

import type { PricingDraftField, PricingDraftItem } from "./pricing-items"

type PricingAdminControls = {
  editingItemId: string | null
  isSaving: boolean
  onChangeItem: (
    itemId: string,
    field: PricingDraftField,
    value: string
  ) => void
  onEditItem: (itemId: string) => void
  onFinishEditing: (itemId: string) => void
  onRemoveItem: (itemId: string) => void
}

function PricingList({
  items,
  adminControls,
}: {
  items: PricingItem[]
  adminControls?: PricingAdminControls
}) {
  if (items.length === 0) {
    return (
      <p className="mt-10 py-5 text-base text-foreground md:text-lg">
        Tarifs sur demande
      </p>
    )
  }

  return (
    <ul className="mt-10">
      {items.map((item, index) => {
        const isEditing = adminControls?.editingItemId === item.id

        return isEditing && adminControls ? (
          <EditablePricingItem
            key={item.id}
            item={item}
            index={index}
            isSaving={adminControls.isSaving}
            onChangeItem={adminControls.onChangeItem}
            onFinishEditing={adminControls.onFinishEditing}
            onRemoveItem={adminControls.onRemoveItem}
          />
        ) : (
          <PricingListItem
            key={item.id}
            item={item}
            adminControls={adminControls}
          />
        )
      })}
    </ul>
  )
}

function PricingListItem({
  item,
  adminControls,
}: {
  item: PricingItem
  adminControls?: PricingAdminControls
}) {
  const handleEdit = useCallback(() => {
    adminControls?.onEditItem(item.id)
  }, [adminControls, item.id])
  const handleRemove = useCallback(() => {
    adminControls?.onRemoveItem(item.id)
  }, [adminControls, item.id])

  return (
    <li
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-5 gap-y-3 border-b border-black/20 py-4 text-base leading-snug last:border-b-0 md:text-lg",
        adminControls ? "grid-cols-[minmax(0,1fr)_auto_auto]" : ""
      )}
    >
      <PricingItemText item={item} />
      <span className="self-end text-right font-heading text-xl leading-none font-semibold tabular-nums md:text-2xl">
        {formatPricingPrice(item.price)}
      </span>
      {adminControls ? (
        <InlinePricingActions
          isSaving={adminControls.isSaving}
          onEdit={handleEdit}
          onRemove={handleRemove}
        />
      ) : null}
    </li>
  )
}

function PricingItemText({ item }: { item: PricingItem }) {
  return (
    <span className="min-w-0">
      <span className="block font-sans text-lg leading-tight md:text-xl">
        {item.name}
      </span>
      {item.description ? (
        <span className="mt-0.5 block font-sans text-xs leading-tight font-light text-muted-foreground md:text-sm">
          {item.description}
        </span>
      ) : null}
    </span>
  )
}

function EditablePricingItem({
  item,
  index,
  isSaving,
  onChangeItem,
  onFinishEditing,
  onRemoveItem,
}: {
  item: PricingDraftItem
  index: number
  isSaving: boolean
  onChangeItem: (
    itemId: string,
    field: PricingDraftField,
    value: string
  ) => void
  onFinishEditing: (itemId: string) => void
  onRemoveItem: (itemId: string) => void
}) {
  const handleNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChangeItem(item.id, "name", event.target.value)
    },
    [item.id, onChangeItem]
  )
  const handleDescriptionChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      onChangeItem(item.id, "description", event.target.value)
    },
    [item.id, onChangeItem]
  )
  const handlePriceChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChangeItem(item.id, "price", event.target.value)
    },
    [item.id, onChangeItem]
  )
  const handleFinishEditing = useCallback(() => {
    onFinishEditing(item.id)
  }, [item.id, onFinishEditing])
  const handleRemove = useCallback(() => {
    onRemoveItem(item.id)
  }, [item.id, onRemoveItem])

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_minmax(6.5rem,12rem)_auto] items-start gap-x-5 gap-y-3 border-b border-black/20 py-3 last:border-b-0">
      <div className="min-w-0 space-y-2">
        <Input
          aria-label={`Prestation ${index + 1}`}
          className="font-heading text-base md:text-lg"
          placeholder="Prestation"
          value={item.name}
          onChange={handleNameChange}
        />
        <Textarea
          aria-label={`Description ${index + 1}`}
          className="min-h-10 py-1 font-sans text-sm leading-snug text-muted-foreground md:text-sm"
          placeholder="Description"
          value={item.description}
          onChange={handleDescriptionChange}
        />
      </div>
      <Input
        aria-label={`Price ${index + 1}`}
        className="self-end text-right font-heading text-xl leading-none font-semibold tabular-nums md:text-2xl"
        placeholder="Prix"
        value={item.price}
        onChange={handlePriceChange}
      />
      <InlinePricingActions
        isEditing
        isSaving={isSaving}
        onEdit={handleFinishEditing}
        onRemove={handleRemove}
      />
    </li>
  )
}

function InlinePricingActions({
  isEditing = false,
  isSaving,
  onEdit,
  onRemove,
}: {
  isEditing?: boolean
  isSaving: boolean
  onEdit: () => void
  onRemove: () => void
}) {
  return (
    <span className="flex shrink-0 items-center gap-1 self-end">
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        disabled={isSaving}
        className="text-muted-foreground hover:text-foreground"
        onClick={onEdit}
      >
        {isEditing ? <CheckIcon /> : <PencilIcon />}
        <span className="sr-only">
          {isEditing ? "Finish editing prestation" : "Edit prestation"}
        </span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        disabled={isSaving}
        className="text-muted-foreground hover:text-destructive"
        onClick={onRemove}
      >
        <Trash2Icon />
        <span className="sr-only">Remove prestation</span>
      </Button>
    </span>
  )
}

function formatPricingPrice(price: string) {
  const trimmedPrice = price.trim()

  if (!trimmedPrice) {
    return ""
  }

  if (/[€$£¥]/.test(trimmedPrice)) {
    return trimmedPrice
  }

  return `${trimmedPrice} €`
}

export { PricingList }
export type { PricingAdminControls }
