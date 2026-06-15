import {
  createCloudinaryFolderFn,
  deleteCloudinaryFolderFn,
  deleteCloudinaryShootAssetsFn,
  getCloudinaryCategoryFn,
  moveCloudinaryShootsFn,
  renameCloudinaryFolderFn,
  reorderCloudinaryAssetsFn,
  reorderCloudinaryShootsFn,
  setCloudinaryCategoryCoverFn,
  setCloudinaryHomeCarouselAssetFn,
} from "@/features/cloudinary/cloudinary.functions"
import { GalleryHeader } from "@/features/cloudinary/gallery-header"
import {
  CARD_IMAGE_SIZES,
  getImageLoadingProps,
} from "@/features/cloudinary/image-delivery"
import { ProgressiveImage } from "@/features/cloudinary/progressive-image"
import { prepareImageUploadFiles } from "@/features/cloudinary/upload-image-processing"
import {
  getMediaCategoryRoute,
  getMediaHomeRoute,
  getMediaShootRoute,
} from "@/lib/admin-routes"
import type {
  CloudinaryAsset,
  CloudinaryCategoryPage,
  CloudinaryConnection,
  CloudinaryFolder,
  CloudinaryShootSummary,
} from "@/lib/cloudinary.server"
import { isDirectPhotoCategoryName } from "@/lib/direct-photo-category"
import { toMediaRouteSegment } from "@/lib/media-route-segment"
import { createCategorySeoHead } from "@/lib/seo"
import {
  type AssetDropPosition,
  type AssetDropTarget,
  PhotoMasonry,
  PhotoViewer,
  SelectedPhotosActionBar,
  UploadPhotosButton,
  getAssetLayoutOrder,
  moveAssetToColumnEnd,
  moveAssetToDropTarget,
  useMasonryColumnCount,
} from "@/routes/$category/$shoot"
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouterState,
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { toast } from "@workspace/ui/components/sonner"
import { cn } from "@workspace/ui/lib/utils"
import {
  AlertTriangleIcon,
  CheckIcon,
  FolderInputIcon,
  PencilIcon,
  PlusIcon,
  StarIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

type ShootDropTarget = {
  shootPath: string
}

type CategoryAssetDropMove = {
  assets: CloudinaryAsset[]
  columnCount: number
  draggedAssetId: string
  dropPosition: AssetDropPosition
  targetAssetId: string
}

const ASSET_ORDER_STEP = 1000

export const Route = createFileRoute("/$category")({
  loader: ({ params }) =>
    getCloudinaryCategoryFn({
      data: { categoryName: params.category },
    }),
  head: ({ loaderData, match, matches, params }) => {
    const leafMatch = matches.at(-1)

    if (leafMatch?.id !== match.id) {
      return {}
    }

    return createCategorySeoHead(loaderData, params.category)
  },
  component: PublicCategoryPage,
})

function PublicCategoryPage() {
  const initialCategoryPage = Route.useLoaderData()
  const { category } = Route.useParams()

  if (!initialCategoryPage) {
    throw new Error("Category failed to load.")
  }

  return (
    <CategoryPage
      category={category}
      initialCategoryPage={initialCategoryPage}
      isAdminMode={false}
    />
  )
}

function CategoryPage({
  category,
  initialCategoryPage,
  isAdminMode,
}: {
  category: string
  initialCategoryPage: CloudinaryCategoryPage
  isAdminMode: boolean
}) {
  const navigate = useNavigate()
  const hasShootSegment = useRouterState({
    select: (state) =>
      state.location.pathname.split("/").filter(Boolean).length >
      (isAdminMode ? 2 : 1),
  })
  const [categoryPage, setCategoryPage] = useState(initialCategoryPage)
  const [createShootName, setCreateShootName] = useState("")
  const [createShootFiles, setCreateShootFiles] = useState<File[]>([])
  const [isCreateShootDialogOpen, setIsCreateShootDialogOpen] = useState(false)
  const [renameName, setRenameName] = useState(
    initialCategoryPage.category?.name || ""
  )
  const [isRenamingCategory, setIsRenamingCategory] = useState(false)
  const [draggingShootPath, setDraggingShootPath] = useState<string | null>(
    null
  )
  const [shootDropTarget, setShootDropTarget] =
    useState<ShootDropTarget | null>(null)
  const [selectedShootPaths, setSelectedShootPaths] = useState<Set<string>>(
    () => new Set()
  )
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(
    () => new Set()
  )
  const [draggingAssetId, setDraggingAssetId] = useState<string | null>(null)
  const [assetDropTarget, setAssetDropTarget] =
    useState<AssetDropTarget | null>(null)
  const [activeViewerAssetId, setActiveViewerAssetId] = useState<string | null>(
    null
  )
  const [moveTargetCategoryPath, setMoveTargetCategoryPath] = useState("")
  const [isBusy, setIsBusy] = useState(false)
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const masonryColumnCount = useMasonryColumnCount()

  const getCategory = useServerFn(getCloudinaryCategoryFn)
  const createFolder = useServerFn(createCloudinaryFolderFn)
  const renameFolder = useServerFn(renameCloudinaryFolderFn)
  const deleteFolder = useServerFn(deleteCloudinaryFolderFn)
  const deleteShootAssets = useServerFn(deleteCloudinaryShootAssetsFn)
  const moveShoots = useServerFn(moveCloudinaryShootsFn)
  const reorderAssets = useServerFn(reorderCloudinaryAssetsFn)
  const reorderShoots = useServerFn(reorderCloudinaryShootsFn)
  const setCategoryCover = useServerFn(setCloudinaryCategoryCoverFn)
  const setHomeCarouselAsset = useServerFn(setCloudinaryHomeCarouselAssetFn)
  const selectedCategory = categoryPage.category || undefined
  const selectedCategoryPath = selectedCategory?.path
  const isDirectPhotoCategory = isDirectPhotoCategoryName(
    selectedCategory?.name
  )
  const shoots = categoryPage.shoots
  const assets = categoryPage.assets
  const moveTargetCategories = useMemo(() => {
    if (!selectedCategoryPath) {
      return []
    }

    return categoryPage.categories.filter(
      (categorySummary) =>
        categorySummary.path !== selectedCategoryPath &&
        !categorySummary.isDirectPhotoCategory
    )
  }, [categoryPage.categories, selectedCategoryPath])
  const canMutate =
    categoryPage.connection.configured &&
    !categoryPage.connection.error &&
    !isBusy
  const canCreateShoot =
    canMutate && Boolean(selectedCategory) && !isDirectPhotoCategory
  const canOrganizeShoots =
    canMutate &&
    selectedCategory?.orderRank !== undefined &&
    !isDirectPhotoCategory
  const canRenameCategory =
    canMutate && Boolean(selectedCategory) && !isDirectPhotoCategory
  const canDeleteSelectedShoots = canMutate && selectedShootPaths.size > 0
  const canMoveSelectedShoots =
    canMutate && selectedShootPaths.size > 0 && moveTargetCategories.length > 0
  const canUploadCategoryPhotos =
    canMutate && Boolean(selectedCategory) && isDirectPhotoCategory
  const canOrganizeCategoryPhotos = canUploadCategoryPhotos
  const canDeleteSelectedAssets = canMutate && selectedAssetIds.size > 0

  useEffect(() => {
    setCategoryPage(initialCategoryPage)
    setRenameName(initialCategoryPage.category?.name || "")
    setIsRenamingCategory(false)
    setDraggingShootPath(null)
    setShootDropTarget(null)
    setSelectedShootPaths(new Set())
    setSelectedAssetIds(new Set())
    setDraggingAssetId(null)
    setAssetDropTarget(null)
    setActiveViewerAssetId(null)
    setMoveTargetCategoryPath("")
  }, [initialCategoryPage])

  useEffect(() => {
    if (moveTargetCategories.length === 0) {
      if (moveTargetCategoryPath) {
        setMoveTargetCategoryPath("")
      }

      return
    }

    if (
      !moveTargetCategories.some(
        (categorySummary) => categorySummary.path === moveTargetCategoryPath
      )
    ) {
      setMoveTargetCategoryPath(moveTargetCategories[0]?.path || "")
    }
  }, [moveTargetCategories, moveTargetCategoryPath])

  function handleCreateShootDialogOpenChange(open: boolean) {
    setIsCreateShootDialogOpen(open)

    if (!open) {
      setCreateShootName("")
      setCreateShootFiles([])
    }
  }

  function handleCreateShootFilesChange(event: ChangeEvent<HTMLInputElement>) {
    setCreateShootFiles(Array.from(event.target.files || []))
  }

  function handleCreateShoot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedCategory) {
      toast.error("Select a category before adding shoots.")
      return
    }

    const nextShootName = createShootName.trim()

    if (!nextShootName) {
      return
    }

    const nextShootPath = `${selectedCategory.path}/${nextShootName}`
    const createShootPromise = performCategoryAction(async () => {
      await createFolder({
        data: {
          name: nextShootName,
          parentPath: selectedCategory.path,
        },
      })

      if (createShootFiles.length > 0) {
        await uploadFilesToShoot(nextShootPath, createShootFiles)
      }

      return await getCategory({
        data: { categoryName: selectedCategory.name },
      })
    })

    toast.promise(createShootPromise, {
      loading:
        createShootFiles.length > 0
          ? "Creating shoot and uploading photos..."
          : "Creating shoot...",
      success: "Shoot created",
      error: (createError) => getErrorMessage(createError),
    })

    void createShootPromise
      .then(() => {
        setCreateShootName("")
        setCreateShootFiles([])
        setIsCreateShootDialogOpen(false)

        void navigate({
          to: getMediaShootRoute(isAdminMode),
          params: {
            category: toMediaRouteSegment(selectedCategory.name),
            shoot: toMediaRouteSegment(nextShootName),
          },
        })

        return undefined
      })
      .catch(() => undefined)
  }

  async function uploadFilesToShoot(shootPath: string, files: File[]) {
    const uploadFiles = await prepareImageUploadFiles(files)
    const formData = new FormData()

    formData.set("folderPath", shootPath)

    for (const file of uploadFiles) {
      formData.append("files", file)
    }

    const response = await fetch("/api/cloudinary/upload", {
      method: "POST",
      body: formData,
    })
    const result = await response.json()

    if (!response.ok) {
      throw new Error(getUploadError(result) || "Upload failed.")
    }
  }

  function handleCategoryPhotoUploadClick() {
    uploadInputRef.current?.click()
  }

  function handleCategoryPhotoUploadFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(event.target.files || [])

    if (files.length === 0 || !selectedCategory) {
      return
    }

    const uploadPromise = uploadSelectedCategoryPhotos(files)

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

  async function uploadSelectedCategoryPhotos(files: File[]) {
    if (!selectedCategory) {
      return
    }

    if (files.length === 0) {
      toast.error("Choose at least one file to upload.")
      return
    }

    setIsBusy(true)

    try {
      const uploadFiles = await prepareImageUploadFiles(files)
      const formData = new FormData()

      formData.set("folderPath", selectedCategory.path)

      for (const file of uploadFiles) {
        formData.append("files", file)
      }

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

      const nextCategoryPage = await getCategory({
        data: { categoryName: selectedCategory.name, refresh: true },
      })

      setCategoryPage(nextCategoryPage)

      if (nextCategoryPage.connection.error) {
        throw new Error(nextCategoryPage.connection.error)
      }
    } finally {
      setIsBusy(false)
    }
  }

  function handleRenameCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedCategory) {
      return
    }

    const nextName = renameName.trim()

    if (!nextName) {
      return
    }

    if (nextName === selectedCategory.name) {
      setIsRenamingCategory(false)
      return
    }

    const renameCategoryPromise = performCategoryAction(async () => {
      await renameFolder({
        data: {
          folderPath: selectedCategory.path,
          name: nextName,
        },
      })

      return await getCategory({ data: { categoryName: nextName } })
    })

    toast.promise(renameCategoryPromise, {
      loading: "Renaming category...",
      success: "Category renamed",
      error: (renameError) => getErrorMessage(renameError),
    })

    void renameCategoryPromise
      .then(() => {
        setIsRenamingCategory(false)

        void navigate({
          to: getMediaCategoryRoute(isAdminMode),
          params: { category: toMediaRouteSegment(nextName) },
        })

        return undefined
      })
      .catch(() => undefined)
  }

  function startRenamingCategory() {
    if (!selectedCategory) {
      return
    }

    setRenameName(selectedCategory.name)
    setIsRenamingCategory(true)
  }

  function cancelRenamingCategory() {
    setRenameName(selectedCategory?.name || "")
    setIsRenamingCategory(false)
  }

  function handleDeleteCategory() {
    if (!selectedCategory) {
      return
    }

    void runCategoryAction(async () => {
      await deleteFolder({ data: { folderPath: selectedCategory.path } })

      return await getCategory({ data: { categoryName: category } })
    }, "Category deleted").then((didSucceed) => {
      if (didSucceed) {
        void navigate({ to: getMediaHomeRoute(isAdminMode) })
      }

      return undefined
    })
  }

  function toggleShootSelection(shootPath: string, selected?: boolean) {
    setSelectedShootPaths((currentShootPaths) => {
      const nextShootPaths = new Set(currentShootPaths)
      const shouldSelect = selected ?? !nextShootPaths.has(shootPath)

      if (shouldSelect) {
        nextShootPaths.add(shootPath)
      } else {
        nextShootPaths.delete(shootPath)
      }

      return nextShootPaths
    })
  }

  function clearShootSelection() {
    setSelectedShootPaths(new Set())
  }

  function handleDeleteSelectedShoots() {
    if (!selectedCategory) {
      return
    }

    const shootPaths = Array.from(selectedShootPaths)

    if (shootPaths.length === 0) {
      return
    }

    const deleteShootsPromise = performCategoryAction(async () => {
      await Promise.all(
        shootPaths.map((shootPath) =>
          deleteFolder({ data: { folderPath: shootPath } })
        )
      )

      return await getCategory({
        data: { categoryName: selectedCategory.name, refresh: true },
      })
    })

    toast.promise(deleteShootsPromise, {
      loading: "Deleting shoots...",
      success: shootPaths.length === 1 ? "Shoot deleted" : "Shoots deleted",
      error: (deleteError) => getErrorMessage(deleteError),
    })

    void deleteShootsPromise
      .then(() => {
        clearShootSelection()

        return undefined
      })
      .catch(() => undefined)
  }

  function handleMoveSelectedShoots() {
    if (!selectedCategory) {
      return
    }

    const shootPaths = Array.from(selectedShootPaths)
    const targetCategory = moveTargetCategories.find(
      (categorySummary) => categorySummary.path === moveTargetCategoryPath
    )

    if (shootPaths.length === 0) {
      return
    }

    if (!targetCategory) {
      toast.error("Choose a category to move shoots into.")
      return
    }

    const moveShootsPromise = performCategoryAction(async () => {
      await moveShoots({
        data: {
          selectedFolder: selectedCategory.path,
          shootPaths,
          targetCategoryPath: targetCategory.path,
        },
      })

      return await getCategory({
        data: { categoryName: selectedCategory.name, refresh: true },
      })
    })

    toast.promise(moveShootsPromise, {
      loading: "Moving shoots...",
      success:
        shootPaths.length === 1
          ? `Shoot moved to ${targetCategory.name}`
          : `Shoots moved to ${targetCategory.name}`,
      error: (moveError) => getErrorMessage(moveError),
    })

    void moveShootsPromise
      .then(() => {
        clearShootSelection()

        return undefined
      })
      .catch(() => undefined)
  }

  function handleSetCategoryCover(shootPath: string) {
    if (!selectedCategory) {
      return
    }

    if (selectedCategory.coverShootPath === shootPath) {
      return
    }

    const previousCategoryPage = categoryPage
    const selectedShoot = shoots.find((shoot) => shoot.path === shootPath)

    setCategoryPage({
      ...categoryPage,
      category: {
        ...selectedCategory,
        coverShootPath: shootPath,
      },
      categories: categoryPage.categories.map((categorySummary) =>
        categorySummary.path === selectedCategory.path
          ? {
              ...categorySummary,
              cover: selectedShoot?.cover || categorySummary.cover,
            }
          : categorySummary
      ),
    })

    void setCategoryCover({
      data: {
        categoryPath: selectedCategory.path,
        selectedFolder: selectedCategory.path,
        shootPath,
      },
    })
      .then(() => {
        toast.success("Category cover saved")

        return undefined
      })
      .catch((coverError) => {
        setCategoryPage(previousCategoryPage)
        toast.error(getErrorMessage(coverError))

        return undefined
      })
  }

  function handleShootDragStart(
    event: DragEvent<HTMLElement>,
    shootPath: string
  ) {
    if (!canOrganizeShoots) {
      return
    }

    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", shootPath)
    setDraggingShootPath(shootPath)
  }

  function handleShootDragOver(
    event: DragEvent<HTMLElement>,
    shootPath: string
  ) {
    if (!canOrganizeShoots || draggingShootPath === shootPath) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = "move"

    setShootDropTarget((currentDropTarget) => {
      if (currentDropTarget?.shootPath === shootPath) {
        return currentDropTarget
      }

      return { shootPath }
    })
  }

  function handleShootDrop(event: DragEvent<HTMLElement>, shootPath: string) {
    if (!canOrganizeShoots) {
      return
    }

    event.preventDefault()

    const draggedShootPath =
      event.dataTransfer.getData("text/plain") || draggingShootPath

    if (!draggedShootPath || draggedShootPath === shootPath) {
      return
    }

    const nextShoots = swapShoots(shoots, draggedShootPath, shootPath)

    if (!nextShoots) {
      return
    }

    saveShootOrder(nextShoots)
  }

  function handleShootDragEnd() {
    setDraggingShootPath(null)
    setShootDropTarget(null)
  }

  function saveShootOrder(nextShoots: CloudinaryShootSummary[]) {
    if (!selectedCategory || !canOrganizeShoots) {
      return
    }

    const previousCategoryPage = categoryPage

    setCategoryPage({
      ...categoryPage,
      shoots: nextShoots,
    })
    setDraggingShootPath(null)
    setShootDropTarget(null)

    void reorderShoots({
      data: {
        categoryPath: selectedCategory.path,
        selectedFolder: selectedCategory.path,
        shootPaths: nextShoots.map((shoot) => shoot.path),
      },
    })
      .then(() => {
        toast.success("Shoot order saved")

        return undefined
      })
      .catch((orderError) => {
        setCategoryPage(previousCategoryPage)
        toast.error(getErrorMessage(orderError))

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
    if (!canOrganizeCategoryPhotos) {
      return
    }

    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", assetId)
    setDraggingAssetId(assetId)
  }

  function handleAssetDragOver(event: DragEvent<HTMLElement>, assetId: string) {
    if (!canOrganizeCategoryPhotos || draggingAssetId === assetId) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
    const position = getAssetDropPosition(event)

    setAssetDropTarget((currentDropTarget) => {
      if (
        currentDropTarget?.type === "asset" &&
        currentDropTarget.assetId === assetId &&
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
    if (!canOrganizeCategoryPhotos || draggingAssetId === assetId) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = "move"

    setAssetDropTarget((currentDropTarget) => {
      if (
        currentDropTarget?.type === "asset" &&
        currentDropTarget.assetId === assetId &&
        currentDropTarget.position === position
      ) {
        return currentDropTarget
      }

      return { assetId, position, type: "asset" }
    })
  }

  function handleAssetDrop(event: DragEvent<HTMLElement>, assetId: string) {
    if (!canOrganizeCategoryPhotos) {
      return
    }

    event.preventDefault()

    const draggedAssetId =
      event.dataTransfer.getData("text/plain") || draggingAssetId
    const dropPosition =
      assetDropTarget?.type === "asset" && assetDropTarget.assetId === assetId
        ? assetDropTarget.position
        : getAssetDropPosition(event)

    if (!draggedAssetId || draggedAssetId === assetId) {
      return
    }

    const nextAssets = moveAssetToDropTarget({
      assets,
      columnCount: masonryColumnCount,
      draggedAssetId,
      targetAssetId: assetId,
      dropPosition,
    } satisfies CategoryAssetDropMove)

    if (!nextAssets) {
      return
    }

    saveAssetOrder(nextAssets)
  }

  function handleColumnDragOver(
    event: DragEvent<HTMLElement>,
    columnIndex: number
  ) {
    if (!canOrganizeCategoryPhotos || !draggingAssetId) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = "move"

    setAssetDropTarget((currentDropTarget) => {
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
    if (!canOrganizeCategoryPhotos) {
      return
    }

    event.preventDefault()

    const draggedAssetId =
      event.dataTransfer.getData("text/plain") || draggingAssetId

    if (!draggedAssetId) {
      return
    }

    const nextAssets = moveAssetToColumnEnd(
      assets,
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
    setAssetDropTarget(null)
  }

  function saveAssetOrder(nextAssets: CloudinaryAsset[]) {
    if (!selectedCategory) {
      return
    }

    const previousCategoryPage = categoryPage
    const orderedAssets = nextAssets.map((asset, index) => ({
      ...asset,
      orderRank: (index + 1) * ASSET_ORDER_STEP,
    }))

    setCategoryPage({
      ...categoryPage,
      assets: orderedAssets,
    })
    setDraggingAssetId(null)
    setAssetDropTarget(null)

    void reorderAssets({
      data: {
        shootPath: selectedCategory.path,
        selectedFolder: selectedCategory.path,
        assetIds: orderedAssets.map((asset) => asset.assetId),
        assetLayouts: getAssetLayoutOrder(orderedAssets, masonryColumnCount),
      },
    })
      .then(() => {
        toast.success("Photo order saved")

        return undefined
      })
      .catch((orderError) => {
        setCategoryPage(previousCategoryPage)
        toast.error(getErrorMessage(orderError))

        return undefined
      })
  }

  function handleDeleteSelectedAssets() {
    if (!selectedCategory) {
      return
    }

    const assetIds = Array.from(selectedAssetIds)

    if (assetIds.length === 0) {
      return
    }

    const deleteAssetsPromise = performCategoryAction(async () => {
      await deleteShootAssets({
        data: {
          shootPath: selectedCategory.path,
          selectedFolder: selectedCategory.path,
          assetIds,
        },
      })

      return await getCategory({
        data: { categoryName: selectedCategory.name, refresh: true },
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

  function handleToggleHomeCarouselAsset(assetId: string, selected: boolean) {
    const previousCategoryPage = categoryPage

    setCategoryPage({
      ...categoryPage,
      assets: assets.map((asset) =>
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
        setCategoryPage(previousCategoryPage)
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

  async function performCategoryAction(
    action: () => Promise<CloudinaryCategoryPage>
  ) {
    setIsBusy(true)

    try {
      const nextCategoryPage = await action()

      setCategoryPage(nextCategoryPage)

      if (nextCategoryPage.connection.error) {
        throw new Error(nextCategoryPage.connection.error)
      }

      return nextCategoryPage
    } finally {
      setIsBusy(false)
    }
  }

  async function runCategoryAction(
    action: () => Promise<CloudinaryCategoryPage>,
    successMessage: string
  ) {
    try {
      await performCategoryAction(action)

      toast.success(successMessage)
      return true
    } catch (actionError) {
      toast.error(getErrorMessage(actionError))
      return false
    }
  }

  return (
    <main className="flex min-h-[90svh] flex-col bg-background text-foreground">
      <GalleryHeader
        categories={categoryPage.categories}
        activeCategoryPath={categoryPage.category?.path}
        isAdminMode={isAdminMode}
      />
      {hasShootSegment ? (
        <div className="flex flex-1 flex-col">
          <Outlet />
        </div>
      ) : selectedCategory && isDirectPhotoCategory ? (
        <>
          <DirectCategoryPhotoSurface
            assets={assets}
            canOrganizeAssets={canOrganizeCategoryPhotos}
            canUpload={canUploadCategoryPhotos}
            category={selectedCategory}
            columnCount={masonryColumnCount}
            connection={categoryPage.connection}
            draggingAssetId={draggingAssetId}
            dropTarget={assetDropTarget}
            isAdminMode={isAdminMode}
            isBusy={isBusy}
            selectedAssetIds={selectedAssetIds}
            uploadInputRef={uploadInputRef}
            onAssetDragEnd={handleAssetDragEnd}
            onAssetDragOver={handleAssetDragOver}
            onAssetDragStart={handleAssetDragStart}
            onAssetDrop={handleAssetDrop}
            onAssetInsertionDragOver={handleAssetInsertionDragOver}
            onAssetSelectionChange={toggleAssetSelection}
            onColumnDragOver={handleColumnDragOver}
            onColumnDrop={handleColumnDrop}
            onOpenAsset={openAssetViewer}
            onToggleHomeCarouselAsset={handleToggleHomeCarouselAsset}
            onUploadClick={handleCategoryPhotoUploadClick}
            onUploadFileChange={handleCategoryPhotoUploadFileChange}
          />
          <PhotoViewer
            activeAssetId={activeViewerAssetId}
            assets={assets}
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
      ) : selectedCategory ? (
        <>
          <CategoryShootSurface
            canCreateShoot={canCreateShoot}
            canDeleteCategory={canRenameCategory}
            canOrganize={canOrganizeShoots}
            canRenameCategory={canRenameCategory}
            category={selectedCategory}
            connection={categoryPage.connection}
            createShootFiles={createShootFiles}
            createShootName={createShootName}
            draggingShootPath={draggingShootPath}
            isAdminMode={isAdminMode}
            isBusy={isBusy}
            isCreateShootDialogOpen={isCreateShootDialogOpen}
            isRenamingCategory={isRenamingCategory}
            renameName={renameName}
            selectedShootPaths={selectedShootPaths}
            shootDropTarget={shootDropTarget}
            shoots={shoots}
            onCancelRenamingCategory={cancelRenamingCategory}
            onCreateShoot={handleCreateShoot}
            onCreateShootDialogOpenChange={handleCreateShootDialogOpenChange}
            onCreateShootFilesChange={handleCreateShootFilesChange}
            onCreateShootNameChange={setCreateShootName}
            onDeleteCategory={handleDeleteCategory}
            onDragEnd={handleShootDragEnd}
            onRenameCategory={handleRenameCategory}
            onRenameNameChange={setRenameName}
            onSetCategoryCover={handleSetCategoryCover}
            onShootDragOver={handleShootDragOver}
            onShootDragStart={handleShootDragStart}
            onShootDrop={handleShootDrop}
            onShootSelectionChange={toggleShootSelection}
            onStartRenamingCategory={startRenamingCategory}
          />
          {isAdminMode && selectedShootPaths.size > 0 ? (
            <SelectedShootsActionBar
              availableTargetCategories={moveTargetCategories}
              canDelete={canDeleteSelectedShoots}
              canMove={canMoveSelectedShoots}
              isBusy={isBusy}
              moveTargetCategoryPath={moveTargetCategoryPath}
              selectedCount={selectedShootPaths.size}
              onClearSelection={clearShootSelection}
              onDeleteSelected={handleDeleteSelectedShoots}
              onMoveSelected={handleMoveSelectedShoots}
              onMoveTargetCategoryPathChange={setMoveTargetCategoryPath}
            />
          ) : null}
        </>
      ) : (
        <MissingCategory categoryName={category} />
      )}
    </main>
  )
}

export { CategoryPage }

function DirectCategoryPhotoSurface({
  assets,
  canOrganizeAssets,
  canUpload,
  category,
  columnCount,
  connection,
  draggingAssetId,
  dropTarget,
  isAdminMode,
  isBusy,
  selectedAssetIds,
  uploadInputRef,
  onAssetDragEnd,
  onAssetDragOver,
  onAssetDragStart,
  onAssetDrop,
  onAssetInsertionDragOver,
  onAssetSelectionChange,
  onColumnDragOver,
  onColumnDrop,
  onOpenAsset,
  onToggleHomeCarouselAsset,
  onUploadClick,
  onUploadFileChange,
}: {
  assets: CloudinaryAsset[]
  canOrganizeAssets: boolean
  canUpload: boolean
  category: CloudinaryFolder
  columnCount: number
  connection: CloudinaryConnection
  draggingAssetId: string | null
  dropTarget: AssetDropTarget | null
  isAdminMode: boolean
  isBusy: boolean
  selectedAssetIds: Set<string>
  uploadInputRef: RefObject<HTMLInputElement | null>
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
  onColumnDragOver: (event: DragEvent<HTMLElement>, columnIndex: number) => void
  onColumnDrop: (event: DragEvent<HTMLElement>, columnIndex: number) => void
  onOpenAsset: (assetId: string) => void
  onToggleHomeCarouselAsset: (assetId: string, selected: boolean) => void
  onUploadClick: () => void
  onUploadFileChange: (event: ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <>
      <section className="mx-auto w-full max-w-[1540px] px-4 pb-4 sm:px-6 md:pt-0 md:pb-8 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="font-heading text-4xl leading-none tracking-normal md:text-6xl">
            {category.name}
          </h1>
          {isAdminMode ? (
            <div className="flex flex-wrap gap-2">
              <UploadPhotosButton
                canUpload={canUpload}
                isBusy={isBusy}
                uploadInputRef={uploadInputRef}
                onUploadClick={onUploadClick}
                onUploadFileChange={onUploadFileChange}
              />
            </div>
          ) : null}
        </div>
        {isAdminMode ? <ConnectionNotice connection={connection} /> : null}
      </section>
      <PhotoMasonry
        assets={assets}
        canOrganizeAssets={canOrganizeAssets}
        columnCount={columnCount}
        draggingAssetId={draggingAssetId}
        dropTarget={dropTarget}
        emptyMessage="No photos in this category yet."
        isAdminMode={isAdminMode}
        isBusy={isBusy}
        selectedAssetIds={selectedAssetIds}
        showCoverControl={false}
        shoot={category}
        onAssetDragEnd={onAssetDragEnd}
        onAssetDragOver={onAssetDragOver}
        onAssetDragStart={onAssetDragStart}
        onAssetDrop={onAssetDrop}
        onAssetInsertionDragOver={onAssetInsertionDragOver}
        onAssetSelectionChange={onAssetSelectionChange}
        onColumnDragOver={onColumnDragOver}
        onColumnDrop={onColumnDrop}
        onOpenAsset={onOpenAsset}
        onSetShootCover={() => undefined}
        onToggleHomeCarouselAsset={onToggleHomeCarouselAsset}
      />
    </>
  )
}

function CategoryShootSurface({
  canCreateShoot,
  canDeleteCategory,
  canOrganize,
  canRenameCategory,
  category,
  connection,
  createShootFiles,
  createShootName,
  draggingShootPath,
  isAdminMode,
  isBusy,
  isCreateShootDialogOpen,
  isRenamingCategory,
  renameName,
  selectedShootPaths,
  shootDropTarget,
  shoots,
  onCancelRenamingCategory,
  onCreateShoot,
  onCreateShootDialogOpenChange,
  onCreateShootFilesChange,
  onCreateShootNameChange,
  onDeleteCategory,
  onDragEnd,
  onRenameCategory,
  onRenameNameChange,
  onSetCategoryCover,
  onShootDragOver,
  onShootDragStart,
  onShootDrop,
  onShootSelectionChange,
  onStartRenamingCategory,
}: {
  canCreateShoot: boolean
  canDeleteCategory: boolean
  canOrganize: boolean
  canRenameCategory: boolean
  category: CloudinaryFolder
  connection: CloudinaryConnection
  createShootFiles: File[]
  createShootName: string
  draggingShootPath: string | null
  isAdminMode: boolean
  isBusy: boolean
  isCreateShootDialogOpen: boolean
  isRenamingCategory: boolean
  renameName: string
  selectedShootPaths: Set<string>
  shootDropTarget: ShootDropTarget | null
  shoots: CloudinaryShootSummary[]
  onCancelRenamingCategory: () => void
  onCreateShoot: (event: FormEvent<HTMLFormElement>) => void
  onCreateShootDialogOpenChange: (open: boolean) => void
  onCreateShootFilesChange: (event: ChangeEvent<HTMLInputElement>) => void
  onCreateShootNameChange: (name: string) => void
  onDeleteCategory: () => void
  onDragEnd: () => void
  onRenameCategory: (event: FormEvent<HTMLFormElement>) => void
  onRenameNameChange: (name: string) => void
  onSetCategoryCover: (shootPath: string) => void
  onShootDragOver: (event: DragEvent<HTMLElement>, shootPath: string) => void
  onShootDragStart: (event: DragEvent<HTMLElement>, shootPath: string) => void
  onShootDrop: (event: DragEvent<HTMLElement>, shootPath: string) => void
  onShootSelectionChange: (shootPath: string, selected?: boolean) => void
  onStartRenamingCategory: () => void
}) {
  const effectiveCoverPath = category.coverShootPath || shoots[0]?.path
  const renameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isRenamingCategory) {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
    }
  }, [isRenamingCategory])

  return (
    <section
      className={cn(
        "mx-auto flex w-full max-w-[1540px] flex-col px-4 sm:px-6 lg:px-8",
        isAdminMode ? "pb-16" : "pt-2 pb-6 md:pt-0 md:pb-10"
      )}
    >
      {isAdminMode ? <ConnectionNotice connection={connection} /> : null}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between md:mb-7">
        <div className="min-w-0">
          {isRenamingCategory ? (
            <form
              className="flex max-w-3xl items-center gap-3"
              onSubmit={onRenameCategory}
            >
              <Input
                ref={renameInputRef}
                aria-label="Category folder name"
                value={renameName}
                className="h-auto border-x-0 border-t-0 py-0 font-heading text-4xl leading-none tracking-normal md:text-6xl"
                disabled={!canRenameCategory || isBusy}
                onChange={(event) => onRenameNameChange(event.target.value)}
              />
              <Button
                type="submit"
                size="icon"
                disabled={
                  !canRenameCategory || isBusy || renameName.trim() === ""
                }
              >
                <CheckIcon />
                <span className="sr-only">Save category name</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={isBusy}
                onClick={onCancelRenamingCategory}
              >
                <XIcon />
                <span className="sr-only">Cancel category rename</span>
              </Button>
            </form>
          ) : (
            <h1 className="font-heading text-4xl leading-none tracking-normal md:text-6xl">
              {category.name}
            </h1>
          )}
        </div>
        {isAdminMode ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={isRenamingCategory ? "secondary" : "outline"}
              size="icon-sm"
              disabled={!canRenameCategory || isBusy}
              aria-pressed={isRenamingCategory}
              onClick={onStartRenamingCategory}
            >
              <PencilIcon />
              <span className="sr-only">Edit category name</span>
            </Button>
            <CreateShootDialog
              canCreateShoot={canCreateShoot}
              createShootFiles={createShootFiles}
              createShootName={createShootName}
              isBusy={isBusy}
              open={isCreateShootDialogOpen}
              selectedCategoryName={category.name}
              onCreateShoot={onCreateShoot}
              onFilesChange={onCreateShootFilesChange}
              onNameChange={onCreateShootNameChange}
              onOpenChange={onCreateShootDialogOpenChange}
            />
            <DeleteCategoryDialog
              canDeleteCategory={canDeleteCategory}
              category={category}
              isBusy={isBusy}
              onDeleteCategory={onDeleteCategory}
            />
          </div>
        ) : null}
      </div>
      {shoots.length > 0 || isAdminMode ? (
        <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 sm:gap-x-14 sm:gap-y-12 lg:grid-cols-3">
          {shoots.map((shoot, index) => (
            <ShootCard
              key={shoot.path}
              canOrganize={canOrganize}
              isSwapTarget={
                shootDropTarget?.shootPath === shoot.path &&
                draggingShootPath !== shoot.path
              }
              draggingShootPath={draggingShootPath}
              isAdminMode={isAdminMode}
              isBusy={isBusy}
              isCategoryCover={shoot.path === effectiveCoverPath}
              isPriority={index < 3}
              isSelected={selectedShootPaths.has(shoot.path)}
              shoot={shoot}
              onDragEnd={onDragEnd}
              onSetCategoryCover={onSetCategoryCover}
              onShootDragOver={onShootDragOver}
              onShootDragStart={onShootDragStart}
              onShootDrop={onShootDrop}
              onShootSelectionChange={onShootSelectionChange}
            />
          ))}
        </div>
      ) : (
        <p className="py-16 text-sm text-muted-foreground">
          No shoots in this category yet.
        </p>
      )}
    </section>
  )
}

function CreateShootDialog({
  canCreateShoot,
  createShootFiles,
  createShootName,
  isBusy,
  open,
  selectedCategoryName,
  onCreateShoot,
  onFilesChange,
  onNameChange,
  onOpenChange,
}: {
  canCreateShoot: boolean
  createShootFiles: File[]
  createShootName: string
  isBusy: boolean
  open: boolean
  selectedCategoryName: string
  onCreateShoot: (event: FormEvent<HTMLFormElement>) => void
  onFilesChange: (event: ChangeEvent<HTMLInputElement>) => void
  onNameChange: (name: string) => void
  onOpenChange: (open: boolean) => void
}) {
  const createShootInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      createShootInputRef.current?.focus()
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={!canCreateShoot || isBusy}
          />
        }
      >
        <PlusIcon />
        <span className="sr-only">Create shoot</span>
      </DialogTrigger>
      <DialogContent>
        <form className="grid gap-5" onSubmit={onCreateShoot}>
          <DialogHeader>
            <DialogTitle>New shoot</DialogTitle>
            <DialogDescription>{selectedCategoryName}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="new-shoot">Shoot name</Label>
              <Input
                ref={createShootInputRef}
                id="new-shoot"
                value={createShootName}
                placeholder="Shoot name"
                disabled={!canCreateShoot || isBusy}
                onChange={(event) => onNameChange(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-shoot-files">Photos</Label>
              <Input
                id="new-shoot-files"
                type="file"
                accept="image/*"
                multiple
                disabled={!canCreateShoot || isBusy}
                onChange={onFilesChange}
              />
              <p className="text-xs text-muted-foreground">
                {createShootFiles.length === 0
                  ? "No photos selected"
                  : `${createShootFiles.length} photo${
                      createShootFiles.length === 1 ? "" : "s"
                    } selected`}
              </p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              type="submit"
              variant="brand"
              disabled={
                !canCreateShoot || isBusy || createShootName.trim() === ""
              }
            >
              <PlusIcon data-icon="inline-start" />
              Create shoot
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteCategoryDialog({
  canDeleteCategory,
  category,
  isBusy,
  onDeleteCategory,
}: {
  canDeleteCategory: boolean
  category: CloudinaryFolder
  isBusy: boolean
  onDeleteCategory: () => void
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant="destructive"
            size="icon-sm"
            disabled={!canDeleteCategory || isBusy}
          />
        }
      >
        <Trash2Icon />
        <span className="sr-only">Delete category</span>
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete category?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete &quot;{category.name}&quot;, every
            shoot inside this category, and all photos in those shoots. This
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="ghost" disabled={isBusy}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant="destructive"
            disabled={!canDeleteCategory || isBusy}
            onClick={onDeleteCategory}
          >
            <Trash2Icon data-icon="inline-start" />
            Delete category
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function ShootCard({
  canOrganize,
  draggingShootPath,
  isAdminMode,
  isBusy,
  isCategoryCover,
  isPriority,
  isSelected,
  isSwapTarget,
  shoot,
  onDragEnd,
  onSetCategoryCover,
  onShootDragOver,
  onShootDragStart,
  onShootDrop,
  onShootSelectionChange,
}: {
  canOrganize: boolean
  draggingShootPath: string | null
  isAdminMode: boolean
  isBusy: boolean
  isCategoryCover: boolean
  isPriority: boolean
  isSelected: boolean
  isSwapTarget: boolean
  shoot: CloudinaryShootSummary
  onDragEnd: () => void
  onSetCategoryCover: (shootPath: string) => void
  onShootDragOver: (event: DragEvent<HTMLElement>, shootPath: string) => void
  onShootDragStart: (event: DragEvent<HTMLElement>, shootPath: string) => void
  onShootDrop: (event: DragEvent<HTMLElement>, shootPath: string) => void
  onShootSelectionChange: (shootPath: string, selected?: boolean) => void
}) {
  const shootRouteParams = useMemo(
    () => ({
      category: toMediaRouteSegment(shoot.categoryName),
      shoot: toMediaRouteSegment(shoot.name),
    }),
    [shoot.categoryName, shoot.name]
  )

  const shootPreview = (
    <div className="relative aspect-[3/4]">
      {shoot.cover ? (
        <ProgressiveImage
          src={shoot.cover.thumbnailUrl}
          srcSet={shoot.cover.thumbnailSrcSet}
          sizes={CARD_IMAGE_SIZES}
          alt={shoot.name}
          draggable={false}
          className={cn(
            "absolute inset-0 size-full object-cover transition duration-300",
            isAdminMode && isSelected
              ? "scale-[1.015] brightness-90"
              : "group-hover:scale-[1.035]"
          )}
          {...getImageLoadingProps(isPriority)}
        />
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:42px_42px]" />
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-3 py-2.5 text-white">
        <h2 className="font-sans text-xs leading-tight font-semibold tracking-[0.12em] uppercase sm:text-sm">
          {shoot.name}
        </h2>
        <p className="mt-0.5 text-[0.625rem] leading-tight font-medium tracking-[0.12em] text-white/70 uppercase sm:text-[0.6875rem]">
          {shoot.assetCount} photos
        </p>
      </div>
    </div>
  )

  return (
    <article
      draggable={isAdminMode && canOrganize && !isBusy}
      className={cn(
        "group relative overflow-hidden border bg-muted transition duration-200",
        isAdminMode && canOrganize && !isBusy
          ? "cursor-grab active:cursor-grabbing"
          : "",
        isSwapTarget ? "ring-2 ring-brand/70" : "",
        isAdminMode && isSelected ? "ring-2 ring-brand/70" : "",
        draggingShootPath === shoot.path
          ? "opacity-45 ring-2 ring-brand/50"
          : ""
      )}
      onDragStart={(event) => onShootDragStart(event, shoot.path)}
      onDragOver={(event) => onShootDragOver(event, shoot.path)}
      onDrop={(event) => onShootDrop(event, shoot.path)}
      onDragEnd={onDragEnd}
    >
      {isSwapTarget ? (
        <div className="pointer-events-none absolute inset-2 z-30 border-2 border-brand shadow-[0_0_0_1px_hsl(var(--background)),0_0_18px_hsl(var(--brand)/0.6)]" />
      ) : null}
      <Link
        to={getMediaShootRoute(isAdminMode)}
        params={shootRouteParams}
        draggable={isAdminMode && canOrganize && !isBusy}
        className="block w-full text-left ring-offset-background transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onDragStart={(event) => {
          event.stopPropagation()

          if (isAdminMode) {
            onShootDragStart(event, shoot.path)
          }
        }}
        onDragOver={(event) => {
          event.stopPropagation()

          if (isAdminMode) {
            onShootDragOver(event, shoot.path)
          }
        }}
        onDrop={(event) => {
          event.stopPropagation()

          if (isAdminMode) {
            onShootDrop(event, shoot.path)
          }
        }}
        onDragEnd={(event) => {
          event.stopPropagation()

          if (isAdminMode) {
            onDragEnd()
          }
        }}
      >
        {shootPreview}
      </Link>
      {isAdminMode ? (
        <>
          <Checkbox
            checked={isSelected}
            disabled={isBusy}
            aria-label={isSelected ? "Deselect shoot" : "Select shoot"}
            className={cn(
              "absolute top-3 left-3 z-20 size-5 border-background/80 bg-background/90 text-primary-foreground shadow-sm transition-opacity",
              isSelected
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            )}
            onClick={(event) => event.stopPropagation()}
            onCheckedChange={(checked) =>
              onShootSelectionChange(shoot.path, checked)
            }
          />
          <Button
            type="button"
            variant={isCategoryCover ? "brand" : "secondary"}
            size="sm"
            className={cn(
              "absolute right-3 bottom-3 z-20 h-8 px-2.5 text-xs shadow-sm backdrop-blur transition-opacity",
              isCategoryCover
                ? "opacity-100"
                : "bg-background/90 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            )}
            disabled={!canOrganize || isBusy}
            onClick={(event) => {
              event.stopPropagation()
              onSetCategoryCover(shoot.path)
            }}
          >
            <StarIcon data-icon="inline-start" />
            Cover
          </Button>
        </>
      ) : null}
    </article>
  )
}

function SelectedShootsActionBar({
  availableTargetCategories,
  canDelete,
  canMove,
  isBusy,
  moveTargetCategoryPath,
  selectedCount,
  onClearSelection,
  onDeleteSelected,
  onMoveSelected,
  onMoveTargetCategoryPathChange,
}: {
  availableTargetCategories: CloudinaryCategoryPage["categories"]
  canDelete: boolean
  canMove: boolean
  isBusy: boolean
  moveTargetCategoryPath: string
  selectedCount: number
  onClearSelection: () => void
  onDeleteSelected: () => void
  onMoveSelected: () => void
  onMoveTargetCategoryPathChange: (categoryPath: string) => void
}) {
  return (
    <div className="fixed inset-x-4 bottom-6 z-50 mx-auto flex w-fit max-w-[calc(100vw-2rem)] flex-wrap items-center justify-center gap-3 border bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
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
      <Dialog>
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!canMove || isBusy}
            />
          }
        >
          <FolderInputIcon data-icon="inline-start" />
          Move
        </DialogTrigger>
        <DialogContent>
          <form
            className="grid gap-5"
            onSubmit={(event) => {
              event.preventDefault()
              onMoveSelected()
            }}
          >
            <DialogHeader>
              <DialogTitle>Move selected shoots</DialogTitle>
              <DialogDescription>
                Choose the category that should receive {selectedCount} shoot
                {selectedCount === 1 ? "" : "s"}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="move-shoots-category">Category</Label>
              <Select
                value={moveTargetCategoryPath}
                onValueChange={(value) => {
                  if (value) {
                    onMoveTargetCategoryPathChange(value)
                  }
                }}
              >
                <SelectTrigger
                  id="move-shoots-category"
                  className="w-full"
                  disabled={!canMove || isBusy}
                >
                  <SelectValue placeholder="Choose category" />
                </SelectTrigger>
                <SelectContent align="start">
                  {availableTargetCategories.map((category) => (
                    <SelectItem key={category.path} value={category.path}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancel
              </DialogClose>
              <Button
                type="submit"
                variant="brand"
                disabled={!canMove || isBusy}
              >
                <FolderInputIcon data-icon="inline-start" />
                Move shoots
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
            <AlertDialogTitle>Delete selected shoots?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedCount} selected shoot
              {selectedCount === 1 ? "" : "s"} and all photos inside. This
              cannot be undone.
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
              Delete shoots
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function MissingCategory({ categoryName }: { categoryName: string }) {
  return (
    <section className="mx-auto flex min-h-[58svh] w-full max-w-[1540px] flex-col justify-center px-4 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
        Category not found
      </p>
      <h1 className="mt-4 font-heading text-5xl tracking-[0.12em] uppercase">
        {categoryName}
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

function swapShoots(
  shoots: CloudinaryShootSummary[],
  draggedShootPath: string,
  targetShootPath: string
) {
  const fromIndex = shoots.findIndex((shoot) => shoot.path === draggedShootPath)
  const toIndex = shoots.findIndex((shoot) => shoot.path === targetShootPath)

  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return null
  }

  const nextShoots = shoots.slice()
  const draggedShoot = nextShoots[fromIndex]
  const targetShoot = nextShoots[toIndex]

  if (!draggedShoot || !targetShoot) {
    return null
  }

  nextShoots[fromIndex] = targetShoot
  nextShoots[toIndex] = draggedShoot

  return nextShoots
}

function getAssetDropPosition(
  event: DragEvent<HTMLElement>
): AssetDropPosition {
  const bounds = event.currentTarget.getBoundingClientRect()
  const midpoint = bounds.top + bounds.height / 2

  return event.clientY < midpoint ? "before" : "after"
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
