import {
  CategoryDescription,
  type CategoryDescriptionMode,
  CategoryEditActions,
} from "@/features/cloudinary/category/_components/description"
import { ConnectionNotice } from "@/features/cloudinary/media/_components/notices"
import {
  PhotoMasonry,
  type PhotoMasonryHandlers,
  type PhotoMasonryMode,
} from "@/features/cloudinary/media/_components/photo-masonry"
import { UploadPhotosButton } from "@/features/cloudinary/media/_components/upload-photos-button"
import type {
  AssetDropPosition,
  AssetDropTarget,
} from "@/features/cloudinary/media/_lib/asset-layout"
import type {
  CloudinaryAsset,
  CloudinaryConnection,
  CloudinaryFolder,
} from "@/lib/cloudinary.server"
import { Button } from "@workspace/ui/components/button"
import { PencilIcon } from "lucide-react"
import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type RefObject,
  useMemo,
} from "react"

type DirectCategoryPhotoSurfaceMode =
  | {
      type: "admin"
      canEditDescription: boolean
      canOrganizeAssets: boolean
      canUpload: boolean
      descriptionDraft: string
      draggingAssetId: string | null
      dropTarget: AssetDropTarget | null
      isBusy: boolean
      isEditingCategory: boolean
      selectedAssetIds: Set<string>
      uploadInputRef: RefObject<HTMLInputElement | null>
    }
  | {
      type: "public"
      descriptionDraft: string
    }

type DirectCategoryPhotoSurfaceHandlers = {
  onAssetDragEnd: () => void
  onAssetDragOver: (event: DragEvent<HTMLElement>, assetId: string) => void
  onAssetDragStart: (event: DragEvent<HTMLElement>, assetId: string) => void
  onAssetDrop: (event: DragEvent<HTMLElement>, assetId: string) => void
  onAssetInsertionDragOver: (
    event: DragEvent<HTMLElement>,
    assetId: string,
    position: AssetDropPosition
  ) => void
  onAssetSelectionChange: (assetId: string, selected?: boolean) => void
  onCancelCategoryEdit: () => void
  onColumnDragOver: (event: DragEvent<HTMLElement>, columnIndex: number) => void
  onColumnDrop: (event: DragEvent<HTMLElement>, columnIndex: number) => void
  onDescriptionDraftChange: (description: string) => void
  onOpenAsset: (assetId: string) => void
  onSaveCategoryEdit: (event: FormEvent<HTMLFormElement>) => void
  onStartCategoryEdit: () => void
  onToggleHomeCarouselAsset: (assetId: string, selected: boolean) => void
  onUploadClick: () => void
  onUploadFileChange: (event: ChangeEvent<HTMLInputElement>) => void
}

function DirectCategoryPhotoSurface({
  assets,
  category,
  columnCount,
  connection,
  handlers,
  mode,
}: {
  assets: CloudinaryAsset[]
  category: CloudinaryFolder
  columnCount: number
  connection: CloudinaryConnection
  handlers: DirectCategoryPhotoSurfaceHandlers
  mode: DirectCategoryPhotoSurfaceMode
}) {
  const photoMasonryMode = useDirectCategoryPhotoMasonryMode(mode)
  const photoMasonryHandlers = useDirectCategoryPhotoMasonryHandlers(handlers)

  return (
    <>
      <section className="mx-auto w-full max-w-[1540px] px-4 pb-4 sm:px-6 md:pt-0 md:pb-8 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <DirectCategoryHeading
            category={category}
            handlers={handlers}
            mode={mode}
          />
          {mode.type === "admin" ? (
            <DirectCategoryActions handlers={handlers} mode={mode} />
          ) : null}
        </div>
        {mode.type === "admin" ? (
          <ConnectionNotice connection={connection} />
        ) : null}
      </section>
      <PhotoMasonry
        assets={assets}
        columnCount={columnCount}
        emptyMessage="No photos in this category yet."
        handlers={photoMasonryHandlers}
        mode={photoMasonryMode}
        shoot={category}
      />
    </>
  )
}

