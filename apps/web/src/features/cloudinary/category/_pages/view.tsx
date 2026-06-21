import {
  DirectCategoryPhotoSurface,
  type DirectCategoryPhotoSurfaceHandlers,
  type DirectCategoryPhotoSurfaceMode,
} from "@/features/cloudinary/category/_components/direct-photo-surface"
import { MissingCategory } from "@/features/cloudinary/category/_components/missing"
import {
  SelectedShootsActionBar,
  type SelectedShootsActionMode,
} from "@/features/cloudinary/category/_components/selected-shoots-action-bar"
import { CategoryShootSurface } from "@/features/cloudinary/category/_components/shoot-surface"
import { type CategoryPageController } from "@/features/cloudinary/category/_lib/controller"
import type {
  CategoryShootSurfaceHandlers,
  CategoryShootSurfaceMode,
} from "@/features/cloudinary/category/_types/shoot"
import { PhotoViewer } from "@/features/cloudinary/media/_components/photo-viewer"
import { SelectedPhotosActionBar } from "@/features/cloudinary/media/_components/selected-photos-action-bar"
import { GalleryHeader } from "@/features/cloudinary/navigation/_components/gallery-header"
import { Outlet } from "@tanstack/react-router"
import { useMemo } from "react"

function CategoryPageView({
  categoryName,
  controller,
}: {
  categoryName: string
  controller: CategoryPageController
}) {
  const directCategoryMode = useDirectCategoryPhotoSurfaceMode(controller)
  const directCategoryHandlers = useDirectCategoryPhotoSurfaceHandlers(
    controller.actions
  )
  const shootSurfaceMode = useCategoryShootSurfaceMode(controller)
  const shootSurfaceHandlers = useCategoryShootSurfaceHandlers(
    controller.actions
  )
  const selectedShootsMode = useSelectedShootsActionMode(controller)

  return (
    <main className="flex min-h-[90svh] flex-col bg-background text-foreground">
      <GalleryHeader
        categories={controller.categoryPage.categories}
        activeCategoryPath={controller.categoryPage.category?.path}
        isAdminMode={controller.isAdminMode}
      />
      {controller.hasShootSegment ? (
        <div className="flex flex-1 flex-col">
          <Outlet />
        </div>
      ) : controller.selectedCategory && controller.isDirectPhotoCategory ? (
        <DirectCategoryPhotoPage
          controller={controller}
          handlers={directCategoryHandlers}
          mode={directCategoryMode}
        />
      ) : controller.selectedCategory ? (
        <CategoryShootPage
          controller={controller}
          handlers={shootSurfaceHandlers}
          selectedShootsMode={selectedShootsMode}
          surfaceMode={shootSurfaceMode}
        />
      ) : (
        <MissingCategory categoryName={categoryName} />
      )}
    </main>
  )
}

function DirectCategoryPhotoPage({
  controller,
  handlers,
  mode,
}: {
  controller: CategoryPageController
  handlers: DirectCategoryPhotoSurfaceHandlers
  mode: DirectCategoryPhotoSurfaceMode
}) {
  if (!controller.selectedCategory) {
    return null
  }

  return (
    <>
      <DirectCategoryPhotoSurface
        assets={controller.assets}
        category={controller.selectedCategory}
        columnCount={controller.masonryColumnCount}
        connection={controller.categoryPage.connection}
        handlers={handlers}
        mode={mode}
      />
      <PhotoViewer
        activeAssetId={controller.state.activeViewerAssetId}
        assets={controller.assets}
        onClose={controller.actions.closeAssetViewer}
        onSelectAsset={controller.actions.setActiveViewerAssetId}
      />
      {controller.isAdminMode && controller.state.selectedAssetIds.size > 0 ? (
        <SelectedPhotosActionBar
          canDelete={controller.canDeleteSelectedAssets}
          isBusy={controller.isBusy}
          selectedCount={controller.state.selectedAssetIds.size}
          onClearSelection={controller.actions.clearAssetSelection}
          onDeleteSelected={controller.actions.handleDeleteSelectedAssets}
        />
      ) : null}
    </>
  )
}

function CategoryShootPage({
  controller,
  handlers,
  selectedShootsMode,
  surfaceMode,
}: {
  controller: CategoryPageController
  handlers: CategoryShootSurfaceHandlers
  selectedShootsMode: SelectedShootsActionMode
  surfaceMode: CategoryShootSurfaceMode
}) {
  if (!controller.selectedCategory) {
    return null
  }

  return (
    <>
      <CategoryShootSurface
        category={controller.selectedCategory}
        connection={controller.categoryPage.connection}
        handlers={handlers}
        mode={surfaceMode}
        shoots={controller.shoots}
      />
      {controller.isAdminMode &&
      controller.state.selectedShootPaths.size > 0 ? (
        <SelectedShootsActionBar
          availableTargetCategories={controller.moveTargetCategories}
          mode={selectedShootsMode}
          moveTargetCategoryPath={controller.effectiveMoveTargetCategoryPath}
          selectedCount={controller.state.selectedShootPaths.size}
          onClearSelection={controller.actions.clearShootSelection}
          onDeleteSelected={controller.actions.handleDeleteSelectedShoots}
          onMoveSelected={controller.actions.handleMoveSelectedShoots}
          onMoveTargetCategoryPathChange={
            controller.actions.setMoveTargetCategoryPath
          }
        />
      ) : null}
    </>
  )
}

