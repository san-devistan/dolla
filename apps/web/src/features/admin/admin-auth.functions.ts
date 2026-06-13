import {
  getAdminAuthState,
  loginAdmin,
  logoutAdmin,
} from "@/lib/admin-auth.server"
import { createServerFn } from "@tanstack/react-start"

function getStringField(data: unknown, key: string, fallback = "") {
  if (!data || typeof data !== "object") {
    return fallback
  }

  const value = Reflect.get(data, key)

  return typeof value === "string" ? value : fallback
}

const loginAdminInput = (data: unknown) => ({
  secret: getStringField(data, "secret"),
})

const getAdminAuthStateFn = createServerFn({ method: "GET" }).handler(
  async () => getAdminAuthState()
)

const loginAdminFn = createServerFn({ method: "POST" })
  .inputValidator(loginAdminInput)
  .handler(async ({ data }) => loginAdmin(data.secret))

const logoutAdminFn = createServerFn({ method: "GET" }).handler(async () => {
  logoutAdmin()

  return { status: "success" as const }
})

export { getAdminAuthStateFn, loginAdminFn, logoutAdminFn }
