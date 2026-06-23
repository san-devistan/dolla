import {
  createCloudinaryFolderFn,
  getCloudinaryHomeFn,
  reorderCloudinaryCategoriesFn,
} from "@/features/cloudinary/data/functions"
import type { CloudinaryHome } from "@/lib/cloudinary.server"
import { useServerFn } from "@tanstack/react-start"
import { toast } from "@workspace/ui/lib/toast"
import {
  type DragEvent,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  useCallback,
  useState,
} from "react"

type CategoryDropTarget = {
  categoryPath: string
}

function useHomePageController(initialHome: CloudinaryHome) {
  const [home, setHome] = useState(initialHome)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isCreateCategoryDialogOpen, setIsCreateCategoryDialogOpen] =
    useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const getHome = useServerFn(getCloudinaryHomeFn)
  const createFolder = useServerFn(createCloudinaryFolderFn)
  const reorderCategories = useServerFn(reorderCloudinaryCategoriesFn)
  const canMutate =
    home.connection.configured && !home.connection.error && !isBusy
  const canOrganizeCategories = canMutate && home.categories.length > 0
  const categoryOrder = useHomeCategoryOrderController({
    canOrganizeCategories,
    home,
    reorderCategories,
    setHome,
  })

  const performHomeAction = useCallback(
    async (action: () => Promise<CloudinaryHome>) => {
      setIsBusy(true)

      try {
        const nextHome = await action()

        setHome(nextHome)

        if (nextHome.connection.error) {
          throw new Error(nextHome.connection.error)
        }

        return nextHome
      } finally {
        setIsBusy(false)
      }
    },
    []
  )

  const handleCreateCategoryDialogOpenChange = useCallback((open: boolean) => {
    setIsCreateCategoryDialogOpen(open)

    if (!open) {
      setNewCategoryName("")
    }
  }, [])

  const handleCreateCategory = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      const nextCategoryName = newCategoryName.trim()

      if (!nextCategoryName) {
        return
      }

      const createCategoryPromise = performHomeAction(async () => {
        await createFolder({
          data: {
            name: nextCategoryName,
            parentPath: home.rootFolder,
          },
        })

        return await getHome({ data: {} })
      })

      toast.promise(createCategoryPromise, {
        loading: "Creating category...",
        success: "Category created",
        error: (createError: unknown) => getErrorMessage(createError),
      })

      void createCategoryPromise
        .then(() => {
          setNewCategoryName("")
          setIsCreateCategoryDialogOpen(false)
          return undefined
        })
        .catch(() => undefined)
    },
    [createFolder, getHome, home.rootFolder, newCategoryName, performHomeAction]
  )

  return {
    canMutate,
    canOrganizeCategories,
    categoryDropTarget: categoryOrder.categoryDropTarget,
    draggingCategoryPath: categoryOrder.draggingCategoryPath,
    handleCategoryDragEnd: categoryOrder.resetCategoryDrag,
    handleCategoryDragOver: categoryOrder.handleCategoryDragOver,
    handleCategoryDragStart: categoryOrder.handleCategoryDragStart,
    handleCategoryDrop: categoryOrder.handleCategoryDrop,
    handleCreateCategory,
    handleCreateCategoryDialogOpenChange,
    home,
    isBusy,
    isCreateCategoryDialogOpen,
    newCategoryName,
    setNewCategoryName,
  }
}

function useHomeCategoryOrderController({
  canOrganizeCategories,
  home,
  reorderCategories,
  setHome,
}: {
  canOrganizeCategories: boolean
  home: CloudinaryHome
  reorderCategories: (args: {
    data: { categoryPaths: string[] }
  }) => Promise<unknown>
  setHome: Dispatch<SetStateAction<CloudinaryHome>>
}) {
  const [draggingCategoryPath, setDraggingCategoryPath] = useState<
    string | null
  >(null)
  const [categoryDropTarget, setCategoryDropTarget] =
    useState<CategoryDropTarget | null>(null)

  const resetCategoryDrag = useCallback(() => {
    setDraggingCategoryPath(null)
    setCategoryDropTarget(null)
  }, [])

  const saveCategoryOrder = useCallback(
    (nextCategories: CloudinaryHome["categories"]) => {
      if (!canOrganizeCategories) {
        return
      }

      const previousHome = home

      setHome({ ...home, categories: nextCategories })
      resetCategoryDrag()

      void reorderCategories({
        data: {
          categoryPaths: nextCategories.map((category) => category.path),
        },
      })
        .then(() => {
          toast.success("Category order saved")
          return undefined
        })
        .catch((orderError) => {
          setHome(previousHome)
          toast.error(getErrorMessage(orderError))
          return undefined
        })
    },
    [canOrganizeCategories, home, reorderCategories, resetCategoryDrag, setHome]
  )

  const handleCategoryDragStart = useCallback(
    (event: DragEvent<HTMLElement>, categoryPath: string) => {
      if (!canOrganizeCategories) {
        return
      }

      event.dataTransfer.effectAllowed = "move"
      event.dataTransfer.setData("text/plain", categoryPath)
      setDraggingCategoryPath(categoryPath)
    },
    [canOrganizeCategories]
  )

  const handleCategoryDragOver = useCallback(
    (event: DragEvent<HTMLElement>, categoryPath: string) => {
      if (!canOrganizeCategories || draggingCategoryPath === categoryPath) {
        return
      }

      event.preventDefault()
      event.dataTransfer.dropEffect = "move"
      setCategoryDropTarget((currentDropTarget) =>
        currentDropTarget?.categoryPath === categoryPath
          ? currentDropTarget
          : { categoryPath }
      )
    },
    [canOrganizeCategories, draggingCategoryPath]
  )

  const handleCategoryDrop = useCallback(
    (event: DragEvent<HTMLElement>, categoryPath: string) => {
      if (!canOrganizeCategories) {
        return
      }

      event.preventDefault()

      const draggedCategoryPath =
        event.dataTransfer.getData("text/plain") || draggingCategoryPath

      if (!draggedCategoryPath || draggedCategoryPath === categoryPath) {
        return
      }

      const nextCategories = swapItemsById(
        home.categories,
        draggedCategoryPath,
        categoryPath,
        (category) => category.path
      )

      if (nextCategories) {
        saveCategoryOrder(nextCategories)
      }
    },
    [
      canOrganizeCategories,
      draggingCategoryPath,
      home.categories,
      saveCategoryOrder,
    ]
  )

  return {
    categoryDropTarget,
    draggingCategoryPath,
    handleCategoryDragOver,
    handleCategoryDragStart,
    handleCategoryDrop,
    resetCategoryDrag,
  }
}

function swapItemsById<T>(
  items: T[],
  draggedId: string,
  targetId: string,
  getItemId: (item: T) => string
) {
  const fromIndex = items.findIndex((item) => getItemId(item) === draggedId)
  const toIndex = items.findIndex((item) => getItemId(item) === targetId)

  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return null
  }

  const nextItems = items.slice()
  const draggedItem = nextItems[fromIndex]
  const targetItem = nextItems[toIndex]

  if (!draggedItem || !targetItem) {
    return null
  }

  nextItems[fromIndex] = targetItem
  nextItems[toIndex] = draggedItem

  return nextItems
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return "Something went wrong."
}

export { useHomePageController }
export type { CategoryDropTarget }
