import { NotFoundPage } from "@/components/not-found-page"
import { uploadAdminCloudinaryFiles } from "@/features/cloudinary/admin-upload"
import {
  deleteCloudinaryFolderFn,
  deleteCloudinaryShootAssetsFn,
  getCloudinaryShootFn,
  renameCloudinaryFolderFn,
  reorderCloudinaryAssetsFn,
  setCloudinaryHomeCarouselAssetFn,
  setCloudinaryShootCreditsFn,
  setCloudinaryShootCoverFn,
} from "@/features/cloudinary/cloudinary.functions"
import {
  MASONRY_IMAGE_SIZES,
  getImageLoadingProps,
} from "@/features/cloudinary/image-delivery"
import { ProgressiveImage } from "@/features/cloudinary/progressive-image"
import { prepareImageUploadFiles } from "@/features/cloudinary/upload-image-processing"
import { getMediaCategoryRoute, getMediaShootRoute } from "@/lib/admin-routes"
import type {
  CloudinaryAsset,
  CloudinaryConnection,
  CloudinaryFolder,
  CloudinaryShootPage,
} from "@/lib/cloudinary.server"
import { toMediaRouteSegment } from "@/lib/media-route-segment"
import {
  NOINDEX_ROBOTS,
  createNoindexSeoHead,
  createShootSeoHead,
} from "@/lib/seo"
import {
  createFileRoute,
  Link,
  notFound,
  useNavigate,
  useRouter,
} from "@tanstack/react-router"
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
  HomeIcon,
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
  Fragment,
  type FormEvent,
  type MouseEvent,
  type RefObject,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react"

export type AssetDropPosition = "before" | "after"
export type AssetDropTarget =
  | {
      assetId: string
      position: AssetDropPosition
      type: "asset"
    }
  | {
      columnIndex: number
      type: "column-end"
    }
type AssetDropMove = {
  assets: CloudinaryAsset[]
  columnCount: number
  draggedAssetId: string
  dropPosition: AssetDropPosition
  targetAssetId: string
}

const DEFAULT_MASONRY_COLUMN_COUNT = 1
const ASSET_ORDER_STEP = 1000
const MASONRY_COLUMN_KEYS = [
  "masonry-column-1",
  "masonry-column-2",
  "masonry-column-3",
  "masonry-column-4",
] as const
const TABLET_MASONRY_MEDIA_QUERY = "(min-width: 640px)"
const DESKTOP_MASONRY_MEDIA_QUERY = "(min-width: 1024px)"

export const Route = createFileRoute("/$category/$shoot")({
  loader: async ({ params }) => {
    const shootPage = await getCloudinaryShootFn({
      data: {
        categoryName: params.category,
        shootName: params.shoot,
      },
    })

    if (!shootPage.category || !shootPage.shoot) {
      throw notFound({
        headers: {
          "X-Robots-Tag": NOINDEX_ROBOTS,
        },
      })
    }

    return shootPage
  },
  head: ({ loaderData, match, params }) =>
    isNotFoundRouteMatch(match)
      ? createNoindexSeoHead("Page introuvable | Dolla Shashin")
      : createShootSeoHead(loaderData, params.category, params.shoot),
  headers: ({ match }) =>
    isNotFoundRouteMatch(match)
      ? {
          "X-Robots-Tag": NOINDEX_ROBOTS,
        }
      : undefined,
  notFoundComponent: NotFoundPage,
  component: PublicShootPage,
})

function isNotFoundRouteMatch(match: { status?: string }) {
  return match.status === "notFound"
}

