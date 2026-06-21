import { AboutPage } from "@/features/cloudinary/about/_pages/page"
import { getCloudinaryAboutFn } from "@/features/cloudinary/data/functions"
import { createAboutSeoHead } from "@/lib/seo"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/about")({
  loader: () => getCloudinaryAboutFn(),
  head: ({ loaderData }) => createAboutSeoHead(loaderData?.image),
  component: PublicAboutPage,
})

function PublicAboutPage() {
  const initialAbout = Route.useLoaderData()

  return <AboutPage initialAbout={initialAbout} isAdminMode={false} />
}
