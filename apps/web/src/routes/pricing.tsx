import {
  getCloudinaryPricingFn,
  setCloudinaryPricingItemsFn,
} from "@/features/cloudinary/cloudinary.functions"
import { GalleryHeader } from "@/features/cloudinary/gallery-header"
import type { CloudinaryPricing, PricingItem } from "@/lib/cloudinary.server"
import {
  isMediaAdminMode,
  validateMediaAdminSearch,
} from "@/lib/media-admin-mode"
import { createFileRoute } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { toast } from "@workspace/ui/components/sonner"
import { AlertTriangleIcon, PlusIcon, SaveIcon, Trash2Icon } from "lucide-react"
import { type FormEvent, useEffect, useState } from "react"

export const Route = createFileRoute("/pricing")({
  validateSearch: validateMediaAdminSearch,
  loader: () => getCloudinaryPricingFn(),
  head: () => ({
    meta: [
      {
        title: "Tarifs | Dolla Shashin",
      },
    ],
  }),
  component: PricingPage,
})

type PricingDraftItem = PricingItem

function PricingPage() {
  const initialPricing = Route.useLoaderData()
  const search = Route.useSearch()
  const isAdminMode = isMediaAdminMode(search)
  const [pricing, setPricing] = useState<CloudinaryPricing>(initialPricing)
  const [draftItems, setDraftItems] = useState(() =>
    getEditablePricingItems(initialPricing.items)
  )
  const [isBusy, setIsBusy] = useState(false)

  const getPricing = useServerFn(getCloudinaryPricingFn)
  const setPricingItems = useServerFn(setCloudinaryPricingItemsFn)

  useEffect(() => {
    setPricing(initialPricing)
    setDraftItems(getEditablePricingItems(initialPricing.items))
    setIsBusy(false)
  }, [initialPricing])

  function handleSavePricing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void savePricing()
  }

  async function savePricing() {
    const nextItems = getNormalizedDraftItems(draftItems)

    if (hasIncompleteDraftItem(draftItems)) {
      toast.error("Add a prestation name and price for each row.")
      return
    }

    setIsBusy(true)

    try {
      await setPricingItems({ data: { items: nextItems } })

      const nextPricing = await getPricing()

      setPricing(nextPricing)
      setDraftItems(getEditablePricingItems(nextPricing.items))
      toast.success("Pricing page saved")
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <main className="min-h-svh bg-background text-foreground">
      <GalleryHeader
        categories={pricing.categories}
        isAdminMode={isAdminMode}
      />
      <section className="mx-auto w-full max-w-[980px] px-4 pt-2 pb-14 font-heading md:px-8 md:pt-6">
        <h1 className="text-xl font-semibold tracking-[0.1em] uppercase md:text-3xl">
          Tarifs
        </h1>
        {isAdminMode ? (
          <PricingEditor
            draftItems={draftItems}
            isBusy={isBusy}
            onAddItem={() =>
              setDraftItems((items) => [...items, createDraftPricingItem()])
            }
            onChangeItem={(itemId, field, value) =>
              setDraftItems((items) =>
                items.map((item) =>
                  item.id === itemId ? { ...item, [field]: value } : item
                )
              )
            }
            onRemoveItem={(itemId) =>
              setDraftItems((items) =>
                getEditablePricingItems(
                  items.filter((item) => item.id !== itemId)
                )
              )
            }
            onSave={handleSavePricing}
          />
        ) : (
          <PricingList items={pricing.items} />
        )}
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

function PricingList({ items }: { items: PricingItem[] }) {
  if (items.length === 0) {
    return (
      <p className="mt-10 border-y border-black py-5 text-base text-foreground md:text-lg">
        Tarifs sur demande
      </p>
    )
  }

  return (
    <ul className="mt-10 border-y border-black">
      {items.map((item) => (
        <li
          key={item.id}
          className="grid grid-cols-[minmax(0,1fr)_auto] gap-5 border-b border-black/20 py-4 text-base leading-snug last:border-b-0 md:text-lg"
        >
          <span className="min-w-0">{item.name}</span>
          <span className="shrink-0 text-right tabular-nums">{item.price}</span>
        </li>
      ))}
    </ul>
  )
}

function PricingEditor({
  draftItems,
  isBusy,
  onAddItem,
  onChangeItem,
  onRemoveItem,
  onSave,
}: {
  draftItems: PricingDraftItem[]
  isBusy: boolean
  onAddItem: () => void
  onChangeItem: (itemId: string, field: "name" | "price", value: string) => void
  onRemoveItem: (itemId: string) => void
  onSave: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form className="mt-8" onSubmit={onSave}>
      <div className="space-y-3">
        {draftItems.map((item, index) => (
          <div
            key={item.id}
            className="grid grid-cols-[minmax(0,1fr)_minmax(7rem,13rem)_auto] items-center gap-3 border-b border-black/20 py-2"
          >
            <Input
              aria-label={`Prestation ${index + 1}`}
              className="font-heading text-base md:text-lg"
              disabled={isBusy}
              placeholder="Prestation"
              value={item.name}
              onChange={(event) =>
                onChangeItem(item.id, "name", event.target.value)
              }
            />
            <Input
              aria-label={`Price ${index + 1}`}
              className="font-heading text-base md:text-lg"
              disabled={isBusy}
              placeholder="Prix"
              value={item.price}
              onChange={(event) =>
                onChangeItem(item.id, "price", event.target.value)
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={isBusy}
              onClick={() => onRemoveItem(item.id)}
            >
              <Trash2Icon />
              <span className="sr-only">Remove prestation</span>
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isBusy}
          onClick={onAddItem}
        >
          <PlusIcon data-icon="inline-start" />
          Add
        </Button>
        <Button type="submit" size="sm" disabled={isBusy}>
          <SaveIcon data-icon="inline-start" />
          Save
        </Button>
      </div>
    </form>
  )
}

function getEditablePricingItems(items: PricingItem[]) {
  return items.length > 0 ? items.map((item) => ({ ...item })) : [EMPTY_ITEM]
}

function createDraftPricingItem() {
  return {
    id: `pricing-draft-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "",
    price: "",
  }
}

function getNormalizedDraftItems(items: PricingDraftItem[]) {
  return items.flatMap((item) => {
    const name = item.name.trim()
    const price = item.price.trim()

    if (!name && !price) {
      return []
    }

    return [
      {
        id: item.id,
        name,
        price,
      },
    ]
  })
}

function hasIncompleteDraftItem(items: PricingDraftItem[]) {
  return items.some((item) => {
    const hasName = Boolean(item.name.trim())
    const hasPrice = Boolean(item.price.trim())

    return hasName !== hasPrice
  })
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Action failed."
}

const EMPTY_ITEM = {
  id: "pricing-draft-empty",
  name: "",
  price: "",
} satisfies PricingDraftItem