function useMasonryColumnCount() {
  const [columnCount, setColumnCount] = useState(DEFAULT_MASONRY_COLUMN_COUNT)

  useEffect(() => {
    const tabletMediaQuery = window.matchMedia(TABLET_MASONRY_MEDIA_QUERY)
    const desktopMediaQuery = window.matchMedia(DESKTOP_MASONRY_MEDIA_QUERY)

    function syncColumnCount() {
      if (desktopMediaQuery.matches) {
        setColumnCount(4)

        return
      }

      setColumnCount(tabletMediaQuery.matches ? 2 : 1)
    }

    syncColumnCount()
    tabletMediaQuery.addEventListener("change", syncColumnCount)
    desktopMediaQuery.addEventListener("change", syncColumnCount)

    return () => {
      tabletMediaQuery.removeEventListener("change", syncColumnCount)
      desktopMediaQuery.removeEventListener("change", syncColumnCount)
    }
  }, [])

  return columnCount
}

type ShootRouteParams = {
  category: string
  shoot: string
}

function PublicShootPage() {
  const initialShootPage = Route.useLoaderData()
  const params = Route.useParams()

  if (!initialShootPage) {
    throw new Error("Shoot failed to load.")
  }

  return (
    <ShootPage
      initialShootPage={initialShootPage}
      isAdminMode={false}
      params={params}
    />
  )
}

