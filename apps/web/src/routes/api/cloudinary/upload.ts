import {
  getCloudinaryErrorMessage,
  normalizeDollaFolderPath,
  uploadCloudinaryFile,
} from "@/lib/cloudinary.server"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/api/cloudinary/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const formData = await request.formData()
          const folderEntry = formData.get("folderPath")
          const folderPath = normalizeDollaFolderPath(
            typeof folderEntry === "string" ? folderEntry : "Dolla"
          )
          const files = formData.getAll("files").filter(isFileEntry)

          if (files.length === 0) {
            return Response.json(
              { error: "Choose at least one file to upload." },
              { status: 400 }
            )
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

function isFileEntry(value: FormDataEntryValue): value is File {
  return typeof File !== "undefined" && value instanceof File
}
