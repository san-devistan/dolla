import { requireAdminAuth } from "@/lib/admin-route-auth"
import { ADMIN_SHOOT_ROUTE } from "@/lib/admin-routes"
import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/admin/media/$category/$shoot")({
  beforeLoad: ({ location }) => requireAdminAuth(location),
  loader: ({ params }) => {
    throw redirect({
      to: ADMIN_SHOOT_ROUTE,
      params: {
        category: params.category,
        shoot: params.shoot,
      },
    })
  },
})
