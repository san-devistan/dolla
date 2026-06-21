import { getContactPageFn } from "@/features/contact/functions"
import { ContactPage } from "@/features/contact/page"
import { createContactSeoHead } from "@/lib/seo"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/contact")({
  loader: () => getContactPageFn(),
  head: () => createContactSeoHead(),
  component: PublicContactRoute,
})

type ContactRoutePageData = Awaited<ReturnType<typeof getContactPageFn>>

function PublicContactRoute() {
  const initialPage = Route.useLoaderData()

  return <ContactRoutePage initialPage={initialPage} isAdminMode={false} />
}

function ContactRoutePage({
  initialPage,
  isAdminMode,
}: {
  initialPage: ContactRoutePageData
  isAdminMode: boolean
}) {
  return (
    <ContactPage
      categories={initialPage.categories}
      contactConnection={initialPage.contactConnection}
      initialSettings={initialPage.settings}
      isAdminMode={isAdminMode}
      mediaConnection={initialPage.mediaConnection}
    />
  )
}

export { ContactRoutePage }
