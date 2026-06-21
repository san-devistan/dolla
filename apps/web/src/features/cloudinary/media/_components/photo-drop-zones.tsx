import type { AssetDropPosition } from "@/features/cloudinary/media/_lib/asset-layout"
import { useStableCallback } from "@/features/cloudinary/shared/use-stable-callback"
import { cn } from "@workspace/ui/lib/utils"
import type { DragEvent } from "react"

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
  const handleDragOver = useStableCallback((event: DragEvent<HTMLElement>) => {
    onDragOver(event, assetId, position)
  })
  const handleDrop = useStableCallback((event: DragEvent<HTMLElement>) => {
    onDrop(event, assetId)
  })

  return (
    <div
      className="min-h-12 border border-dashed border-brand bg-brand/10 transition"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
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
  const handleDragOver = useStableCallback((event: DragEvent<HTMLElement>) => {
    onDragOver(event, columnIndex)
  })
  const handleDrop = useStableCallback((event: DragEvent<HTMLElement>) => {
    onDrop(event, columnIndex)
  })

  return (
    <div
      className={cn(
        "min-h-12 border border-dashed border-transparent transition",
        isDragging
          ? "border-foreground/20 bg-muted/35 opacity-100"
          : "pointer-events-none opacity-0",
        isActive ? "border-brand bg-brand/10" : ""
      )}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <span className="sr-only">Drop at end of column {columnIndex + 1}</span>
    </div>
  )
}

export { AssetInsertionDropZone, ColumnEndDropZone }
