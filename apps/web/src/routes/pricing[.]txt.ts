import { getCloudinaryPricing } from "@/lib/cloudinary.server"
import { createPricingMarkdown } from "@/lib/seo"
import { createFileRoute } from "@tanstack/react-router"

const TEXT_HEADERS = {
  "Cache-Control": "public, max-age=3600",
  "Content-Type": "text/plain; charset=utf-8",
}

export const Route = createFileRoute("/pricing.txt")({
  server: {
    handlers: {
      GET: async () => {
        const pricing = await getCloudinaryPricing()

        return new Response(createPricingMarkdown(pricing), {
          headers: TEXT_HEADERS,
        })
      },
    },
  },
})
