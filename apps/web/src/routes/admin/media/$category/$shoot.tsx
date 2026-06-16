import { requireAdminAuth } from "@/lib/admin-route-auth"
import { ADMIN_SHOOT_ROUTE } from "@/lib/admin-routes"
import { createNoindexSeoHead } from "@/lib/seo"
import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/admin/media/$category/$shoot")({
  beforeLoad: ({ location }) => requireAdminAuth(location),
  head: () => createNoindexSeoHead("Admin media | Dolla Shashin"),
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
