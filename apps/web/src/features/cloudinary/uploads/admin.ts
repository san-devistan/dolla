type AdminCloudinaryUploadTarget = "about-image"

type AdminCloudinaryUploadOptions = {
  files: File[]
  folderPath?: string
  target?: AdminCloudinaryUploadTarget
}

type CloudinaryDirectUploadSignature = {
  apiKey: string
  uploadUrl: string
  fields: Record<string, string>
}

async function uploadAdminCloudinaryFiles({
  files,
  folderPath = "Dolla",
  target,
}: AdminCloudinaryUploadOptions) {
  if (files.length === 0) {
    return []
  }

  const signature = await requestUploadSignature({ folderPath, target })

  return Promise.all(
    files.map(async (file) => {
      const uploadResult = await uploadFileToCloudinary(file, signature)

      return completeUpload({ folderPath, target, uploadResult })
    })
  )
}

async function requestUploadSignature({
  folderPath,
  target,
}: {
  folderPath: string
  target?: AdminCloudinaryUploadTarget
}) {
  const response = await fetch("/api/cloudinary/upload", {
    body: JSON.stringify({
      action: "sign",
      folderPath,
      target,
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  })
  const result = await readJsonResponse(response)

  if (!response.ok) {
    throw new Error(getUploadError(result) || "Upload failed.")
  }

  if (!isUploadSignature(result)) {
    throw new Error("Cloudinary upload signature was invalid.")
  }

  return result
}

async function uploadFileToCloudinary(
  file: File,
  signature: CloudinaryDirectUploadSignature
) {
  const formData = new FormData()

  formData.set("file", file)
  formData.set("api_key", signature.apiKey)

  for (const [key, value] of Object.entries(signature.fields)) {
    formData.set(key, value)
  }

  const response = await fetch(signature.uploadUrl, {
    body: formData,
    method: "POST",
  })
  const result = await readJsonResponse(response)

  if (!response.ok) {
    throw new Error(getUploadError(result) || "Cloudinary upload failed.")
  }

  return result
}

async function completeUpload({
  folderPath,
  target,
  uploadResult,
}: {
  folderPath: string
  target?: AdminCloudinaryUploadTarget
  uploadResult: unknown
}) {
  const response = await fetch("/api/cloudinary/upload", {
    body: JSON.stringify({
      action: "complete",
      folderPath,
      target,
      uploadResult,
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  })
  const result = await readJsonResponse(response)

  if (!response.ok) {
    throw new Error(getUploadError(result) || "Upload failed.")
  }

  return result
}

async function readJsonResponse(response: Response) {
  const text = await response.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    return { error: text }
  }
}

function isUploadSignature(
  value: unknown
): value is CloudinaryDirectUploadSignature {
  if (!value || typeof value !== "object") {
    return false
  }

  const apiKey = Reflect.get(value, "apiKey")
  const uploadUrl = Reflect.get(value, "uploadUrl")
  const fields = Reflect.get(value, "fields")

  return (
    typeof apiKey === "string" &&
    typeof uploadUrl === "string" &&
    Boolean(fields) &&
    typeof fields === "object"
  )
}

function getUploadError(result: unknown) {
  if (!result || typeof result !== "object") {
    return null
  }

  const error = Reflect.get(result, "error")

  if (typeof error === "string") {
    return error
  }

  if (error && typeof error === "object") {
    const message = Reflect.get(error, "message")

    return typeof message === "string" ? message : null
  }

  return null
}

export { uploadAdminCloudinaryFiles }
