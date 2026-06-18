import { assertAdminAuthenticated } from "@/lib/admin-auth.server"
import {
  completeCloudinaryDirectUpload,
  createCloudinaryDirectUploadSignature,
  getCloudinaryErrorMessage,
  normalizeDollaFolderPath,
  replaceCloudinaryAboutImage,
  uploadCloudinaryFile,
} from "@/lib/cloudinary.server"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/api/cloudinary/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          assertAdminAuthenticated()
        } catch (error) {
          return Response.json(
            { error: getAdminAuthErrorMessage(error) },
            { status: 401 }
          )
        }

        try {
          if (isJsonRequest(request)) {
            return Response.json(await handleDirectUploadRequest(request))
          }

          const formData = await request.formData()
          const folderEntry = formData.get("folderPath")
          const folderPath = normalizeDollaFolderPath(
            typeof folderEntry === "string" ? folderEntry : "Dolla"
          )
          const targetEntry = formData.get("target")
          const target = typeof targetEntry === "string" ? targetEntry : ""
          const files = formData.getAll("files").filter(isFileEntry)

          if (files.length === 0) {
            return Response.json(
              { error: "Choose at least one file to upload." },
              { status: 400 }
            )
          }

          if (target === "about-image") {
            const file = files[0]

            if (!file) {
              return Response.json(
                { error: "Choose an image to upload." },
                { status: 400 }
              )
            }

            const about = await replaceCloudinaryAboutImage(file)

            return Response.json({ about })
          }

          const assets = await Promise.all(
            files.map((file) => uploadCloudinaryFile(file, folderPath))
          )

          return Response.json({ assets, folderPath })
        } catch (error) {
          return Response.json(
            { error: getCloudinaryErrorMessage(error) },
            { status: 400 }
          )
        }
      },
    },
  },
})

async function handleDirectUploadRequest(request: Request) {
  const payload = await request.json()
  const action = getStringField(payload, "action")
  const folderPath = normalizeDollaFolderPath(
    getStringField(payload, "folderPath", "Dolla")
  )
  const target = getStringField(payload, "target")

  if (action === "sign") {
    return createCloudinaryDirectUploadSignature({ folderPath, target })
  }

  if (action === "complete") {
    return completeCloudinaryDirectUpload({
      folderPath,
      target,
      uploadResult: getObjectField(payload, "uploadResult"),
    })
  }

  throw new Error("Unsupported Cloudinary upload action.")
}

function isJsonRequest(request: Request) {
  return request.headers
    .get("content-type")
    ?.toLowerCase()
    .includes("application/json")
}

function isFileEntry(value: FormDataEntryValue): value is File {
  return typeof File !== "undefined" && value instanceof File
}

function getStringField(data: unknown, key: string, fallback = "") {
  if (!data || typeof data !== "object") {
    return fallback
  }

  const value = Reflect.get(data, key)

  return typeof value === "string" ? value : fallback
}

function getObjectField(data: unknown, key: string) {
  if (!data || typeof data !== "object") {
    return null
  }

  const value = Reflect.get(data, key)

  return value && typeof value === "object" ? value : null
}

function getAdminAuthErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Admin authentication required."
}
