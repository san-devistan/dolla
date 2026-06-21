const UPLOAD_IMAGE_SHORTEST_EDGE = 1500
const UPLOAD_IMAGE_QUALITY = 0.9
const NON_RESIZABLE_IMAGE_TYPES = new Set(["image/gif", "image/svg+xml"])

async function prepareImageUploadFiles(files: File[]) {
  return await Promise.all(files.map(prepareImageUploadFile))
}

async function prepareImageUploadFile(file: File) {
  if (!canResizeImageFile(file)) {
    return file
  }

  let bitmap: ImageBitmap | null = null

  try {
    bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    })
    const shortestEdge = Math.min(bitmap.width, bitmap.height)

    if (shortestEdge <= UPLOAD_IMAGE_SHORTEST_EDGE) {
      return file
    }

    const scale = UPLOAD_IMAGE_SHORTEST_EDGE / shortestEdge
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)
    const blob = await resizeImageBitmap({
      bitmap,
      fileType: file.type,
      height,
      width,
    })

    if (!blob) {
      return file
    }

    return new File([blob], getProcessedFileName(file, blob.type), {
      lastModified: file.lastModified,
      type: blob.type,
    })
  } catch {
    return file
  } finally {
    bitmap?.close()
  }
}

function canResizeImageFile(file: File) {
  return (
    typeof window !== "undefined" &&
    typeof createImageBitmap === "function" &&
    file.type.startsWith("image/") &&
    !NON_RESIZABLE_IMAGE_TYPES.has(file.type)
  )
}

async function resizeImageBitmap({
  bitmap,
  fileType,
  height,
  width,
}: {
  bitmap: ImageBitmap
  fileType: string
  height: number
  width: number
}) {
  const canvas = document.createElement("canvas")
  const outputType = getOutputImageType(fileType)

  canvas.width = width
  canvas.height = height

  const context = canvas.getContext("2d", {
    alpha: outputType === "image/png",
  })

  if (!context) {
    return null
  }

  context.drawImage(bitmap, 0, 0, width, height)

  return await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, outputType, UPLOAD_IMAGE_QUALITY)
  })
}

function getOutputImageType(fileType: string) {
  if (fileType === "image/png" || fileType === "image/webp") {
    return fileType
  }

  return "image/jpeg"
}

function getProcessedFileName(file: File, fileType: string) {
  const extension =
    fileType === "image/png"
      ? "png"
      : fileType === "image/webp"
        ? "webp"
        : "jpg"
  const baseName = file.name.replace(/\.[^.]+$/, "")

  return `${baseName || "photo"}.${extension}`
}

export { prepareImageUploadFiles }
