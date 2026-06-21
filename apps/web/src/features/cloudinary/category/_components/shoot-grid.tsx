import {
  ShootCard,
  type ShootCardMode,
} from "@/features/cloudinary/category/_components/shoot-card"
import type {
  CategoryShootSurfaceHandlers,
  CategoryShootSurfaceMode,
} from "@/features/cloudinary/category/_types/shoot"
import type {
  CloudinaryFolder,
  CloudinaryShootSummary,
} from "@/lib/cloudinary.server"

function CategoryShootGrid({
  category,
  handlers,
  mode,
  shoots,
}: {
  category: CloudinaryFolder
  handlers: CategoryShootSurfaceHandlers
  mode: CategoryShootSurfaceMode
  shoots: CloudinaryShootSummary[]
}) {
  const effectiveCoverPath = category.coverShootPath || shoots[0]?.path

  return (
    <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 sm:gap-x-14 sm:gap-y-12 lg:grid-cols-3">
      {shoots.map((shoot, index) => (
        <ShootCard
          key={shoot.path}
          handlers={handlers}
          index={index}
          isAdminMode={mode.type === "admin"}
          mode={getShootCardMode({
            effectiveCoverPath,
            mode,
            shoot,
          })}
          shoot={shoot}
        />
      ))}
    </div>
  )
}

function getShootCardMode({
  effectiveCoverPath,
  mode,
  shoot,
}: {
  effectiveCoverPath: string | undefined
  mode: CategoryShootSurfaceMode
  shoot: CloudinaryShootSummary
}): ShootCardMode {
  if (mode.type === "public") {
    return {
      type: "public",
      isCategoryCover: shoot.path === effectiveCoverPath,
    }
  }

  return {
    type: "admin",
    canOrganize: mode.canOrganize,
    draggingShootPath: mode.draggingShootPath,
    isBusy: mode.isBusy,
    isCategoryCover: shoot.path === effectiveCoverPath,
    isSelected: mode.selectedShootPaths.has(shoot.path),
    isSwapTarget:
      mode.shootDropTarget?.shootPath === shoot.path &&
      mode.draggingShootPath !== shoot.path,
  }
}

export { CategoryShootGrid }
