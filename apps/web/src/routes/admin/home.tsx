import { ADMIN_HOME_ROUTE } from "@/lib/admin-routes"
import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/admin/home")({
  beforeLoad: () => {
    throw redirect({ to: ADMIN_HOME_ROUTE })
  },
})
