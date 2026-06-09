import {
  deleteCloudinaryFolderFn,
  deleteCloudinaryShootAssetsFn,
  getCloudinaryShootFn,
  renameCloudinaryFolderFn,
  reorderCloudinaryAssetsFn,
  setCloudinaryShootCreditsFn,
  setCloudinaryShootCoverFn,
} from "@/features/cloudinary/cloudinary.functions"
import {
  MASONRY_IMAGE_SIZES,
  getImageLoadingProps,
} from "@/features/cloudinary/image-delivery"
import { ProgressiveImage } from "@/features/cloudinary/progressive-image"
import type {
  CloudinaryAsset,
  CloudinaryConnection,
  CloudinaryFolder,
  CloudinaryShootPage,
} from "@/lib/cloudinary.server"
import {
  getMediaAdminSearch,
  isMediaAdminMode,
  validateMediaAdminSearch,
} from "@/lib/media-admin-mode"
import { toMediaRouteSegment } from "@/lib/media-route-segment"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Input } from "@workspace/ui/components/input"
import { toast } from "@workspace/ui/components/sonner"
import { cn } from "@workspace/ui/lib/utils"
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
  ImageIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  StarIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type MouseEvent,
  type RefObject,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react"

type AssetDropPosition = "before" | "after"
type AssetDropTarget = {
  assetId: string
  position: AssetDropPosition
}

export const Route = createFileRoute("/$category/$shoot")({
  validateSearch: validateMediaAdminSearch,
  loader: ({ params }) =>
    getCloudinaryShootFn({
      data: {
        categoryName: params.category,
        shootName: params.shoot,
      },
    }),
  component: ShootPage,
})