function ShootPage({
  initialShootPage,
  isAdminMode,
  params,
}: {
  initialShootPage: CloudinaryShootPage
  isAdminMode: boolean
  params: ShootRouteParams
}) {
  const navigate = useNavigate()
  const router = useRouter()
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
  const masonryColumnCount = useMasonryColumnCount()

  const getShoot = useServerFn(getCloudinaryShootFn)
  const renameFolder = useServerFn(renameCloudinaryFolderFn)
  const deleteFolder = useServerFn(deleteCloudinaryFolderFn)
  const deleteShootAssets = useServerFn(deleteCloudinaryShootAssetsFn)
  const reorderAssets = useServerFn(reorderCloudinaryAssetsFn)
  const setHomeCarouselAsset = useServerFn(setCloudinaryHomeCarouselAssetFn)
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

  function handleUploadClick() {
    uploadInputRef.current?.click()
  }

  function handleUploadFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])

    if (files.length === 0) {
      return
    }

    const uploadPromise = uploadSelectedFiles(files)

    toast.promise(uploadPromise, {
      loading:
        files.length === 1
          ? "Preparing and uploading photo..."
          : `Preparing and uploading ${files.length} photos...`,
      success: files.length === 1 ? "Photo uploaded" : "Photos uploaded",
      error: (uploadError) => getErrorMessage(uploadError),
    })

    void uploadPromise.catch(() => undefined)
  }

  async function uploadSelectedFiles(files: File[]) {
    if (files.length === 0) {
      toast.error("Choose at least one file to upload.")
      return
    }

    setIsBusy(true)

    try {
      const uploadFiles = await prepareImageUploadFiles(files)

      await uploadAdminCloudinaryFiles({
        files: uploadFiles,
        folderPath: shootFolder.path,
      })

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
        throw new Error(nextShootPage.connection.error)
      }
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
          to: getMediaShootRoute(isAdminMode),
          params: {
            category: toMediaRouteSegment(categoryFolder.name),
            shoot: toMediaRouteSegment(nextName),
          },
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
          to: getMediaCategoryRoute(isAdminMode),
          params: { category: toMediaRouteSegment(categoryFolder.name) },
        }).then(() => router.invalidate())
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
        currentDropTarget?.type === "asset" &&
        currentDropTarget?.assetId === assetId &&
        currentDropTarget.position === position
      ) {
        return currentDropTarget
      }

      return { assetId, position, type: "asset" }
    })
  }

  function handleAssetInsertionDragOver(
    event: DragEvent<HTMLElement>,
    assetId: string,
    position: AssetDropPosition
  ) {
    if (!canOrganizeAssets || draggingAssetId === assetId) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = "move"

    setDropTarget((currentDropTarget) => {
      if (
        currentDropTarget?.type === "asset" &&
        currentDropTarget?.assetId === assetId &&
        currentDropTarget.position === position
      ) {
        return currentDropTarget
      }

      return { assetId, position, type: "asset" }
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
      dropTarget?.type === "asset" && dropTarget.assetId === assetId
        ? dropTarget.position
        : getAssetDropPosition(event)

    if (!draggedAssetId || draggedAssetId === assetId) {
      return
    }

    const nextAssets = moveAssetToDropTarget({
      assets: shootPage.assets,
      columnCount: masonryColumnCount,
      draggedAssetId,
      targetAssetId: assetId,
      dropPosition,
    })

    if (!nextAssets) {
      return
    }

    saveAssetOrder(nextAssets)
  }

  function handleColumnDragOver(
    event: DragEvent<HTMLElement>,
    columnIndex: number
  ) {
    if (!canOrganizeAssets || !draggingAssetId) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = "move"

    setDropTarget((currentDropTarget) => {
      if (
        currentDropTarget?.type === "column-end" &&
        currentDropTarget.columnIndex === columnIndex
      ) {
        return currentDropTarget
      }

      return { columnIndex, type: "column-end" }
    })
  }

  function handleColumnDrop(
    event: DragEvent<HTMLElement>,
    columnIndex: number
  ) {
    if (!canOrganizeAssets) {
      return
    }

    event.preventDefault()

    const draggedAssetId =
      event.dataTransfer.getData("text/plain") || draggingAssetId

    if (!draggedAssetId) {
      return
    }

    const nextAssets = moveAssetToColumnEnd(
      shootPage.assets,
      draggedAssetId,
      columnIndex,
      masonryColumnCount
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
      orderRank: (index + 1) * ASSET_ORDER_STEP,
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
        assetLayouts: getAssetLayoutOrder(orderedAssets, masonryColumnCount),
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

  function handleToggleHomeCarouselAsset(assetId: string, selected: boolean) {
    const previousShootPage = shootPage

    setShootPage({
      ...shootPage,
      assets: shootPage.assets.map((asset) =>
        asset.assetId === assetId
          ? {
              ...asset,
              homeCarouselOrderRank: selected
                ? asset.homeCarouselOrderRank || ASSET_ORDER_STEP
                : undefined,
            }
          : asset
      ),
    })

    void setHomeCarouselAsset({
      data: {
        assetId,
        selected,
      },
    })
      .then(() => {
        toast.success(
          selected
            ? "Homepage carousel photo saved"
            : "Homepage carousel photo removed"
        )

        return undefined
      })
      .catch((homeCarouselError) => {
        setShootPage(previousShootPage)
        toast.error(getErrorMessage(homeCarouselError))

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
        onRenameNameChange={setRenameName}
        onRenameShoot={handleRenameShoot}
        onStartRenamingShoot={startRenamingShoot}
        onUploadClick={handleUploadClick}
        onUploadFileChange={handleUploadFileChange}
      />
      <PhotoMasonry
        assets={shootPage.assets}
        canOrganizeAssets={canOrganizeAssets}
        columnCount={masonryColumnCount}
        draggingAssetId={draggingAssetId}
        dropTarget={dropTarget}
        isAdminMode={isAdminMode}
        isBusy={isBusy}
        selectedAssetIds={selectedAssetIds}
        shoot={shootFolder}
        onAssetDragEnd={handleAssetDragEnd}
        onAssetInsertionDragOver={handleAssetInsertionDragOver}
        onAssetDragOver={handleAssetDragOver}
        onAssetDragStart={handleAssetDragStart}
        onAssetDrop={handleAssetDrop}
        onAssetSelectionChange={toggleAssetSelection}
        onColumnDragOver={handleColumnDragOver}
        onColumnDrop={handleColumnDrop}
        onOpenAsset={openAssetViewer}
        onSetShootCover={handleSetShootCover}
        onToggleHomeCarouselAsset={handleToggleHomeCarouselAsset}
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

export {
  PhotoMasonry,
  PhotoViewer,
  SelectedPhotosActionBar,
  ShootPage,
  UploadPhotosButton,
  getAssetLayoutOrder,
  moveAssetToColumnEnd,
  moveAssetToDropTarget,
  useMasonryColumnCount,
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
    <section className="mx-auto w-full max-w-[1540px] px-4 pb-4 sm:px-6 md:pb-8 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link
            to={getMediaCategoryRoute(isAdminMode)}
            params={{ category: toMediaRouteSegment(category.name) }}
            aria-label={`Go back to ${category.name}`}
            className="group/back hidden items-center gap-1.5 text-[0.6875rem] leading-none font-medium tracking-[0.08em] text-muted-foreground/80 lowercase transition-colors hover:text-brand md:inline-flex"
          >
            <ArrowLeftIcon
              aria-hidden="true"
              className="size-3.5 shrink-0 transition-transform group-hover/back:-translate-x-0.5"
            />
            <span>retour</span>
          </Link>
          {isRenamingShoot ? (
            <form
              className="flex max-w-3xl items-center gap-3"
              onSubmit={onRenameShoot}
            >
              <Input
                ref={renameInputRef}
                aria-label="Shoot folder name"
                value={renameName}
                className="h-auto border-x-0 border-t-0 py-0 font-heading text-4xl leading-none tracking-normal md:text-6xl"
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
            <h1 className="font-heading text-4xl leading-none tracking-normal md:text-6xl">
              {shoot.name}
            </h1>
          )}
        </div>
        {isAdminMode ? (
          <div className="flex flex-wrap gap-2">
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
            This permanently deletes &quot;{shoot.name}&quot; and its Cloudinary
            files.
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
  columnCount,
  draggingAssetId,
  dropTarget,
  emptyMessage = "No photos in this shoot yet.",
  isAdminMode,
  isBusy,
  selectedAssetIds,
  showCoverControl = true,
  shoot,
  onAssetDragEnd,
  onAssetInsertionDragOver,
  onAssetDragOver,
  onAssetDragStart,
  onAssetDrop,
  onAssetSelectionChange,
  onColumnDragOver,
  onColumnDrop,
  onOpenAsset,
  onSetShootCover,
  onToggleHomeCarouselAsset,
}: {
  assets: CloudinaryAsset[]
  canOrganizeAssets: boolean
  columnCount: number
  draggingAssetId: string | null
  dropTarget: AssetDropTarget | null
  emptyMessage?: string
  isAdminMode: boolean
  isBusy: boolean
  selectedAssetIds: Set<string>
  showCoverControl?: boolean
  shoot: CloudinaryFolder
  onAssetDragEnd: () => void
  onAssetInsertionDragOver: (
    event: DragEvent<HTMLElement>,
    assetId: string,
    position: AssetDropPosition
  ) => void
  onAssetDragOver: (event: DragEvent<HTMLElement>, assetId: string) => void
  onAssetDragStart: (event: DragEvent<HTMLElement>, assetId: string) => void
  onAssetDrop: (event: DragEvent<HTMLElement>, assetId: string) => void
  onAssetSelectionChange: (assetId: string, selected?: boolean) => void
  onColumnDragOver: (event: DragEvent<HTMLElement>, columnIndex: number) => void
  onColumnDrop: (event: DragEvent<HTMLElement>, columnIndex: number) => void
  onOpenAsset: (assetId: string) => void
  onSetShootCover: (assetId: string) => void
  onToggleHomeCarouselAsset: (assetId: string, selected: boolean) => void
}) {
  const masonryColumns = useMemo(
    () => buildMasonryColumns(assets, columnCount),
    [assets, columnCount]
  )
  const visualAssets = useMemo(
    () => flattenMasonryColumns(masonryColumns),
    [masonryColumns]
  )
  const assetIndexesById = useMemo(
    () =>
      new Map(
        visualAssets.map((asset, index) => [asset.assetId, index] as const)
      ),
    [visualAssets]
  )

  if (assets.length === 0) {
    return (
      <section className="mx-auto w-full max-w-[1540px] px-4 py-16 text-sm text-muted-foreground sm:px-6 lg:px-8">
        {emptyMessage}
      </section>
    )
  }

  const effectiveCoverAssetId = getEffectiveCoverAssetId(shoot, assets)

  return (
    <section className="mx-auto w-full max-w-[1540px] px-4 pb-6 sm:px-6 lg:px-8">
      <div
        className={cn(
          "grid gap-5",
          columnCount === 1
            ? "grid-cols-1"
            : columnCount === 2
              ? "grid-cols-2"
              : "grid-cols-4"
        )}
      >
        {masonryColumns.map((columnAssets, columnIndex) => (
          <div
            key={MASONRY_COLUMN_KEYS[columnIndex]}
            className="flex min-w-0 flex-col gap-5 self-start"
            onDragOver={(event) => {
              if (event.target === event.currentTarget) {
                onColumnDragOver(event, columnIndex)
              }
            }}
            onDrop={(event) => {
              if (event.target === event.currentTarget) {
                onColumnDrop(event, columnIndex)
              }
            }}
          >
            {columnAssets.map((asset) => {
              const assetIndex = assetIndexesById.get(asset.assetId) ?? -1
              const activeDropPosition =
                dropTarget?.type === "asset" &&
                dropTarget.assetId === asset.assetId &&
                draggingAssetId !== asset.assetId
                  ? dropTarget.position
                  : null

              return isAdminMode ? (
                <Fragment key={asset.assetId}>
                  {activeDropPosition === "before" ? (
                    <AssetInsertionDropZone
                      assetId={asset.assetId}
                      position="before"
                      onDragOver={onAssetInsertionDragOver}
                      onDrop={onAssetDrop}
                    />
                  ) : null}
                  <AdminPhotoCard
                    asset={asset}
                    canOrganizeAssets={canOrganizeAssets}
                    effectiveCoverAssetId={effectiveCoverAssetId}
                    isDragging={draggingAssetId === asset.assetId}
                    isBusy={isBusy}
                    isPriority={assetIndex !== -1 && assetIndex < 6}
                    isSelected={selectedAssetIds.has(asset.assetId)}
                    showCoverControl={showCoverControl}
                    onAssetDragEnd={onAssetDragEnd}
                    onAssetDragOver={onAssetDragOver}
                    onAssetDragStart={onAssetDragStart}
                    onAssetDrop={onAssetDrop}
                    onAssetSelectionChange={onAssetSelectionChange}
                    onSetShootCover={onSetShootCover}
                    onToggleHomeCarouselAsset={onToggleHomeCarouselAsset}
                  />
                  {activeDropPosition === "after" ? (
                    <AssetInsertionDropZone
                      assetId={asset.assetId}
                      position="after"
                      onDragOver={onAssetInsertionDragOver}
                      onDrop={onAssetDrop}
                    />
                  ) : null}
                </Fragment>
              ) : (
                <button
                  type="button"
                  key={asset.assetId}
                  className={cn(
                    "group relative block w-full overflow-hidden bg-muted text-left",
                    getAssetFrameClass(asset)
                  )}
                  onClick={() => {
                    preloadViewerAssetsAround(visualAssets, asset.assetId)
                    onOpenAsset(asset.assetId)
                  }}
                  onFocus={() =>
                    preloadViewerAssetsAround(visualAssets, asset.assetId)
                  }
                  onPointerDown={() =>
                    preloadViewerAssetsAround(visualAssets, asset.assetId)
                  }
                  onPointerEnter={() =>
                    preloadViewerAssetsAround(visualAssets, asset.assetId)
                  }
                >
                  <ProgressiveImage
                    src={asset.thumbnailUrl}
                    srcSet={asset.thumbnailSrcSet}
                    sizes={MASONRY_IMAGE_SIZES}
                    alt={asset.displayName}
                    className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-[1.035]"
                    {...getImageLoadingProps(
                      assetIndex !== -1 && assetIndex < 6
                    )}
                  />
                  <span className="sr-only">Open {asset.displayName}</span>
                </button>
              )
            })}
            {isAdminMode && canOrganizeAssets ? (
              <ColumnEndDropZone
                columnIndex={columnIndex}
                isActive={
                  dropTarget?.type === "column-end" &&
                  dropTarget.columnIndex === columnIndex
                }
                isDragging={Boolean(draggingAssetId)}
                onDragOver={onColumnDragOver}
                onDrop={onColumnDrop}
              />
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}

function AssetInsertionDropZone({
  assetId,
  position,
  onDragOver,
  onDrop,
}: {
  assetId: string
  position: AssetDropPosition
  onDragOver: (
    event: DragEvent<HTMLElement>,
    assetId: string,
    position: AssetDropPosition
  ) => void
  onDrop: (event: DragEvent<HTMLElement>, assetId: string) => void
}) {
  return (
    <div
      className="min-h-12 border border-dashed border-brand bg-brand/10 transition"
      onDragOver={(event) => onDragOver(event, assetId, position)}
      onDrop={(event) => onDrop(event, assetId)}
    >
      <span className="sr-only">Drop {position} selected photo</span>
    </div>
  )
}

function ColumnEndDropZone({
  columnIndex,
  isActive,
  isDragging,
  onDragOver,
  onDrop,
}: {
  columnIndex: number
  isActive: boolean
  isDragging: boolean
  onDragOver: (event: DragEvent<HTMLElement>, columnIndex: number) => void
  onDrop: (event: DragEvent<HTMLElement>, columnIndex: number) => void
}) {
  return (
    <div
      className={cn(
        "min-h-12 border border-dashed border-transparent transition",
        isDragging
          ? "border-foreground/20 bg-muted/35 opacity-100"
          : "pointer-events-none opacity-0",
        isActive ? "border-brand bg-brand/10" : ""
      )}
      onDragOver={(event) => onDragOver(event, columnIndex)}
      onDrop={(event) => onDrop(event, columnIndex)}
    >
      <span className="sr-only">Drop at end of column {columnIndex + 1}</span>
    </div>
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
  effectiveCoverAssetId,
  isDragging,
  isBusy,
  isPriority,
  isSelected,
  showCoverControl,
  onAssetDragEnd,
  onAssetDragOver,
  onAssetDragStart,
  onAssetDrop,
  onAssetSelectionChange,
  onSetShootCover,
  onToggleHomeCarouselAsset,
}: {
  asset: CloudinaryAsset
  canOrganizeAssets: boolean
  effectiveCoverAssetId: string | undefined
  isDragging: boolean
  isBusy: boolean
  isPriority: boolean
  isSelected: boolean
  showCoverControl: boolean
  onAssetDragEnd: () => void
  onAssetDragOver: (event: DragEvent<HTMLElement>, assetId: string) => void
  onAssetDragStart: (event: DragEvent<HTMLElement>, assetId: string) => void
  onAssetDrop: (event: DragEvent<HTMLElement>, assetId: string) => void
  onAssetSelectionChange: (assetId: string, selected?: boolean) => void
  onSetShootCover: (assetId: string) => void
  onToggleHomeCarouselAsset: (assetId: string, selected: boolean) => void
}) {
  const isCover = asset.assetId === effectiveCoverAssetId
  const isHomeCarouselAsset =
    typeof asset.homeCarouselOrderRank === "number" &&
    asset.homeCarouselOrderRank > 0

  return (
    <article
      draggable={canOrganizeAssets && !isBusy}
      className={cn(
        "group/photo relative overflow-hidden border bg-card transition duration-200",
        canOrganizeAssets && !isBusy
          ? "cursor-grab active:cursor-grabbing"
          : "",
        isDragging ? "opacity-45 ring-2 ring-brand/50" : "",
        isSelected ? "ring-2 ring-brand/70" : "hover:border-foreground/40"
      )}
      onDragStart={(event) => onAssetDragStart(event, asset.assetId)}
      onDragOver={(event) => onAssetDragOver(event, asset.assetId)}
      onDrop={(event) => onAssetDrop(event, asset.assetId)}
      onDragEnd={onAssetDragEnd}
    >
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
          variant={isHomeCarouselAsset ? "brand" : "secondary"}
          size="sm"
          className={cn(
            "absolute top-3 right-3 z-20 h-8 px-2.5 text-xs shadow-sm backdrop-blur transition-opacity",
            isHomeCarouselAsset
              ? "opacity-100"
              : "bg-background/90 opacity-0 group-hover/photo:opacity-100 focus-visible:opacity-100"
          )}
          aria-pressed={isHomeCarouselAsset}
          aria-label={
            isHomeCarouselAsset
              ? "Remove from homepage carousel"
              : "Use in homepage carousel"
          }
          disabled={!canOrganizeAssets || isBusy}
          onClick={(event) => {
            event.stopPropagation()
            onToggleHomeCarouselAsset(asset.assetId, !isHomeCarouselAsset)
          }}
        >
          <HomeIcon data-icon="inline-start" />
          Home
        </Button>
        {showCoverControl ? (
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
        ) : null}
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

function moveAssetToDropTarget({
  assets,
  columnCount,
  draggedAssetId,
  dropPosition,
  targetAssetId,
}: AssetDropMove) {
  const columns = buildMasonryColumns(assets, columnCount)
  const draggedAsset = removeAssetFromMasonryColumns(columns, draggedAssetId)

  if (!draggedAsset) {
    return null
  }

  const targetColumn = columns.find((column) =>
    column.some((asset) => asset.assetId === targetAssetId)
  )

  if (!targetColumn) {
    return null
  }

  const targetIndex = targetColumn.findIndex(
    (asset) => asset.assetId === targetAssetId
  )

  if (targetIndex === -1) {
    return null
  }

  const insertIndex = dropPosition === "after" ? targetIndex + 1 : targetIndex
  targetColumn.splice(insertIndex, 0, draggedAsset)

  return getChangedFlattenedMasonryAssets(assets, columns, columnCount)
}

function moveAssetToColumnEnd(
  assets: CloudinaryAsset[],
  draggedAssetId: string,
  columnIndex: number,
  columnCount: number
) {
  const columns = buildMasonryColumns(assets, columnCount)
  const draggedAsset = removeAssetFromMasonryColumns(columns, draggedAssetId)
  const targetColumn = columns[columnIndex]

  if (!draggedAsset || !targetColumn) {
    return null
  }

  targetColumn.push(draggedAsset)

  return getChangedFlattenedMasonryAssets(assets, columns, columnCount)
}

function buildMasonryColumns(assets: CloudinaryAsset[], columnCount: number) {
  const resolvedColumnCount = getMasonryColumnCount(columnCount)
  const savedColumns = getSavedMasonryColumns(assets, resolvedColumnCount)

  if (savedColumns) {
    return savedColumns
  }

  return buildDefaultMasonryColumns(assets, resolvedColumnCount)
}

function getSavedMasonryColumns(
  assets: CloudinaryAsset[],
  columnCount: number
) {
  const columns = createEmptyMasonryColumns(columnCount)
  const assetIndexesById = new Map(
    assets.map((asset, index) => [asset.assetId, index] as const)
  )

  for (const asset of assets) {
    if (!hasMasonryLayout(asset, columnCount)) {
      return null
    }

    const column = columns[asset.layoutColumn]

    if (!column) {
      return null
    }

    column.push(asset)
  }

  columns.forEach((column) => {
    column.sort((first, second) => {
      const layoutDifference =
        (first.layoutOrder ?? 0) - (second.layoutOrder ?? 0)

      if (layoutDifference !== 0) {
        return layoutDifference
      }

      return (
        (assetIndexesById.get(first.assetId) ?? 0) -
        (assetIndexesById.get(second.assetId) ?? 0)
      )
    })
  })

  return columns
}

function buildDefaultMasonryColumns(
  assets: CloudinaryAsset[],
  columnCount: number
) {
  const columns = createEmptyMasonryColumns(columnCount)

  assets.forEach((asset, index) => {
    const column = columns[index % columnCount]

    if (column) {
      column.push(asset)
    }
  })

  return columns
}

function createEmptyMasonryColumns(columnCount: number) {
  const columns = Array.from(
    { length: columnCount },
    () => [] as CloudinaryAsset[]
  )

  return columns
}

function hasMasonryLayout(
  asset: CloudinaryAsset,
  columnCount: number
): asset is CloudinaryAsset & {
  layoutColumn: number
  layoutOrder: number
  layoutColumnCount: number
} {
  const { layoutColumn, layoutColumnCount, layoutOrder } = asset

  return (
    layoutColumnCount === columnCount &&
    typeof layoutColumn === "number" &&
    Number.isInteger(layoutColumn) &&
    layoutColumn >= 0 &&
    layoutColumn < columnCount &&
    typeof layoutOrder === "number" &&
    Number.isInteger(layoutOrder) &&
    layoutOrder >= 0
  )
}

function getAssetLayoutOrder(assets: CloudinaryAsset[], columnCount: number) {
  const resolvedColumnCount = getMasonryColumnCount(columnCount)

  return assets.map((asset, index) => {
    if (hasMasonryLayout(asset, resolvedColumnCount)) {
      return {
        assetId: asset.assetId,
        layoutColumn: asset.layoutColumn,
        layoutOrder: asset.layoutOrder,
        layoutColumnCount: resolvedColumnCount,
      }
    }

    return {
      assetId: asset.assetId,
      layoutColumn: index % resolvedColumnCount,
      layoutOrder: Math.floor(index / resolvedColumnCount),
      layoutColumnCount: resolvedColumnCount,
    }
  })
}

function flattenMasonryColumns(columns: CloudinaryAsset[][]) {
  const rowCount = Math.max(0, ...columns.map((column) => column.length))
  const assets: CloudinaryAsset[] = []

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    columns.forEach((column) => {
      const asset = column[rowIndex]

      if (asset) {
        assets.push(asset)
      }
    })
  }

  return assets
}

function removeAssetFromMasonryColumns(
  columns: CloudinaryAsset[][],
  assetId: string
) {
  for (const column of columns) {
    const assetIndex = column.findIndex((asset) => asset.assetId === assetId)

    if (assetIndex !== -1) {
      const [asset] = column.splice(assetIndex, 1)

      return asset || null
    }
  }

  return null
}

function getChangedFlattenedMasonryAssets(
  previousAssets: CloudinaryAsset[],
  columns: CloudinaryAsset[][],
  columnCount: number
) {
  const resolvedColumnCount = getMasonryColumnCount(columnCount)
  const nextAssets = flattenMasonryColumns(
    columns.map((column, columnIndex) =>
      column.map((asset, layoutOrder) => ({
        ...asset,
        layoutColumn: columnIndex,
        layoutOrder,
        layoutColumnCount: resolvedColumnCount,
      }))
    )
  )
  const previousAssetsById = new Map(
    previousAssets.map((asset) => [asset.assetId, asset] as const)
  )
  const didChange = nextAssets.some((asset, index) => {
    const previousAsset = previousAssetsById.get(asset.assetId)

    return (
      asset.assetId !== previousAssets[index]?.assetId ||
      asset.layoutColumn !== previousAsset?.layoutColumn ||
      asset.layoutOrder !== previousAsset?.layoutOrder ||
      asset.layoutColumnCount !== previousAsset?.layoutColumnCount
    )
  })

  return didChange ? nextAssets : null
}

function getMasonryColumnCount(columnCount: number) {
  if (columnCount >= 4) {
    return 4
  }

  if (columnCount >= 2) {
    return 2
  }

  return 1
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return "Something went wrong."
}
