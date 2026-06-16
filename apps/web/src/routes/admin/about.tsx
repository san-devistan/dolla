import { getCloudinaryAboutFn } from "@/features/cloudinary/cloudinary.functions"
import { requireAdminAuth } from "@/lib/admin-route-auth"
import { createNoindexSeoHead } from "@/lib/seo"
import { AboutPage } from "@/routes/about"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/admin/about")({
  beforeLoad: ({ location }) => requireAdminAuth(location),
  loader: () => getCloudinaryAboutFn(),
  head: () => createNoindexSeoHead("Admin about | Dolla Shashin"),
  component: AdminAboutPage,
})

function AdminAboutPage() {
  const initialAbout = Route.useLoaderData()

  return <AboutPage initialAbout={initialAbout} isAdminMode />
}