function ShootPage() {
  const initialShootPage = Route.useLoaderData()
  const params = Route.useParams()
  const search = Route.useSearch()
  const isAdminMode = isMediaAdminMode(search)
  const navigate = useNavigate()
  const [shootPage, setShootPage] = useState(initialShootPage)
  const [renameName, setRenameName] = useState(
    initialShootPage.shoot?.name || ""
  )
  const [creditsDraft, setCreditsDraft] = useState(
    initialShootPage.shoot?.credits || ""
  )
  const [isRenamingShoot, setIsRenamingShoot] = useState(false)
  const [isEditingCredits, setIsEditingCredits] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(
    () => new Set()
  )
  const [draggingAssetId, setDraggingAssetId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<AssetDropTarget | null>(null)
  const [activeViewerAssetId, setActiveViewerAssetId] = useState<string | null>(
    null
  )
  const uploadInputRef = useRef<HTMLInputElement>(null)

  const getShoot = useServerFn(getCloudinaryShootFn)
  const renameFolder = useServerFn(renameCloudinaryFolderFn)
  const deleteFolder = useServerFn(deleteCloudinaryFolderFn)
  const deleteShootAssets = useServerFn(deleteCloudinaryShootAssetsFn)
  const reorderAssets = useServerFn(reorderCloudinaryAssetsFn)
  const setShootCover = useServerFn(setCloudinaryShootCoverFn)
  const setShootCredits = useServerFn(setCloudinaryShootCreditsFn)
  const selectedCategory = shootPage.category || undefined
  const selectedShoot = shootPage.shoot || undefined
  const canMutate =
    shootPage.connection.configured && !shootPage.connection.error && !isBusy
  const canUpload = canMutate && Boolean(selectedShoot)
  const canOrganizeAssets = canMutate && Boolean(selectedShoot)
  const canRenameShoot = canMutate && Boolean(selectedShoot)
  const canEditCredits = canMutate && Boolean(selectedShoot)
  const canDeleteSelectedAssets = canMutate && selectedAssetIds.size > 0

  useEffect(() => {
    setShootPage(initialShootPage)
    setRenameName(initialShootPage.shoot?.name || "")
    setCreditsDraft(initialShootPage.shoot?.credits || "")
    setIsRenamingShoot(false)
    setIsEditingCredits(false)
    setSelectedAssetIds(new Set())
    setDraggingAssetId(null)
    setDropTarget(null)
    setActiveViewerAssetId(null)
  }, [initialShootPage])

  if (!selectedCategory || !selectedShoot) {
    return (
      <MissingShoot categoryName={params.category} shootName={params.shoot} />
    )
  }

  const categoryFolder = selectedCategory
  const shootFolder = selectedShoot

  function refreshShoot() {
    void runShootAction(
      () =>
        getShoot({
          data: {
            categoryName: categoryFolder.name,
            refresh: true,
            shootName: shootFolder.name,
          },
        }),
      "Media refreshed"
    )
  }

  function handleUploadClick() {
    uploadInputRef.current?.click()
  }

  function handleUploadFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])

    if (files.length === 0) {
      return
    }

    void uploadSelectedFiles(files)
  }

  async function uploadSelectedFiles(files: File[]) {
    if (files.length === 0) {
      toast.error("Choose at least one file to upload.")
      return
    }

    const formData = new FormData()

    formData.set("folderPath", shootFolder.path)

    for (const file of files) {
      formData.append("files", file)
    }

    setIsBusy(true)

    try {
      const response = await fetch("/api/cloudinary/upload", {
        method: "POST",
        body: formData,
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(getUploadError(result) || "Upload failed.")
      }

      if (uploadInputRef.current) {
        uploadInputRef.current.value = ""
      }

      const nextShootPage = await getShoot({
        data: {
          categoryName: categoryFolder.name,
          shootName: shootFolder.name,
        },
      })

      setShootPage(nextShootPage)

      if (nextShootPage.connection.error) {
        toast.error(nextShootPage.connection.error)
      } else {
        toast.success("Upload complete")
      }
    } catch (uploadError) {
      toast.error(getErrorMessage(uploadError))
    } finally {
      setIsBusy(false)
    }
  }

  function handleRenameShoot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextName = renameName.trim()

    if (!nextName) {
      return
    }

    if (nextName === shootFolder.name) {
      setIsRenamingShoot(false)
      return
    }

    const renameShootPromise = performShootAction(async () => {
      await renameFolder({
        data: {
          folderPath: shootFolder.path,
          name: nextName,
        },
      })

      return await getShoot({
        data: {
          categoryName: categoryFolder.name,
          shootName: nextName,
        },
      })
    })

    toast.promise(renameShootPromise, {
      loading: "Renaming shoot...",
      success: "Shoot renamed",
      error: (renameError) => getErrorMessage(renameError),
    })

    void renameShootPromise
      .then(() => {
        setIsRenamingShoot(false)

        void navigate({
          to: "/$category/$shoot",
          params: {
            category: toMediaRouteSegment(categoryFolder.name),
            shoot: toMediaRouteSegment(nextName),
          },
          search: getMediaAdminSearch(true),
        })

        return undefined
      })
      .catch(() => undefined)
  }

  function startRenamingShoot() {
    setRenameName(shootFolder.name)
    setIsRenamingShoot(true)
  }

  function cancelRenamingShoot() {
    setRenameName(shootFolder.name)
    setIsRenamingShoot(false)
  }

  function startEditingCredits() {
    setCreditsDraft(shootFolder.credits || "")
    setIsEditingCredits(true)
  }

  function cancelEditingCredits() {
    setCreditsDraft(shootFolder.credits || "")
    setIsEditingCredits(false)
  }

  function handleSaveCredits(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextCredits = getInlineCreditText(creditsDraft)

    if (nextCredits === getInlineCreditText(shootFolder.credits || "")) {
      setIsEditingCredits(false)
      return
    }

    const saveCreditsPromise = performShootAction(async () => {
      await setShootCredits({
        data: {
          shootPath: shootFolder.path,
          credits: nextCredits,
        },
      })

      return await getShoot({
        data: {
          categoryName: categoryFolder.name,
          shootName: shootFolder.name,
        },
      })
    })

    toast.promise(saveCreditsPromise, {
      loading: "Saving credits...",
      success: nextCredits ? "Credits saved" : "Credits cleared",
      error: (creditsError) => getErrorMessage(creditsError),
    })

    void saveCreditsPromise
      .then(() => {
        setIsEditingCredits(false)

        return undefined
      })
      .catch(() => undefined)
  }

  function handleDeleteShoot() {
    void runShootAction(async () => {
      await deleteFolder({ data: { folderPath: shootFolder.path } })

      return await getShoot({
        data: {
          categoryName: categoryFolder.name,
          shootName: shootFolder.name,
        },
      })
    }, "Shoot deleted").then((didSucceed) => {
      if (didSucceed) {
        void navigate({
          to: "/$category",
          params: { category: toMediaRouteSegment(categoryFolder.name) },
          search: getMediaAdminSearch(true),
        })
      }

      return undefined
    })
  }

  function toggleAssetSelection(assetId: string, selected?: boolean) {
    setSelectedAssetIds((currentAssetIds) => {
      const nextAssetIds = new Set(currentAssetIds)
      const shouldSelect = selected ?? !nextAssetIds.has(assetId)

      if (shouldSelect) {
        nextAssetIds.add(assetId)
      } else {
        nextAssetIds.delete(assetId)
      }

      return nextAssetIds
    })
  }

  function clearAssetSelection() {
    setSelectedAssetIds(new Set())
  }

  function handleAssetDragStart(
    event: DragEvent<HTMLElement>,
    assetId: string
  ) {
    if (!canOrganizeAssets) {
      return
    }

    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", assetId)
    setDraggingAssetId(assetId)
  }

  function handleAssetDragOver(event: DragEvent<HTMLElement>, assetId: string) {
    if (!canOrganizeAssets || draggingAssetId === assetId) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
    const position = getAssetDropPosition(event)

    setDropTarget((currentDropTarget) => {
      if (
        currentDropTarget?.assetId === assetId &&
        currentDropTarget.position === position
      ) {
        return currentDropTarget
      }

      return { assetId, position }
    })
  }

  function handleAssetDrop(event: DragEvent<HTMLElement>, assetId: string) {
    if (!canOrganizeAssets) {
      return
    }

    event.preventDefault()

    const draggedAssetId =
      event.dataTransfer.getData("text/plain") || draggingAssetId
    const dropPosition =
      dropTarget?.assetId === assetId
        ? dropTarget.position
        : getAssetDropPosition(event)

    if (!draggedAssetId || draggedAssetId === assetId) {
      return
    }

    const nextAssets = moveAssetToDropTarget(
      shootPage.assets,
      draggedAssetId,
      assetId,
      dropPosition
    )

    if (!nextAssets) {
      return
    }

    saveAssetOrder(nextAssets)
  }

  function handleAssetDragEnd() {
    setDraggingAssetId(null)
    setDropTarget(null)
  }

  function saveAssetOrder(nextAssets: CloudinaryAsset[]) {
    const previousShootPage = shootPage
    const orderedAssets = nextAssets.map((asset, index) => ({
      ...asset,
      orderRank: (index + 1) * 1000,
    }))

    setShootPage({
      ...shootPage,
      assets: orderedAssets,
    })
    setDraggingAssetId(null)
    setDropTarget(null)

    void reorderAssets({
      data: {
        shootPath: shootFolder.path,
        selectedFolder: shootFolder.path,
        assetIds: orderedAssets.map((asset) => asset.assetId),
      },
    })
      .then(() => {
        toast.success("Photo order saved")

        return undefined
      })
      .catch((orderError) => {
        setShootPage(previousShootPage)
        toast.error(getErrorMessage(orderError))

        return undefined
      })
  }

  function handleDeleteSelectedAssets() {
    const assetIds = Array.from(selectedAssetIds)

    if (assetIds.length === 0) {
      return
    }

    const deleteAssetsPromise = performShootAction(async () => {
      await deleteShootAssets({
        data: {
          shootPath: shootFolder.path,
          selectedFolder: shootFolder.path,
          assetIds,
        },
      })

      return await getShoot({
        data: {
          categoryName: categoryFolder.name,
          shootName: shootFolder.name,
        },
      })
    })

    toast.promise(deleteAssetsPromise, {
      loading: "Deleting photos...",
      success: assetIds.length === 1 ? "Photo deleted" : "Photos deleted",
      error: (deleteError) => getErrorMessage(deleteError),
    })

    void deleteAssetsPromise
      .then(() => {
        clearAssetSelection()

        return undefined
      })
      .catch(() => undefined)
  }

  function handleSetShootCover(assetId: string) {
    if (shootFolder.coverAssetId === assetId) {
      return
    }

    const previousShootPage = shootPage

    setShootPage({
      ...shootPage,
      shoot: {
        ...shootFolder,
        coverAssetId: assetId,
      },
    })

    void setShootCover({
      data: {
        shootPath: shootFolder.path,
        selectedFolder: shootFolder.path,
        assetId,
      },
    })
      .then(() => {
        toast.success("Shoot cover saved")

        return undefined
      })
      .catch((coverError) => {
        setShootPage(previousShootPage)
        toast.error(getErrorMessage(coverError))

        return undefined
      })
  }

  function openAssetViewer(assetId: string) {
    setActiveViewerAssetId(assetId)
  }

  function closeAssetViewer() {
    setActiveViewerAssetId(null)
  }

  async function performShootAction(
    action: () => Promise<CloudinaryShootPage>
  ) {
    setIsBusy(true)

    try {
      const nextShootPage = await action()

      setShootPage(nextShootPage)

      if (nextShootPage.connection.error) {
        throw new Error(nextShootPage.connection.error)
      }

      return nextShootPage
    } finally {
      setIsBusy(false)
    }
  }

  async function runShootAction(
    action: () => Promise<CloudinaryShootPage>,
    successMessage: string
  ) {
    try {
      await performShootAction(action)

      toast.success(successMessage)
      return true
    } catch (actionError) {
      toast.error(getErrorMessage(actionError))
      return false
    }
  }

  return (
    <>
      <ShootTitle
        canUpload={canUpload}
        canDeleteShoot={canRenameShoot}
        canRenameShoot={canRenameShoot}
        category={categoryFolder}
        connection={shootPage.connection}
        isAdminMode={isAdminMode}
        isBusy={isBusy}
        isRenamingShoot={isRenamingShoot}
        renameName={renameName}
        shoot={shootFolder}
        uploadInputRef={uploadInputRef}
        onCancelRenamingShoot={cancelRenamingShoot}
        onDeleteShoot={handleDeleteShoot}
        onRefresh={refreshShoot}
        onRenameNameChange={setRenameName}
        onRenameShoot={handleRenameShoot}
        onStartRenamingShoot={startRenamingShoot}
        onUploadClick={handleUploadClick}
        onUploadFileChange={handleUploadFileChange}
      />
      <PhotoMasonry
        assets={shootPage.assets}
        canOrganizeAssets={canOrganizeAssets}
        draggingAssetId={draggingAssetId}
        dropTarget={dropTarget}
        isAdminMode={isAdminMode}
        isBusy={isBusy}
        selectedAssetIds={selectedAssetIds}
        shoot={shootFolder}
        onAssetDragEnd={handleAssetDragEnd}
        onAssetDragOver={handleAssetDragOver}
        onAssetDragStart={handleAssetDragStart}
        onAssetDrop={handleAssetDrop}
        onAssetSelectionChange={toggleAssetSelection}
        onOpenAsset={openAssetViewer}
        onSetShootCover={handleSetShootCover}
      />
      <ShootCredits
        canEditCredits={canEditCredits}
        credits={shootFolder.credits || ""}
        creditsDraft={creditsDraft}
        isAdminMode={isAdminMode}
        isBusy={isBusy}
        isEditingCredits={isEditingCredits}
        onCancelEditingCredits={cancelEditingCredits}
        onCreditsDraftChange={setCreditsDraft}
        onSaveCredits={handleSaveCredits}
        onStartEditingCredits={startEditingCredits}
      />
      <PhotoViewer
        activeAssetId={activeViewerAssetId}
        assets={shootPage.assets}
        onClose={closeAssetViewer}
        onSelectAsset={setActiveViewerAssetId}
      />
      {isAdminMode && selectedAssetIds.size > 0 ? (
        <SelectedPhotosActionBar
          canDelete={canDeleteSelectedAssets}
          isBusy={isBusy}
          selectedCount={selectedAssetIds.size}
          onClearSelection={clearAssetSelection}
          onDeleteSelected={handleDeleteSelectedAssets}
        />
      ) : null}
    </>
  )
}

