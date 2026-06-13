import { requireAdminAuth } from "@/lib/admin-route-auth"
import { ADMIN_CATEGORY_ROUTE } from "@/lib/admin-routes"
import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/admin/media/$category")({
  beforeLoad: ({ location }) => requireAdminAuth(location),
  loader: ({ params }) => {
    throw redirect({
      to: ADMIN_CATEGORY_ROUTE,
      params: { category: params.category },
    })
  },
})
