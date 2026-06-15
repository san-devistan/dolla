import type { CloudinaryHome, CloudinaryPricing } from "@/lib/cloudinary.server"
import { toMediaRouteSegment } from "@/lib/media-route-segment"

import { SERVICE_AREA, SITE_URL } from "./constants"
import { getAbsoluteUrl } from "./utils"

function createLlmsText({
  home,
  pricing,
}: {
  home?: CloudinaryHome
  pricing?: CloudinaryPricing
}) {
  const categories = createLlmsCategoryList(home)
  const prices = createLlmsPricingList(pricing)

  return `# Dolla Shashin\n\nDolla Shashin is the portfolio and booking website for Dounia Limam, a professional photographer based in Paris, France.\n\n## Services\n\nDolla Shashin photographs weddings, portraits, events, fashion/editorial work, creative projects, and commercial shoots in Paris and Ile-de-France.\n\n## Key Pages\n\n- [Home](${SITE_URL}/)\n- [Pricing](${SITE_URL}/pricing)\n- [About](${SITE_URL}/about)\n- [Contact](${SITE_URL}/contact)\n- [Machine-readable pricing](${SITE_URL}/pricing.txt)\n\n## Portfolio Categories\n\n${categories}\n\n## Pricing Summary\n\n${prices}\n\n## Contact\n\nUse the public contact page for reservations and project inquiries: ${SITE_URL}/contact\n`
}

function createPricingMarkdown(pricing?: CloudinaryPricing) {
  const prices = createPricingMarkdownItems(pricing)

  return `# Pricing - Dolla Shashin\n\nDolla Shashin offers photography services in Paris and Ile-de-France. Prices vary by project scope, event duration, location, usage rights, and retouching needs.\n\n${prices}\n## Booking\n- Contact: ${SITE_URL}/contact\n- Service area: ${SERVICE_AREA}\n`
}

function createLlmsCategoryList(home: CloudinaryHome | undefined) {
  return (
    home?.categories
      .map(
        (category) =>
          `- [${category.name}](${getAbsoluteUrl(`/${toMediaRouteSegment(category.name)}`)})`
      )
      .join("\n") || "- Portfolio categories are loaded from the public site."
  )
}

function createLlmsPricingList(pricing: CloudinaryPricing | undefined) {
  return (
    pricing?.items
      .map((item) => {
        const description = item.description ? ` - ${item.description}` : ""

        return `- ${item.name}: ${item.price}${description}`
      })
      .join("\n") || "- Tarifs sur demande."
  )
}

function createPricingMarkdownItems(pricing: CloudinaryPricing | undefined) {
  if (!pricing?.items.length) {
    return "## Tarifs sur demande\n- Price: Contact Dolla Shashin for a custom quote.\n- Currency: EUR\n"
  }

  return pricing.items.map(createPricingMarkdownItem).join("\n")
}

function createPricingMarkdownItem(item: CloudinaryPricing["items"][number]) {
  const description = item.description
    ? `- Description: ${item.description}\n`
    : ""

  return `## ${item.name}\n- Price: ${item.price}\n${description}- Currency: EUR\n`
}

export { createLlmsText, createPricingMarkdown }
