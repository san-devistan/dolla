import { getCloudinaryHomeFn } from "@/features/cloudinary/data/functions"
import { DollaHomePage } from "@/features/cloudinary/home/_pages/page"
import { createHomeSeoHead } from "@/lib/seo"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({
  loader: () => getCloudinaryHomeFn({ data: {} }),
  head: ({ loaderData }) => createHomeSeoHead(loaderData),
  component: PublicDollaHomePage,
})

function PublicDollaHomePage() {
  const initialHome = Route.useLoaderData()

  return <DollaHomePage initialHome={initialHome} isAdminMode={false} />
}
