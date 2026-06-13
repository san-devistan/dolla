import {
  getAdminAuthStateFn,
  loginAdminFn,
} from "@/features/admin/admin-auth.functions"
import { getSafeAdminRedirect } from "@/lib/admin-routes"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { AlertTriangleIcon, LockKeyholeIcon } from "lucide-react"
import { type FormEvent, useState } from "react"

type AdminLoginSearch = {
  redirect: string
}

export const Route = createFileRoute("/admin/login")({
  validateSearch: (search: Record<string, unknown>): AdminLoginSearch => ({
    redirect: getSafeAdminRedirect(
      typeof search.redirect === "string" ? search.redirect : undefined
    ),
  }),
  beforeLoad: async ({ search }) => {
    const authState = await getAdminAuthStateFn()

    if (authState.isAuthenticated) {
      throw redirect({ href: search.redirect })
    }

    return { authState }
  },
  head: () => ({
    meta: [
      {
        title: "Admin login | Dolla Shashin",
      },
    ],
  }),
  component: AdminLoginPage,
})

function AdminLoginPage() {
  const { authState } = Route.useRouteContext()
  const { redirect } = Route.useSearch()
  const loginAdmin = useServerFn(loginAdminFn)
  const [secret, setSecret] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submitLogin()
  }

  async function submitLogin() {
    if (!authState.isConfigured || isBusy) {
      return
    }

    setIsBusy(true)
    setErrorMessage(null)

    try {
      const result = await loginAdmin({ data: { secret } })

      if (result.status === "success") {
        window.location.assign(redirect)
        return
      }

      setErrorMessage(getLoginErrorMessage(result.status))
    } catch (error) {
      setErrorMessage(getUnknownErrorMessage(error))
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <main className="flex min-h-[90svh] items-center justify-center bg-background px-4 py-16 text-foreground">
      <section className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex size-12 items-center justify-center border border-border">
            <LockKeyholeIcon className="size-5" aria-hidden="true" />
          </div>
          <h1 className="font-sans text-2xl font-extrabold tracking-[0.12em] uppercase">
            Admin
          </h1>
        </div>
        <form className="space-y-5" onSubmit={handleLogin}>
          <div className="space-y-2">
            <Label htmlFor="admin-secret">Secret</Label>
            <Input
              id="admin-secret"
              type="password"
              autoComplete="current-password"
              value={secret}
              disabled={!authState.isConfigured || isBusy}
              onChange={(event) => setSecret(event.target.value)}
            />
          </div>
          {!authState.isConfigured ? (
            <AdminLoginNotice message="ADMIN_SECRET is not set for apps/web." />
          ) : errorMessage ? (
            <AdminLoginNotice message={errorMessage} />
          ) : null}
          <Button
            type="submit"
            className="w-full"
            disabled={!authState.isConfigured || isBusy || !secret.trim()}
          >
            {isBusy ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </section>
    </main>
  )
}

function AdminLoginNotice({ message }: { message: string }) {
  return (
    <p className="flex items-start gap-2 text-sm text-destructive">
      <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </p>
  )
}

function getLoginErrorMessage(status: "missing-secret" | "invalid-secret") {
  return status === "missing-secret"
    ? "ADMIN_SECRET is not set for apps/web."
    : "Invalid admin secret."
}

function getUnknownErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to sign in."
}
