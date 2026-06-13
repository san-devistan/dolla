import { getAdminAuthStateFn } from "@/features/admin/admin-auth.functions"
import { ADMIN_LOGIN_ROUTE, getSafeAdminRedirect } from "@/lib/admin-routes"
import { redirect } from "@tanstack/react-router"

type AdminRouteLocation = {
  href: string
}

async function requireAdminAuth(location: AdminRouteLocation) {
  const authState = await getAdminAuthStateFn()

  if (!authState.isAuthenticated) {
    throw redirect({
      to: ADMIN_LOGIN_ROUTE,
      search: {
        redirect: getSafeAdminRedirect(location.href),
      },
    })
  }

  return { adminAuth: authState }
}

export { requireAdminAuth }