function ShootTitle({
  canUpload,
  canDeleteShoot,
  canRenameShoot,
  category,
  connection,
  isAdminMode,
  isBusy,
  isRenamingShoot,
  renameName,
  shoot,
  uploadInputRef,
  onCancelRenamingShoot,
  onDeleteShoot,
  onRefresh,
  onRenameNameChange,
  onRenameShoot,
  onStartRenamingShoot,
  onUploadClick,
  onUploadFileChange,
}: {
  canUpload: boolean
  canDeleteShoot: boolean
  canRenameShoot: boolean
  category: CloudinaryFolder
  connection: CloudinaryConnection
  isAdminMode: boolean
  isBusy: boolean
  isRenamingShoot: boolean
  renameName: string
  shoot: CloudinaryFolder
  uploadInputRef: RefObject<HTMLInputElement | null>
  onCancelRenamingShoot: () => void
  onDeleteShoot: () => void
  onRefresh: () => void
  onRenameNameChange: (name: string) => void
  onRenameShoot: (event: FormEvent<HTMLFormElement>) => void
  onStartRenamingShoot: () => void
  onUploadClick: () => void
  onUploadFileChange: (event: ChangeEvent<HTMLInputElement>) => void
}) {
  const renameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isRenamingShoot) {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
    }
  }, [isRenamingShoot])

  return (
    <section className="mx-auto w-full max-w-[1540px] px-4 pb-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link
            to="/$category"
            params={{ category: toMediaRouteSegment(category.name) }}
            search={getMediaAdminSearch(isAdminMode)}
            aria-label={`Go back to ${category.name}`}
            className="group/back inline-flex items-center gap-1.5 text-[0.6875rem] leading-none font-medium tracking-[0.08em] text-muted-foreground/80 lowercase transition-colors hover:text-brand"
          >
            <ArrowLeftIcon
              aria-hidden="true"
              className="size-3.5 shrink-0 transition-transform group-hover/back:-translate-x-0.5"
            />
            <span>go back</span>
          </Link>
          {isRenamingShoot ? (
            <form
              className="mt-2 flex max-w-3xl items-center gap-3"
              onSubmit={onRenameShoot}
            >
              <Input
                ref={renameInputRef}
                aria-label="Shoot folder name"
                value={renameName}
                className="h-auto border-x-0 border-t-0 py-0 font-heading text-5xl leading-none tracking-normal md:text-6xl"
                disabled={!canRenameShoot || isBusy}
                onChange={(event) => onRenameNameChange(event.target.value)}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!canRenameShoot || isBusy || renameName.trim() === ""}
              >
                <CheckIcon />
                <span className="sr-only">Save shoot name</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={isBusy}
                onClick={onCancelRenamingShoot}
              >
                <XIcon />
                <span className="sr-only">Cancel shoot rename</span>
              </Button>
            </form>
          ) : (
            <h1 className="mt-2 font-heading text-5xl leading-none tracking-normal md:text-6xl">
              {shoot.name}
            </h1>
          )}
        </div>
        {isAdminMode ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isBusy}
              onClick={onRefresh}
            >
              <RefreshCwIcon data-icon="inline-start" />
              Refresh
            </Button>
            <Button
              type="button"
              variant={isRenamingShoot ? "secondary" : "outline"}
              size="icon-sm"
              disabled={!canRenameShoot || isBusy}
              aria-pressed={isRenamingShoot}
              onClick={onStartRenamingShoot}
            >
              <PencilIcon />
              <span className="sr-only">Edit shoot name</span>
            </Button>
            <UploadPhotosButton
              canUpload={canUpload}
              isBusy={isBusy}
              uploadInputRef={uploadInputRef}
              onUploadClick={onUploadClick}
              onUploadFileChange={onUploadFileChange}
            />
            <DeleteShootDialog
              canDeleteShoot={canDeleteShoot}
              isBusy={isBusy}
              shoot={shoot}
              onDeleteShoot={onDeleteShoot}
            />
          </div>
        ) : null}
      </div>
      {isAdminMode ? <ConnectionNotice connection={connection} /> : null}
    </section>
  )
}

