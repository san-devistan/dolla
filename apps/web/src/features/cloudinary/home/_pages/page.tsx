import { CategoryGrid } from "@/features/cloudinary/home/_components/category-grid"
import { ConnectionNotice } from "@/features/cloudinary/home/_components/connection-notice"
import { CreateCategoryDialog } from "@/features/cloudinary/home/_components/create-category-dialog"
import { HomeHeroCarousel } from "@/features/cloudinary/home/_components/hero-carousel"
import { useHomePageController } from "@/features/cloudinary/home/_lib/controller"
import { GalleryHeader } from "@/features/cloudinary/navigation/_components/gallery-header"
import type { CloudinaryHome } from "@/lib/cloudinary.server"
import { useIsMobile } from "@workspace/ui/hooks/use-mobile"
import { cn } from "@workspace/ui/lib/utils"
import { useMemo } from "react"

function DollaHomePage({
  initialHome,
  isAdminMode,
}: {
  initialHome: CloudinaryHome
  isAdminMode: boolean
}) {
  const resetKey = useMemo(() => getHomePageKey(initialHome), [initialHome])

  return (
    <DollaHomePageContent
      key={resetKey}
      initialHome={initialHome}
      isAdminMode={isAdminMode}
    />
  )
}

function DollaHomePageContent({
  initialHome,
  isAdminMode,
}: {
  initialHome: CloudinaryHome
  isAdminMode: boolean
}) {
  const isMobile = useIsMobile()
  const controller = useHomePageController(initialHome)

  return (
    <main className="flex min-h-[90svh] flex-col bg-background text-foreground">
      <GalleryHeader
        categories={controller.home.categories}
        isAdminMode={isAdminMode}
      />
      <section
        className={cn(
          "mx-auto flex w-full max-w-[1540px] flex-col px-4 sm:px-6 lg:px-8",
          isAdminMode ? "pb-16" : "pt-2 pb-6 md:pt-0 md:pb-10"
        )}
      >
        {isAdminMode ? (
          <ConnectionNotice connection={controller.home.connection} />
        ) : null}
        {isMobile ? null : (
          <HomeHeroCarousel
            assets={controller.home.heroAssets}
            isAdminMode={isAdminMode}
          />
        )}
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between md:my-10">
          <div>
            <h1 className="font-heading text-4xl leading-none tracking-normal md:text-6xl">
              Photographe à Paris
            </h1>
          </div>
          {isAdminMode ? (
            <div className="flex flex-wrap gap-2">
              <CreateCategoryDialog
                canCreateCategory={controller.canMutate}
                isBusy={controller.isBusy}
                newCategoryName={controller.newCategoryName}
                open={controller.isCreateCategoryDialogOpen}
                onCreateCategory={controller.handleCreateCategory}
                onNameChange={controller.setNewCategoryName}
                onOpenChange={controller.handleCreateCategoryDialogOpenChange}
              />
            </div>
          ) : null}
        </div>
        <CategoryGrid
          canOrganizeCategories={controller.canOrganizeCategories}
          categories={controller.home.categories}
          categoryDropTarget={controller.categoryDropTarget}
          draggingCategoryPath={controller.draggingCategoryPath}
          isAdminMode={isAdminMode}
          isBusy={controller.isBusy}
          onCategoryDragEnd={controller.handleCategoryDragEnd}
          onCategoryDragOver={controller.handleCategoryDragOver}
          onCategoryDragStart={controller.handleCategoryDragStart}
          onCategoryDrop={controller.handleCategoryDrop}
        />
      </section>
    </main>
  )
}

function getHomePageKey(home: CloudinaryHome) {
  return JSON.stringify({
    categories: home.categories.map((category) => category.path),
    heroAssets: home.heroAssets.map((asset) => asset.assetId),
  })
}

export { DollaHomePage }
