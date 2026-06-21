import type {
  CloudinaryCategoryPage,
  CloudinaryFolder,
  CloudinaryShootSummary,
} from "@/lib/cloudinary.server"
import { getCategorySeoDescription } from "@/lib/seo"

function getEditableCategoryDescription(
  category: CloudinaryFolder | undefined
) {
  if (!category) {
    return ""
  }

  return normalizeCategoryDescriptionDraft(
    category.description ?? getCategorySeoDescription(category.name)
  )
}

function getEffectiveMoveTargetCategoryPath(
  categories: CloudinaryCategoryPage["categories"],
  selectedPath: string
) {
  if (categories.some((category) => category.path === selectedPath)) {
    return selectedPath
  }

  return categories[0]?.path || ""
}

function normalizeCategoryDescriptionDraft(description: string) {
  return description.trim().replace(/\s+/g, " ")
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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return "Something went wrong."
}

export {
  getEditableCategoryDescription,
  getEffectiveMoveTargetCategoryPath,
  getErrorMessage,
  normalizeCategoryDescriptionDraft,
  swapShoots,
}
