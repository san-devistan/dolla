import { getCloudinaryPricingFn } from "@/features/cloudinary/data/functions"
import { requireAdminAuth } from "@/lib/admin-route-auth"
import { createNoindexSeoHead } from "@/lib/seo"
import { PricingPage } from "@/routes/pricing"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/admin/pricing")({
  beforeLoad: ({ location }) => requireAdminAuth(location),
  loader: () => getCloudinaryPricingFn(),
  head: () => createNoindexSeoHead("Admin tarifs | Dolla Shashin"),
  component: AdminPricingPage,
})

function AdminPricingPage() {
  const initialPricing = Route.useLoaderData()

  return <PricingPage initialPricing={initialPricing} isAdminMode />
}