function UploadPhotosButton({
  canUpload,
  isBusy,
  uploadInputRef,
  onUploadClick,
  onUploadFileChange,
}: {
  canUpload: boolean
  isBusy: boolean
  uploadInputRef: RefObject<HTMLInputElement | null>
  onUploadClick: () => void
  onUploadFileChange: (event: ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        disabled={!canUpload || isBusy}
        onClick={onUploadClick}
      >
        <PlusIcon />
        <span className="sr-only">Upload photos</span>
      </Button>
      <Input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        tabIndex={-1}
        disabled={!canUpload || isBusy}
        onChange={onUploadFileChange}
      />
    </>
  )
}

function DeleteShootDialog({
  canDeleteShoot,
  isBusy,
  shoot,
  onDeleteShoot,
}: {
  canDeleteShoot: boolean
  isBusy: boolean
  shoot: CloudinaryFolder
  onDeleteShoot: () => void
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant="destructive"
            size="icon-sm"
            disabled={!canDeleteShoot || isBusy}
          />
        }
      >
        <Trash2Icon />
        <span className="sr-only">Delete shoot</span>
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete shoot?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete &quot;{shoot.name}&quot; and all photos
            in this shoot. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="ghost" disabled={isBusy}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant="destructive"
            disabled={!canDeleteShoot || isBusy}
            onClick={onDeleteShoot}
          >
            <Trash2Icon data-icon="inline-start" />
            Delete shoot
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function PhotoMasonry({
  assets,
  canOrganizeAssets,
  draggingAssetId,
  dropTarget,
  isAdminMode,
  isBusy,
  selectedAssetIds,
  shoot,
  onAssetDragEnd,
  onAssetDragOver,
  onAssetDragStart,
  onAssetDrop,
  onAssetSelectionChange,
  onOpenAsset,
  onSetShootCover,
}: {
  assets: CloudinaryAsset[]
  canOrganizeAssets: boolean
  draggingAssetId: string | null
  dropTarget: AssetDropTarget | null
  isAdminMode: boolean
  isBusy: boolean
  selectedAssetIds: Set<string>
  shoot: CloudinaryFolder
  onAssetDragEnd: () => void
  onAssetDragOver: (event: DragEvent<HTMLElement>, assetId: string) => void
  onAssetDragStart: (event: DragEvent<HTMLElement>, assetId: string) => void
  onAssetDrop: (event: DragEvent<HTMLElement>, assetId: string) => void
  onAssetSelectionChange: (assetId: string, selected?: boolean) => void
  onOpenAsset: (assetId: string) => void
  onSetShootCover: (assetId: string) => void
}) {
  if (assets.length === 0) {
    return (
      <section className="mx-auto w-full max-w-[1540px] px-4 py-16 text-sm text-muted-foreground sm:px-6 lg:px-8">
        No photos in this shoot yet.
      </section>
    )
  }

  const effectiveCoverAssetId = getEffectiveCoverAssetId(shoot, assets)

  return (
    <section className="mx-auto w-full max-w-[1540px] px-4 pb-6 sm:px-6 lg:px-8">
      <div className="columns-1 gap-5 sm:columns-2 lg:columns-4">
        {assets.map((asset, index) =>
          isAdminMode ? (
            <AdminPhotoCard
              key={asset.assetId}
              asset={asset}
              canOrganizeAssets={canOrganizeAssets}
              dropPosition={
                dropTarget?.assetId === asset.assetId &&
                draggingAssetId !== asset.assetId
                  ? dropTarget.position
                  : null
              }
              effectiveCoverAssetId={effectiveCoverAssetId}
              isDragging={draggingAssetId === asset.assetId}
              isBusy={isBusy}
              isPriority={index < 6}
              isSelected={selectedAssetIds.has(asset.assetId)}
              onAssetDragEnd={onAssetDragEnd}
              onAssetDragOver={onAssetDragOver}
              onAssetDragStart={onAssetDragStart}
              onAssetDrop={onAssetDrop}
              onAssetSelectionChange={onAssetSelectionChange}
              onSetShootCover={onSetShootCover}
            />
          ) : (
            <button
              type="button"
              key={asset.assetId}
              className={cn(
                "group relative mb-5 block w-full break-inside-avoid overflow-hidden bg-muted text-left",
                getAssetFrameClass(asset)
              )}
              onClick={() => {
                preloadViewerAssetsAround(assets, asset.assetId)
                onOpenAsset(asset.assetId)
              }}
              onFocus={() => preloadViewerAssetsAround(assets, asset.assetId)}
              onPointerDown={() =>
                preloadViewerAssetsAround(assets, asset.assetId)
              }
              onPointerEnter={() =>
                preloadViewerAssetsAround(assets, asset.assetId)
              }
            >
              <ProgressiveImage
                src={asset.thumbnailUrl}
                srcSet={asset.thumbnailSrcSet}
                sizes={MASONRY_IMAGE_SIZES}
                alt={asset.displayName}
                className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-[1.035]"
                {...getImageLoadingProps(index < 6)}
              />
              <span className="sr-only">Open {asset.displayName}</span>
            </button>
          )
        )}
      </div>
    </section>
  )
}

function ShootCredits({
  canEditCredits,
  credits,
  creditsDraft,
  isAdminMode,
  isBusy,
  isEditingCredits,
  onCancelEditingCredits,
  onCreditsDraftChange,
  onSaveCredits,
  onStartEditingCredits,
}: {
  canEditCredits: boolean
  credits: string
  creditsDraft: string
  isAdminMode: boolean
  isBusy: boolean
  isEditingCredits: boolean
  onCancelEditingCredits: () => void
  onCreditsDraftChange: (credits: string) => void
  onSaveCredits: (event: FormEvent<HTMLFormElement>) => void
  onStartEditingCredits: () => void
}) {
  const creditText = getInlineCreditText(credits)
  const hasCredits = creditText.length > 0
  const shouldShowEditor = isAdminMode && (isEditingCredits || !hasCredits)

  if (!isAdminMode && !hasCredits) {
    return null
  }

  return (
    <section className="mx-auto w-full max-w-[1540px] px-4 pb-6 sm:px-6 lg:px-8">
      {shouldShowEditor ? (
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
              value={creditsDraft}
              disabled={!canEditCredits || isBusy}
              maxLength={2000}
              placeholder="@moopscreamlabel @aaainaaa @inezcorreiaa"
              className="h-7 min-w-0 flex-1 rounded-none border-x-0 border-t-0 border-b-muted-foreground/25 bg-transparent p-0 font-heading text-[0.9375rem] text-muted-foreground shadow-none placeholder:text-muted-foreground/45 focus-visible:border-b-muted-foreground focus-visible:ring-0 md:text-[0.9375rem]"
              onChange={(event) => onCreditsDraftChange(event.target.value)}
            />
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
          </div>
        </form>
      ) : hasCredits ? (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 font-heading text-[0.9375rem] leading-tight text-muted-foreground">
          <p className="min-w-0">
            <span className="font-semibold">Crédits :</span>{" "}
            <span>{creditText}</span>
          </p>
          {isAdminMode ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!canEditCredits || isBusy}
              className="h-auto px-1 py-0 font-sans text-[0.6875rem] leading-none text-muted-foreground hover:bg-transparent hover:text-foreground"
              onClick={onStartEditingCredits}
            >
              <PencilIcon data-icon="inline-start" />
              Edit
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function PhotoViewer({
  activeAssetId,
  assets,
  onClose,
  onSelectAsset,
}: {
  activeAssetId: string | null
  assets: CloudinaryAsset[]
  onClose: () => void
  onSelectAsset: (assetId: string) => void
}) {
  const activeAsset = activeAssetId
    ? assets.find((asset) => asset.assetId === activeAssetId)
    : undefined
  const hasMultipleAssets = assets.length > 1
  const viewerImageUrl = activeAsset
    ? getViewerImageUrl(activeAsset)
    : undefined
  const [loadedViewerImageUrl, setLoadedViewerImageUrl] = useState<
    string | null
  >(null)
  const closeViewer = useEffectEvent(onClose)
  const selectViewerAsset = useEffectEvent(onSelectAsset)
  const isViewerImageLoaded = viewerImageUrl
    ? loadedViewerImageUrl === viewerImageUrl ||
      loadedViewerImageUrls.has(viewerImageUrl)
    : false

  useEffect(() => {
    if (!activeAssetId) {
      return undefined
    }

    const currentAssetId = activeAssetId

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        closeViewer()
        return
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault()
        const previousAsset = getCircularAsset(assets, currentAssetId, -1)

        if (previousAsset) {
          selectViewerAsset(previousAsset.assetId)
        }

        return
      }

      if (event.key === "ArrowRight") {
        event.preventDefault()
        const nextAsset = getCircularAsset(assets, currentAssetId, 1)

        if (nextAsset) {
          selectViewerAsset(nextAsset.assetId)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [activeAssetId, assets])

  useEffect(() => {
    if (!activeAssetId) {
      return undefined
    }

    preloadViewerAssetsAround(assets, activeAssetId)

    return undefined
  }, [activeAssetId, assets])

  if (!activeAsset) {
    return null
  }

  const viewerAsset = activeAsset
  const activeViewerImageUrl = getViewerImageUrl(viewerAsset)

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  function handleViewerImageSettled() {
    loadedViewerImageUrls.add(activeViewerImageUrl)
    setLoadedViewerImageUrl(activeViewerImageUrl)
  }

  function showPreviousAsset() {
    const previousAsset = getCircularAsset(assets, viewerAsset.assetId, -1)

    if (previousAsset) {
      onSelectAsset(previousAsset.assetId)
    }
  }

  function showNextAsset() {
    const nextAsset = getCircularAsset(assets, viewerAsset.assetId, 1)

    if (nextAsset) {
      onSelectAsset(nextAsset.assetId)
    }
  }

  return (
    <dialog
      open
      aria-modal="true"
      aria-label={`${viewerAsset.displayName} photo viewer`}
      className="fixed inset-0 z-[60] m-0 h-dvh max-h-none w-dvw max-w-none border-0 bg-black/95 p-0 text-white"
    >
      <div
        role="presentation"
        className="relative flex h-full w-full items-center justify-center px-3 py-4 sm:px-16 sm:py-6"
        onClick={handleBackdropClick}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute top-3 right-3 z-20 border-white/10 bg-black/35 text-white hover:bg-white/10 hover:text-white sm:top-5 sm:right-5"
          aria-label="Close photo viewer"
          onClick={onClose}
        >
          <XIcon />
        </Button>
        {hasMultipleAssets ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className="absolute left-2 z-10 border-white/10 bg-black/35 text-white hover:bg-white/10 hover:text-white sm:left-5"
            aria-label="Show previous photo"
            onClick={showPreviousAsset}
          >
            <ChevronLeftIcon />
          </Button>
        ) : null}
        {!isViewerImageLoaded ? (
          <>
            <img
              src={viewerAsset.thumbnailUrl}
              alt=""
              aria-hidden="true"
              className="max-h-full max-w-full scale-[1.01] object-contain opacity-60 shadow-2xl shadow-black blur-sm transition-opacity duration-200"
            />
            <output className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center text-white/80">
              <RefreshCwIcon className="size-5 animate-spin" />
              <span className="sr-only">Loading photo</span>
            </output>
          </>
        ) : null}
        <img
          src={activeViewerImageUrl}
          alt={viewerAsset.displayName}
          className={cn(
            "max-h-full max-w-full object-contain shadow-2xl shadow-black transition-opacity duration-200",
            isViewerImageLoaded
              ? "opacity-100"
              : "absolute inset-0 m-auto opacity-0"
          )}
          decoding="async"
          fetchPriority="high"
          loading="eager"
          onError={handleViewerImageSettled}
          onLoad={handleViewerImageSettled}
        />
        {hasMultipleAssets ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className="absolute right-2 z-10 border-white/10 bg-black/35 text-white hover:bg-white/10 hover:text-white sm:right-5"
            aria-label="Show next photo"
            onClick={showNextAsset}
          >
            <ChevronRightIcon />
          </Button>
        ) : null}
      </div>
    </dialog>
  )
}

function AdminPhotoCard({
  asset,
  canOrganizeAssets,
  dropPosition,
  effectiveCoverAssetId,
  isDragging,
  isBusy,
  isPriority,
  isSelected,
  onAssetDragEnd,
  onAssetDragOver,
  onAssetDragStart,
  onAssetDrop,
  onAssetSelectionChange,
  onSetShootCover,
}: {
  asset: CloudinaryAsset
  canOrganizeAssets: boolean
  dropPosition: AssetDropPosition | null
  effectiveCoverAssetId: string | undefined
  isDragging: boolean
  isBusy: boolean
  isPriority: boolean
  isSelected: boolean
  onAssetDragEnd: () => void
  onAssetDragOver: (event: DragEvent<HTMLElement>, assetId: string) => void
  onAssetDragStart: (event: DragEvent<HTMLElement>, assetId: string) => void
  onAssetDrop: (event: DragEvent<HTMLElement>, assetId: string) => void
  onAssetSelectionChange: (assetId: string, selected?: boolean) => void
  onSetShootCover: (assetId: string) => void
}) {
  const isCover = asset.assetId === effectiveCoverAssetId

  return (
    <article
      draggable={canOrganizeAssets && !isBusy}
      className={cn(
        "group/photo relative mb-5 break-inside-avoid overflow-hidden border bg-card transition duration-200",
        canOrganizeAssets && !isBusy
          ? "cursor-grab active:cursor-grabbing"
          : "",
        dropPosition ? "ring-2 ring-brand/70" : "",
        isDragging ? "opacity-45 ring-2 ring-brand/50" : "",
        isSelected ? "ring-2 ring-brand/70" : "hover:border-foreground/40"
      )}
      onDragStart={(event) => onAssetDragStart(event, asset.assetId)}
      onDragOver={(event) => onAssetDragOver(event, asset.assetId)}
      onDrop={(event) => onAssetDrop(event, asset.assetId)}
      onDragEnd={onAssetDragEnd}
    >
      {dropPosition ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 z-30 flex justify-center",
            dropPosition === "before" ? "top-0" : "bottom-0"
          )}
        >
          <div className="h-1 w-[calc(100%-1rem)] bg-brand shadow-[0_0_0_1px_hsl(var(--background)),0_0_18px_hsl(var(--brand)/0.6)]" />
        </div>
      ) : null}
      <div className="relative overflow-hidden bg-muted">
        <button
          type="button"
          className={cn(
            "group/image relative block w-full cursor-pointer text-left disabled:cursor-not-allowed",
            getAssetFrameClass(asset)
          )}
          draggable={canOrganizeAssets && !isBusy}
          disabled={isBusy}
          aria-pressed={isSelected}
          onDragStart={(event) => onAssetDragStart(event, asset.assetId)}
          onDragOver={(event) => onAssetDragOver(event, asset.assetId)}
          onDrop={(event) => onAssetDrop(event, asset.assetId)}
          onDragEnd={onAssetDragEnd}
          onClick={() => onAssetSelectionChange(asset.assetId)}
        >
          {asset.thumbnailUrl ? (
            <ProgressiveImage
              src={asset.thumbnailUrl}
              srcSet={asset.thumbnailSrcSet}
              sizes={MASONRY_IMAGE_SIZES}
              alt={asset.displayName}
              draggable={false}
              className={cn(
                "absolute inset-0 size-full object-cover transition duration-300",
                isSelected
                  ? "scale-[1.015] brightness-90"
                  : "group-hover/image:scale-[1.035]"
              )}
              {...getImageLoadingProps(isPriority)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon className="size-7 text-muted-foreground" />
            </div>
          )}
          <span className="sr-only">
            {isSelected ? "Deselect photo" : "Select photo"}
          </span>
        </button>
        <Checkbox
          checked={isSelected}
          disabled={isBusy}
          aria-label={isSelected ? "Deselect photo" : "Select photo"}
          className={cn(
            "absolute top-3 left-3 z-20 size-5 border-background/80 bg-background/90 text-primary-foreground shadow-sm transition-opacity",
            isSelected
              ? "opacity-100"
              : "opacity-0 group-hover/photo:opacity-100 focus-visible:opacity-100"
          )}
          onClick={(event) => event.stopPropagation()}
          onCheckedChange={(checked) =>
            onAssetSelectionChange(asset.assetId, checked)
          }
        />
        <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-1.5">
          <span className="bg-background/90 px-2 py-1 text-[0.65rem] font-semibold tracking-wide text-foreground uppercase shadow-sm backdrop-blur">
            {getAssetTypeLabel(asset)}
          </span>
          <span className="bg-background/90 px-2 py-1 text-[0.65rem] font-semibold tracking-wide text-foreground uppercase shadow-sm backdrop-blur">
            {getAssetDimensionLabel(asset)}
          </span>
        </div>
        <Button
          type="button"
          variant={isCover ? "brand" : "secondary"}
          size="sm"
          className={cn(
            "absolute right-3 bottom-3 z-20 h-8 px-2.5 text-xs shadow-sm backdrop-blur transition-opacity",
            isCover
              ? "opacity-100"
              : "bg-background/90 opacity-0 group-hover/photo:opacity-100 focus-visible:opacity-100"
          )}
          disabled={!canOrganizeAssets || isBusy}
          onClick={(event) => {
            event.stopPropagation()
            onSetShootCover(asset.assetId)
          }}
        >
          <StarIcon data-icon="inline-start" />
          Cover
        </Button>
      </div>
    </article>
  )
}

function SelectedPhotosActionBar({
  canDelete,
  isBusy,
  selectedCount,
  onClearSelection,
  onDeleteSelected,
}: {
  canDelete: boolean
  isBusy: boolean
  selectedCount: number
  onClearSelection: () => void
  onDeleteSelected: () => void
}) {
  return (
    <div className="fixed inset-x-4 bottom-6 z-50 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-3 border bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
      <span className="min-w-0 text-sm font-medium">
        {selectedCount} selected
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isBusy}
        onClick={onClearSelection}
      >
        Clear
      </Button>
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={!canDelete || isBusy}
            />
          }
        >
          <Trash2Icon data-icon="inline-start" />
          Delete
        </AlertDialogTrigger>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2Icon />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete selected photos?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedCount} selected photo
              {selectedCount === 1 ? "" : "s"} from Cloudinary and remove the
              synced metadata. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="ghost" disabled={isBusy}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              disabled={!canDelete || isBusy}
              onClick={onDeleteSelected}
            >
              <Trash2Icon data-icon="inline-start" />
              Delete photos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function MissingShoot({
  categoryName,
  shootName,
}: {
  categoryName: string
  shootName: string
}) {
  return (
    <section className="mx-auto flex min-h-[58svh] w-full max-w-[1540px] flex-col justify-center px-4 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
        Shoot not found
      </p>
      <h1 className="mt-4 font-heading text-5xl tracking-[0.12em] uppercase">
        {categoryName} / {shootName}
      </h1>
    </section>
  )
}

function ConnectionNotice({
  connection,
}: {
  connection: CloudinaryConnection
}) {
  if (connection.configured && !connection.error) {
    return null
  }

  return (
    <div className="mt-5 flex items-start gap-3 border border-destructive/30 bg-destructive/5 p-4 text-sm">
      <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div className="space-y-1">
        <p className="font-medium">Media services are not ready.</p>
        {!connection.configured ? (
          <p className="text-muted-foreground">
            Missing server env: {connection.missingKeys.join(", ")}.
          </p>
        ) : null}
        {connection.error ? (
          <p className="text-muted-foreground">{connection.error}</p>
        ) : null}
      </div>
    </div>
  )
}

function getEffectiveCoverAssetId(
  shoot: CloudinaryFolder,
  assets: CloudinaryAsset[]
) {
  if (
    shoot.coverAssetId &&
    assets.some((asset) => asset.assetId === shoot.coverAssetId)
  ) {
    return shoot.coverAssetId
  }

  return assets[0]?.assetId
}

function getInlineCreditText(credits: string) {
  return credits.trim().replace(/\s+/g, " ")
}

function getCircularAsset(
  assets: CloudinaryAsset[],
  currentAssetId: string,
  direction: -1 | 1
) {
  const currentIndex = assets.findIndex(
    (asset) => asset.assetId === currentAssetId
  )

  if (currentIndex === -1 || assets.length === 0) {
    return undefined
  }

  const nextIndex = (currentIndex + direction + assets.length) % assets.length

  return assets[nextIndex]
}

const preloadedViewerImageUrls = new Set<string>()
const loadedViewerImageUrls = new Set<string>()

function preloadViewerAssetsAround(
  assets: CloudinaryAsset[],
  currentAssetId: string
) {
  const currentAsset = assets.find((asset) => asset.assetId === currentAssetId)

  preloadViewerAsset(currentAsset)
  preloadViewerAsset(getCircularAsset(assets, currentAssetId, -1))
  preloadViewerAsset(getCircularAsset(assets, currentAssetId, 1))
}

function preloadViewerAsset(asset: CloudinaryAsset | undefined) {
  if (typeof window === "undefined" || !asset) {
    return
  }

  const imageUrl = getViewerImageUrl(asset)

  if (!imageUrl || preloadedViewerImageUrls.has(imageUrl)) {
    return
  }

  preloadedViewerImageUrls.add(imageUrl)

  const image = new Image()

  image.decoding = "async"
  image.onload = () => loadedViewerImageUrls.add(imageUrl)
  image.onerror = () => preloadedViewerImageUrls.delete(imageUrl)
  image.src = imageUrl
}

function getViewerImageUrl(asset: CloudinaryAsset) {
  return asset.previewUrl || asset.secureUrl
}

function getAssetTypeLabel(asset: CloudinaryAsset) {
  return (asset.format || asset.resourceType || "file").toUpperCase()
}

function getAssetDimensionLabel(asset: CloudinaryAsset) {
  if (asset.width && asset.height) {
    return `${asset.width}x${asset.height}`
  }

  return "No size"
}

function getAssetFrameClass(asset: CloudinaryAsset) {
  return isLandscapeAsset(asset) ? "aspect-[3/2]" : "aspect-[4/5]"
}

function isLandscapeAsset(asset: CloudinaryAsset) {
  if (asset.aspectRatio) {
    return asset.aspectRatio > 1
  }

  return Boolean(asset.width && asset.height && asset.width > asset.height)
}

function getAssetDropPosition(
  event: DragEvent<HTMLElement>
): AssetDropPosition {
  const bounds = event.currentTarget.getBoundingClientRect()
  const midpoint = bounds.top + bounds.height / 2

  return event.clientY < midpoint ? "before" : "after"
}

function moveAssetToDropTarget(
  assets: CloudinaryAsset[],
  draggedAssetId: string,
  targetAssetId: string,
  dropPosition: AssetDropPosition
) {
  const fromIndex = assets.findIndex(
    (asset) => asset.assetId === draggedAssetId
  )
  const toIndex = assets.findIndex((asset) => asset.assetId === targetAssetId)

  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return null
  }

  const nextAssets = assets.slice()
  const [draggedAsset] = nextAssets.splice(fromIndex, 1)

  if (!draggedAsset) {
    return null
  }

  const nextIndex = nextAssets.findIndex(
    (asset) => asset.assetId === targetAssetId
  )

  if (nextIndex === -1) {
    return null
  }

  const insertIndex = dropPosition === "after" ? nextIndex + 1 : nextIndex

  nextAssets.splice(insertIndex, 0, draggedAsset)

  const didChange = nextAssets.some(
    (asset, index) => asset.assetId !== assets[index]?.assetId
  )

  if (!didChange) {
    return null
  }

  return nextAssets
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return "Something went wrong."
}

function getUploadError(result: unknown) {
  if (!result || typeof result !== "object") {
    return null
  }

  const error = "error" in result ? result.error : null

  return typeof error === "string" ? error : null
}
