import { ADMIN_HOME_ROUTE } from "@/lib/admin-routes"
import { createNoindexSeoHead } from "@/lib/seo"
import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/admin/home")({
  beforeLoad: () => {
    throw redirect({ to: ADMIN_HOME_ROUTE })
  },
  head: () => createNoindexSeoHead("Admin home | Dolla Shashin"),
})
