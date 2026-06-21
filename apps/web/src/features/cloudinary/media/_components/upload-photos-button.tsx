import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { PlusIcon } from "lucide-react"
import type { ChangeEvent, RefObject } from "react"

function UploadPhotosButton({
  canUpload,
  isBusy,
  uploadInputRef,
  onUploadClick,
  onUploadFileChange,
}: {
  canUpload: boolean
  isBusy: boolean
  uploadInputRef: RefObject<HTMLInputElement | null>
  onUploadClick: () => void
  onUploadFileChange: (event: ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        disabled={!canUpload || isBusy}
        onClick={onUploadClick}
      >
        <PlusIcon />
        <span className="sr-only">Upload photos</span>
      </Button>
      <Input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        tabIndex={-1}
        disabled={!canUpload || isBusy}
        onChange={onUploadFileChange}
      />
    </>
  )
}

export { UploadPhotosButton }
