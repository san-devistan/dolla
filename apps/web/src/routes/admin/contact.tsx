import { getContactPageFn } from "@/features/contact/contact.functions"
import { requireAdminAuth } from "@/lib/admin-route-auth"
import { ContactRoutePage } from "@/routes/contact"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/admin/contact")({
  beforeLoad: ({ location }) => requireAdminAuth(location),
  loader: () => getContactPageFn(),
  head: () => ({
    meta: [
      {
        title: "Admin contact | Dolla Shashin",
      },
    ],
  }),
  component: AdminContactPage,
})

function AdminContactPage() {
  const initialPage = Route.useLoaderData()

  return <ContactRoutePage initialPage={initialPage} isAdminMode />
}
