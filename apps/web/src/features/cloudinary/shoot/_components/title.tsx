import { ConnectionNotice } from "@/features/cloudinary/media/_components/notices"
import { UploadPhotosButton } from "@/features/cloudinary/media/_components/upload-photos-button"
import { useStableCallback } from "@/features/cloudinary/shared/use-stable-callback"
import { DeleteShootDialog } from "@/features/cloudinary/shoot/_components/delete-dialog"
import { getMediaCategoryRoute } from "@/lib/admin-routes"
import type {
  CloudinaryConnection,
  CloudinaryFolder,
} from "@/lib/cloudinary.server"
import { toMediaRouteSegment } from "@/lib/media-route-segment"
import { Link } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { ArrowLeftIcon, CheckIcon, PencilIcon, XIcon } from "lucide-react"
import {
  type ChangeEvent,
  type FormEvent,
  type RefObject,
  useMemo,
} from "react"

type ShootTitleMode =
  | {
      type: "admin"
      canDeleteShoot: boolean
      canRenameShoot: boolean
      canUpload: boolean
      isBusy: boolean
      isRenamingShoot: boolean
      renameName: string
    }
  | {
      type: "public"
    }

function ShootTitle({
  category,
  connection,
  mode,
  shoot,
  uploadInputRef,
  onCancelRenamingShoot,
  onDeleteShoot,
  onRenameNameChange,
  onRenameShoot,
  onStartRenamingShoot,
  onUploadClick,
  onUploadFileChange,
}: {
  category: CloudinaryFolder
  connection: CloudinaryConnection
  mode: ShootTitleMode
  shoot: CloudinaryFolder
  uploadInputRef: RefObject<HTMLInputElement | null>
  onCancelRenamingShoot: () => void
  onDeleteShoot: () => void
  onRenameNameChange: (name: string) => void
  onRenameShoot: (event: FormEvent<HTMLFormElement>) => void
  onStartRenamingShoot: () => void
  onUploadClick: () => void
  onUploadFileChange: (event: ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <section className="mx-auto w-full max-w-[1540px] px-4 pb-4 sm:px-6 md:pb-8 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <ShootTitleHeading
          category={category}
          mode={mode}
          shoot={shoot}
          onCancelRenamingShoot={onCancelRenamingShoot}
          onRenameNameChange={onRenameNameChange}
          onRenameShoot={onRenameShoot}
        />
        {mode.type === "admin" ? (
          <ShootTitleActions
            mode={mode}
            shoot={shoot}
            uploadInputRef={uploadInputRef}
            onDeleteShoot={onDeleteShoot}
            onStartRenamingShoot={onStartRenamingShoot}
            onUploadClick={onUploadClick}
            onUploadFileChange={onUploadFileChange}
          />
        ) : null}
      </div>
      {mode.type === "admin" ? (
        <ConnectionNotice connection={connection} />
      ) : null}
    </section>
  )
}

function ShootTitleHeading({
  category,
  mode,
  shoot,
  onCancelRenamingShoot,
  onRenameNameChange,
  onRenameShoot,
}: {
  category: CloudinaryFolder
  mode: ShootTitleMode
  shoot: CloudinaryFolder
  onCancelRenamingShoot: () => void
  onRenameNameChange: (name: string) => void
  onRenameShoot: (event: FormEvent<HTMLFormElement>) => void
}) {
  const categoryRouteParams = useMemo(
    () => ({ category: toMediaRouteSegment(category.name) }),
    [category.name]
  )

  return (
    <div className="min-w-0">
      <LinkBackToCategory
        categoryName={category.name}
        categoryRouteParams={categoryRouteParams}
        isAdminMode={mode.type === "admin"}
      />
      {mode.type === "admin" && mode.isRenamingShoot ? (
        <ShootRenameForm
          mode={mode}
          onCancelRenamingShoot={onCancelRenamingShoot}
          onRenameNameChange={onRenameNameChange}
          onRenameShoot={onRenameShoot}
        />
      ) : (
        <h1 className="font-heading text-4xl leading-none tracking-normal md:text-6xl">
          {shoot.name}
        </h1>
      )}
    </div>
  )
}

function LinkBackToCategory({
  categoryName,
  categoryRouteParams,
  isAdminMode,
}: {
  categoryName: string
  categoryRouteParams: { category: string }
  isAdminMode: boolean
}) {
  return (
    <Link
      to={getMediaCategoryRoute(isAdminMode)}
      params={categoryRouteParams}
      aria-label={`Go back to ${categoryName}`}
      className="group/back hidden items-center gap-1.5 text-[0.6875rem] leading-none font-medium tracking-[0.08em] text-muted-foreground/80 lowercase transition-colors hover:text-brand md:inline-flex"
    >
      <ArrowLeftIcon
        aria-hidden="true"
        className="size-3.5 shrink-0 transition-transform group-hover/back:-translate-x-0.5"
      />
      <span>retour</span>
    </Link>
  )
}

function ShootRenameForm({
  mode,
  onCancelRenamingShoot,
  onRenameNameChange,
  onRenameShoot,
}: {
  mode: Extract<ShootTitleMode, { type: "admin" }>
  onCancelRenamingShoot: () => void
  onRenameNameChange: (name: string) => void
  onRenameShoot: (event: FormEvent<HTMLFormElement>) => void
}) {
  const handleRenameNameChange = useStableCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onRenameNameChange(event.target.value)
    }
  )

  return (
    <form
      className="flex max-w-3xl items-center gap-3"
      onSubmit={onRenameShoot}
    >
      <Input
        aria-label="Shoot folder name"
        value={mode.renameName}
        className="h-auto border-x-0 border-t-0 py-0 font-heading text-4xl leading-none tracking-normal md:text-6xl"
        disabled={!mode.canRenameShoot || mode.isBusy}
        onChange={handleRenameNameChange}
      />
      <Button
        type="submit"
        size="icon"
        disabled={
          !mode.canRenameShoot || mode.isBusy || mode.renameName.trim() === ""
        }
      >
        <CheckIcon />
        <span className="sr-only">Save shoot name</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={mode.isBusy}
        onClick={onCancelRenamingShoot}
      >
        <XIcon />
        <span className="sr-only">Cancel shoot rename</span>
      </Button>
    </form>
  )
}

function ShootTitleActions({
  mode,
  shoot,
  uploadInputRef,
  onDeleteShoot,
  onStartRenamingShoot,
  onUploadClick,
  onUploadFileChange,
}: {
  mode: Extract<ShootTitleMode, { type: "admin" }>
  shoot: CloudinaryFolder
  uploadInputRef: RefObject<HTMLInputElement | null>
  onDeleteShoot: () => void
  onStartRenamingShoot: () => void
  onUploadClick: () => void
  onUploadFileChange: (event: ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant={mode.isRenamingShoot ? "secondary" : "outline"}
        size="icon-sm"
        disabled={!mode.canRenameShoot || mode.isBusy}
        aria-pressed={mode.isRenamingShoot}
        onClick={onStartRenamingShoot}
      >
        <PencilIcon />
        <span className="sr-only">Edit shoot name</span>
      </Button>
      <UploadPhotosButton
        canUpload={mode.canUpload}
        isBusy={mode.isBusy}
        uploadInputRef={uploadInputRef}
        onUploadClick={onUploadClick}
        onUploadFileChange={onUploadFileChange}
      />
      <DeleteShootDialog
        canDeleteShoot={mode.canDeleteShoot}
        isBusy={mode.isBusy}
        shoot={shoot}
        onDeleteShoot={onDeleteShoot}
      />
    </div>
  )
}

export { ShootTitle }
export type { ShootTitleMode }
