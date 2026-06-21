import { getInlineCreditText } from "@/features/cloudinary/media/_lib/shoot-gallery-utils"
import { useStableCallback } from "@/features/cloudinary/shared/use-stable-callback"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { PencilIcon } from "lucide-react"
import type { ChangeEvent, FormEvent } from "react"

type ShootCreditsMode =
  | {
      type: "admin"
      canEditCredits: boolean
      creditsDraft: string
      isBusy: boolean
      isEditingCredits: boolean
    }
  | {
      type: "public"
    }

function ShootCredits({
  credits,
  mode,
  onCancelEditingCredits,
  onCreditsDraftChange,
  onSaveCredits,
  onStartEditingCredits,
}: {
  credits: string
  mode: ShootCreditsMode
  onCancelEditingCredits: () => void
  onCreditsDraftChange: (credits: string) => void
  onSaveCredits: (event: FormEvent<HTMLFormElement>) => void
  onStartEditingCredits: () => void
}) {
  const creditText = getInlineCreditText(credits)
  const hasCredits = creditText.length > 0
  const shouldShowEditor =
    mode.type === "admin" && (mode.isEditingCredits || !hasCredits)

  if (mode.type === "public" && !hasCredits) {
    return null
  }

  return (
    <section className="mx-auto w-full max-w-[1540px] px-4 pb-6 sm:px-6 lg:px-8">
      {shouldShowEditor ? (
        <ShootCreditsForm
          mode={mode}
          hasCredits={hasCredits}
          onCancelEditingCredits={onCancelEditingCredits}
          onCreditsDraftChange={onCreditsDraftChange}
          onSaveCredits={onSaveCredits}
        />
      ) : hasCredits ? (
        <ShootCreditsText
          creditText={creditText}
          mode={mode}
          onStartEditingCredits={onStartEditingCredits}
        />
      ) : null}
    </section>
  )
}

function ShootCreditsForm({
  hasCredits,
  mode,
  onCancelEditingCredits,
  onCreditsDraftChange,
  onSaveCredits,
}: {
  hasCredits: boolean
  mode: Extract<ShootCreditsMode, { type: "admin" }>
  onCancelEditingCredits: () => void
  onCreditsDraftChange: (credits: string) => void
  onSaveCredits: (event: FormEvent<HTMLFormElement>) => void
}) {
  const handleCreditsDraftChange = useStableCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onCreditsDraftChange(event.target.value)
    }
  )

  return (
    <form
      className="font-heading text-[0.9375rem] leading-tight text-muted-foreground"
      onSubmit={onSaveCredits}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label
          htmlFor="shoot-credits"
          className="shrink-0 font-semibold text-muted-foreground"
        >
          Crédits :
        </label>
        <Input
          id="shoot-credits"
          aria-label="Shoot credits"
          value={mode.creditsDraft}
          disabled={!mode.canEditCredits || mode.isBusy}
          maxLength={2000}
          placeholder="@moopscreamlabel @aaainaaa @inezcorreiaa"
          className="h-7 min-w-0 flex-1 rounded-none border-x-0 border-t-0 border-b-muted-foreground/25 bg-transparent p-0 font-heading text-[0.9375rem] text-muted-foreground shadow-none placeholder:text-muted-foreground/45 focus-visible:border-b-muted-foreground focus-visible:ring-0 md:text-[0.9375rem]"
          onChange={handleCreditsDraftChange}
        />
        <ShootCreditsFormActions
          hasCredits={hasCredits}
          isBusy={mode.isBusy}
          canEditCredits={mode.canEditCredits}
          onCancelEditingCredits={onCancelEditingCredits}
        />
      </div>
    </form>
  )
}

function ShootCreditsFormActions({
  canEditCredits,
  hasCredits,
  isBusy,
  onCancelEditingCredits,
}: {
  canEditCredits: boolean
  hasCredits: boolean
  isBusy: boolean
  onCancelEditingCredits: () => void
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        type="submit"
        size="sm"
        disabled={!canEditCredits || isBusy}
        className="h-7 px-3 text-[0.6875rem]"
      >
        Save
      </Button>
      {hasCredits ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isBusy}
          className="h-7 px-1.5 text-[0.6875rem] text-muted-foreground hover:bg-transparent hover:text-foreground"
          onClick={onCancelEditingCredits}
        >
          Cancel
        </Button>
      ) : null}
    </div>
  )
}

function ShootCreditsText({
  creditText,
  mode,
  onStartEditingCredits,
}: {
  creditText: string
  mode: ShootCreditsMode
  onStartEditingCredits: () => void
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 font-heading text-[0.9375rem] leading-tight text-muted-foreground">
      <p className="min-w-0">
        <span className="font-semibold">Crédits :</span>{" "}
        <span>{creditText}</span>
      </p>
      {mode.type === "admin" ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!mode.canEditCredits || mode.isBusy}
          className="h-auto px-1 py-0 font-sans text-[0.6875rem] leading-none text-muted-foreground hover:bg-transparent hover:text-foreground"
          onClick={onStartEditingCredits}
        >
          <PencilIcon data-icon="inline-start" />
          Edit
        </Button>
      ) : null}
    </div>
  )
}

export { ShootCredits }
export type { ShootCreditsMode }
