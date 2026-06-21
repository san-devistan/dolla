import { useCategoryPageController } from "@/features/cloudinary/category/_lib/controller"
import { CategoryPageView } from "@/features/cloudinary/category/_pages/view"
import type { CloudinaryCategoryPage } from "@/lib/cloudinary.server"

function CategoryPage({
  category,
  initialCategoryPage,
  isAdminMode,
}: {
  category: string
  initialCategoryPage: CloudinaryCategoryPage
  isAdminMode: boolean
}) {
  return (
    <CategoryPageContent
      key={getCategoryPageKey(initialCategoryPage)}
      category={category}
      initialCategoryPage={initialCategoryPage}
      isAdminMode={isAdminMode}
    />
  )
}

function CategoryPageContent({
  category,
  initialCategoryPage,
  isAdminMode,
}: {
  category: string
  initialCategoryPage: CloudinaryCategoryPage
  isAdminMode: boolean
}) {
  const controller = useCategoryPageController({
    category,
    initialCategoryPage,
    isAdminMode,
  })

  return <CategoryPageView categoryName={category} controller={controller} />
}

function getCategoryPageKey(categoryPage: CloudinaryCategoryPage) {
  return JSON.stringify({
    assets: categoryPage.assets.map((asset) => asset.assetId),
    category: categoryPage.category?.path,
    shoots: categoryPage.shoots.map((shoot) => shoot.path),
  })
}

export { CategoryPage }