function useDirectCategoryPhotoSurfaceMode(controller: CategoryPageController) {
  return useMemo<DirectCategoryPhotoSurfaceMode>(
    () =>
      controller.isAdminMode
        ? {
            type: "admin",
            canEditDescription: controller.canEditCategoryDescription,
            canOrganizeAssets: controller.canOrganizeCategoryPhotos,
            canUpload: controller.canUploadCategoryPhotos,
            descriptionDraft: controller.state.descriptionDraft,
            draggingAssetId: controller.state.draggingAssetId,
            dropTarget: controller.state.assetDropTarget,
            isBusy: controller.isBusy,
            isEditingCategory: controller.state.isRenamingCategory,
            selectedAssetIds: controller.state.selectedAssetIds,
            uploadInputRef: controller.uploadInputRef,
          }
        : {
            type: "public",
            descriptionDraft: controller.state.descriptionDraft,
          },
    [controller]
  )
}

function useDirectCategoryPhotoSurfaceHandlers(
  actions: CategoryPageController["actions"]
) {
  return useMemo<DirectCategoryPhotoSurfaceHandlers>(
    () => ({
      onAssetDragEnd: actions.handleAssetDragEnd,
      onAssetDragOver: actions.handleAssetDragOver,
      onAssetDragStart: actions.handleAssetDragStart,
      onAssetDrop: actions.handleAssetDrop,
      onAssetInsertionDragOver: actions.handleAssetInsertionDragOver,
      onAssetSelectionChange: actions.toggleAssetSelection,
      onCancelCategoryEdit: actions.cancelRenamingCategory,
      onColumnDragOver: actions.handleColumnDragOver,
      onColumnDrop: actions.handleColumnDrop,
      onDescriptionDraftChange: actions.setDescriptionDraft,
      onOpenAsset: actions.openAssetViewer,
      onSaveCategoryEdit: actions.handleRenameCategory,
      onStartCategoryEdit: actions.startRenamingCategory,
      onToggleHomeCarouselAsset: actions.handleToggleHomeCarouselAsset,
      onUploadClick: actions.handleCategoryPhotoUploadClick,
      onUploadFileChange: actions.handleCategoryPhotoUploadFileChange,
    }),
    [actions]
  )
}

function useCategoryShootSurfaceMode(controller: CategoryPageController) {
  return useMemo<CategoryShootSurfaceMode>(
    () =>
      controller.isAdminMode
        ? {
            type: "admin",
            canCreateShoot: controller.canCreateShoot,
            canDeleteCategory: controller.canRenameCategory,
            canEditDescription: controller.canEditCategoryDescription,
            canOrganize: controller.canOrganizeShoots,
            canRenameCategory: controller.canRenameCategory,
            createShootFiles: controller.state.createShootFiles,
            createShootName: controller.state.createShootName,
            descriptionDraft: controller.state.descriptionDraft,
            draggingShootPath: controller.state.draggingShootPath,
            isBusy: controller.isBusy,
            isCreateShootDialogOpen: controller.state.isCreateShootDialogOpen,
            isRenamingCategory: controller.state.isRenamingCategory,
            renameName: controller.state.renameName,
            selectedShootPaths: controller.state.selectedShootPaths,
            shootDropTarget: controller.state.shootDropTarget,
          }
        : {
            type: "public",
            descriptionDraft: controller.state.descriptionDraft,
          },
    [controller]
  )
}

function useCategoryShootSurfaceHandlers(
  actions: CategoryPageController["actions"]
) {
  return useMemo<CategoryShootSurfaceHandlers>(
    () => ({
      onCancelRenamingCategory: actions.cancelRenamingCategory,
      onCreateShoot: actions.handleCreateShoot,
      onCreateShootDialogOpenChange: actions.handleCreateShootDialogOpenChange,
      onCreateShootFilesChange: actions.handleCreateShootFilesChange,
      onCreateShootNameChange: actions.setCreateShootName,
      onDeleteCategory: actions.handleDeleteCategory,
      onDescriptionDraftChange: actions.setDescriptionDraft,
      onDragEnd: actions.handleShootDragEnd,
      onRenameCategory: actions.handleRenameCategory,
      onRenameNameChange: actions.setRenameName,
      onSetCategoryCover: actions.handleSetCategoryCover,
      onShootDragOver: actions.handleShootDragOver,
      onShootDragStart: actions.handleShootDragStart,
      onShootDrop: actions.handleShootDrop,
      onShootSelectionChange: actions.toggleShootSelection,
      onStartRenamingCategory: actions.startRenamingCategory,
    }),
    [actions]
  )
}

function useSelectedShootsActionMode(controller: CategoryPageController) {
  return useMemo<SelectedShootsActionMode>(
    () => ({
      canDelete: controller.canDeleteSelectedShoots,
      canMove: controller.canMoveSelectedShoots,
      isBusy: controller.isBusy,
    }),
    [controller]
  )
}

export { CategoryPageView }
