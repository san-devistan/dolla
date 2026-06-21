import { PhotoMasonry } from "@/features/cloudinary/media/_components/photo-masonry"
import { PhotoViewer } from "@/features/cloudinary/media/_components/photo-viewer"
import { SelectedPhotosActionBar } from "@/features/cloudinary/media/_components/selected-photos-action-bar"
import { ShootCredits } from "@/features/cloudinary/shoot/_components/credits"
import { MissingShoot } from "@/features/cloudinary/shoot/_components/missing"
import { ShootTitle } from "@/features/cloudinary/shoot/_components/title"
import {
  type ShootPageController,
  useShootPageController,
} from "@/features/cloudinary/shoot/_lib/controller"
import type {
  CloudinaryFolder,
  CloudinaryShootPage,
} from "@/lib/cloudinary.server"

type ShootRouteParams = {
  category: string
  shoot: string
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
  return (
    <ShootPageContent
      key={getShootPageKey(initialShootPage)}
      initialShootPage={initialShootPage}
      isAdminMode={isAdminMode}
      params={params}
    />
  )
}

function ShootPageContent({
  initialShootPage,
  isAdminMode,
  params,
}: {
  initialShootPage: CloudinaryShootPage
  isAdminMode: boolean
  params: ShootRouteParams
}) {
  const controller = useShootPageController({ initialShootPage, isAdminMode })

  if (!controller.categoryFolder || !controller.shootFolder) {
    return (
      <MissingShoot categoryName={params.category} shootName={params.shoot} />
    )
  }

  return (
    <ShootPageView
      category={controller.categoryFolder}
      controller={controller}
      shoot={controller.shootFolder}
    />
  )
}

function ShootPageView({
  category,
  controller,
  shoot,
}: {
  category: CloudinaryFolder
  controller: ShootPageController
  shoot: CloudinaryFolder
}) {
  return (
    <>
      <ShootTitle
        category={category}
        connection={controller.shootPage.connection}
        mode={controller.shootTitleMode}
        shoot={shoot}
        uploadInputRef={controller.uploadInputRef}
        onCancelRenamingShoot={controller.actions.cancelRenamingShoot}
        onDeleteShoot={controller.actions.handleDeleteShoot}
        onRenameNameChange={controller.actions.setRenameName}
        onRenameShoot={controller.actions.handleRenameShoot}
        onStartRenamingShoot={controller.actions.startRenamingShoot}
        onUploadClick={controller.actions.handleUploadClick}
        onUploadFileChange={controller.actions.handleUploadFileChange}
      />
      <PhotoMasonry
        assets={controller.shootPage.assets}
        columnCount={controller.masonryColumnCount}
        handlers={controller.photoMasonryHandlers}
        mode={controller.photoMasonryMode}
        shoot={shoot}
      />
      <ShootCredits
        credits={shoot.credits || ""}
        mode={controller.shootCreditsMode}
        onCancelEditingCredits={controller.actions.cancelEditingCredits}
        onCreditsDraftChange={controller.actions.setCreditsDraft}
        onSaveCredits={controller.actions.handleSaveCredits}
        onStartEditingCredits={controller.actions.startEditingCredits}
      />
      <PhotoViewer
        activeAssetId={controller.activeViewerAssetId}
        assets={controller.shootPage.assets}
        onClose={controller.actions.closeAssetViewer}
        onSelectAsset={controller.actions.setActiveViewerAssetId}
      />
      {controller.isAdminMode && controller.selectedAssetIds.size > 0 ? (
        <SelectedPhotosActionBar
          canDelete={controller.canDeleteSelectedAssets}
          isBusy={controller.isBusy}
          selectedCount={controller.selectedAssetIds.size}
          onClearSelection={controller.actions.clearAssetSelection}
          onDeleteSelected={controller.actions.handleDeleteSelectedAssets}
        />
      ) : null}
    </>
  )
}

function getShootPageKey(shootPage: CloudinaryShootPage) {
  return JSON.stringify({
    assets: shootPage.assets.map((asset) => asset.assetId),
    category: shootPage.category?.path,
    shoot: shootPage.shoot?.path,
  })
}

export { ShootPage }
