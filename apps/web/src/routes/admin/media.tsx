import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/admin/media")({
  loader: () => {
    throw redirect({
      to: "/",
      search: { admin: true },
    })
  },
})
