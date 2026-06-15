import { getCloudinaryPricingFn } from "@/features/cloudinary/cloudinary.functions"
import { PricingPage } from "@/features/pricing/pricing-page"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/pricing")({
  loader: () => getCloudinaryPricingFn(),
  head: () => ({
    meta: [
      {
        title: "Tarifs | Dolla Shashin",
      },
    ],
  }),
  component: PublicPricingPage,
})

function PublicPricingPage() {
  const initialPricing = Route.useLoaderData()

  return <PricingPage initialPricing={initialPricing} isAdminMode={false} />
}

export { PricingPage }
