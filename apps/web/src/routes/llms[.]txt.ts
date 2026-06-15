import {
  getCloudinaryHome,
  getCloudinaryPricing,
} from "@/lib/cloudinary.server"
import { createLlmsText } from "@/lib/seo"
import { createFileRoute } from "@tanstack/react-router"

const TEXT_HEADERS = {
  "Cache-Control": "public, max-age=3600",
  "Content-Type": "text/plain; charset=utf-8",
}

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () => {
        const [home, pricing] = await Promise.all([
          getCloudinaryHome(),
          getCloudinaryPricing(),
        ])

        return new Response(createLlmsText({ home, pricing }), {
          headers: TEXT_HEADERS,
        })
      },
    },
  },
})
