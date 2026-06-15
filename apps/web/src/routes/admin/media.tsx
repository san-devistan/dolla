import { requireAdminAuth } from "@/lib/admin-route-auth"
import { ADMIN_HOME_ROUTE, ADMIN_LEGACY_MEDIA_ROUTE } from "@/lib/admin-routes"
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/admin/media")({
  beforeLoad: async ({ location }) => {
    if (location.pathname === ADMIN_LEGACY_MEDIA_ROUTE) {
      throw redirect({ to: ADMIN_HOME_ROUTE })
    }

    await requireAdminAuth(location)
  },
  component: Outlet,
})
