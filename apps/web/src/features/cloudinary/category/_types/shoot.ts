import type { ShootCardHandlers } from "@/features/cloudinary/category/_components/shoot-card"
import type { ShootDropTarget } from "@/features/cloudinary/category/_lib/action-types"
import type { ChangeEvent, FormEvent } from "react"

type CategoryShootSurfaceMode =
  | {
      type: "admin"
      canCreateShoot: boolean
      canDeleteCategory: boolean
      canEditDescription: boolean
      canOrganize: boolean
      canRenameCategory: boolean
      createShootFiles: File[]
      createShootName: string
      descriptionDraft: string
      draggingShootPath: string | null
      isBusy: boolean
      isCreateShootDialogOpen: boolean
      isRenamingCategory: boolean
      renameName: string
      selectedShootPaths: Set<string>
      shootDropTarget: ShootDropTarget | null
    }
  | {
      type: "public"
      descriptionDraft: string
    }

type CategoryShootSurfaceHandlers = ShootCardHandlers & {
  onCancelRenamingCategory: () => void
  onCreateShoot: (event: FormEvent<HTMLFormElement>) => void
  onCreateShootDialogOpenChange: (open: boolean) => void
  onCreateShootFilesChange: (event: ChangeEvent<HTMLInputElement>) => void
  onCreateShootNameChange: (name: string) => void
  onDeleteCategory: () => void
  onDescriptionDraftChange: (description: string) => void
  onRenameCategory: (event: FormEvent<HTMLFormElement>) => void
  onRenameNameChange: (name: string) => void
  onStartRenamingCategory: () => void
}

export type { CategoryShootSurfaceHandlers, CategoryShootSurfaceMode }
