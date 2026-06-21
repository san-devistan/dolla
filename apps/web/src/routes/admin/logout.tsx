import { logoutAdminFn } from "@/features/admin/auth.functions"
import { ADMIN_HOME_ROUTE, ADMIN_LOGIN_ROUTE } from "@/lib/admin-routes"
import { createNoindexSeoHead } from "@/lib/seo"
import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/admin/logout")({
  loader: async () => {
    await logoutAdminFn()

    throw redirect({
      to: ADMIN_LOGIN_ROUTE,
      search: { redirect: ADMIN_HOME_ROUTE },
    })
  },
  head: () => createNoindexSeoHead("Admin logout | Dolla Shashin"),
})