function DirectCategoryHeading({
  category,
  handlers,
  mode,
}: {
  category: CloudinaryFolder
  handlers: DirectCategoryPhotoSurfaceHandlers
  mode: DirectCategoryPhotoSurfaceMode
}) {
  const descriptionMode = getCategoryDescriptionMode(mode)

  if (mode.type === "admin" && mode.isEditingCategory) {
    return (
      <form
        className="grid w-full gap-3"
        onSubmit={handlers.onSaveCategoryEdit}
      >
        <div className="flex w-full max-w-3xl items-center gap-3">
          <h1 className="min-w-0 flex-1 font-heading text-4xl leading-none tracking-normal md:text-6xl">
            {category.name}
          </h1>
          <CategoryEditActions
            canSave={mode.canEditDescription && !mode.isBusy}
            isBusy={mode.isBusy}
            onCancel={handlers.onCancelCategoryEdit}
          />
        </div>
        <CategoryDescription
          category={category}
          descriptionDraft={mode.descriptionDraft}
          mode={descriptionMode}
          onCancelEdit={handlers.onCancelCategoryEdit}
          onDescriptionDraftChange={handlers.onDescriptionDraftChange}
        />
      </form>
    )
  }

  return (
    <div className="min-w-0 flex-1">
      <h1 className="font-heading text-4xl leading-none tracking-normal md:text-6xl">
        {category.name}
      </h1>
      <CategoryDescription
        category={category}
        descriptionDraft={mode.descriptionDraft}
        mode={descriptionMode}
        onCancelEdit={handlers.onCancelCategoryEdit}
        onDescriptionDraftChange={handlers.onDescriptionDraftChange}
      />
    </div>
  )
}

function DirectCategoryActions({
  handlers,
  mode,
}: {
  handlers: DirectCategoryPhotoSurfaceHandlers
  mode: Extract<DirectCategoryPhotoSurfaceMode, { type: "admin" }>
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant={mode.isEditingCategory ? "secondary" : "outline"}
        size="icon-sm"
        disabled={!mode.canEditDescription || mode.isBusy}
        aria-pressed={mode.isEditingCategory}
        onClick={handlers.onStartCategoryEdit}
      >
        <PencilIcon />
        <span className="sr-only">Edit category</span>
      </Button>
      <UploadPhotosButton
        canUpload={mode.canUpload}
        isBusy={mode.isBusy}
        uploadInputRef={mode.uploadInputRef}
        onUploadClick={handlers.onUploadClick}
        onUploadFileChange={handlers.onUploadFileChange}
      />
    </div>
  )
}

function useDirectCategoryPhotoMasonryMode(
  mode: DirectCategoryPhotoSurfaceMode
) {
  return useMemo<PhotoMasonryMode>(
    () =>
      mode.type === "admin"
        ? {
            type: "admin",
            canOrganizeAssets: mode.canOrganizeAssets,
            draggingAssetId: mode.draggingAssetId,
            dropTarget: mode.dropTarget,
            isBusy: mode.isBusy,
            selectedAssetIds: mode.selectedAssetIds,
            showCoverControl: false,
          }
        : { type: "public" },
    [mode]
  )
}

function useDirectCategoryPhotoMasonryHandlers(
  handlers: DirectCategoryPhotoSurfaceHandlers
) {
  return useMemo<PhotoMasonryHandlers>(
    () => ({
      onAssetDragEnd: handlers.onAssetDragEnd,
      onAssetDragOver: handlers.onAssetDragOver,
      onAssetDragStart: handlers.onAssetDragStart,
      onAssetDrop: handlers.onAssetDrop,
      onAssetInsertionDragOver: handlers.onAssetInsertionDragOver,
      onAssetSelectionChange: handlers.onAssetSelectionChange,
      onColumnDragOver: handlers.onColumnDragOver,
      onColumnDrop: handlers.onColumnDrop,
      onOpenAsset: handlers.onOpenAsset,
      onSetShootCover: ignoreShootCoverChange,
      onToggleHomeCarouselAsset: handlers.onToggleHomeCarouselAsset,
    }),
    [handlers]
  )
}

function getCategoryDescriptionMode(
  mode: DirectCategoryPhotoSurfaceMode
): CategoryDescriptionMode {
  if (mode.type === "public") {
    return { type: "public" }
  }

  return {
    type: "admin",
    canEditDescription: mode.canEditDescription,
    canSaveEdit: mode.canEditDescription && !mode.isBusy,
    isBusy: mode.isBusy,
    isEditing: mode.isEditingCategory,
  }
}

function ignoreShootCoverChange() {}

export { DirectCategoryPhotoSurface }
export type {
  DirectCategoryPhotoSurfaceHandlers,
  DirectCategoryPhotoSurfaceMode,
}
