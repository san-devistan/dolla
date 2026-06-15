import { Footer } from "@/components/footer"
import { ThemeProvider } from "@/components/theme-provider"
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_NAME } from "@/lib/seo"
import type { QueryClient } from "@tanstack/react-query"
import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router"
import { Toaster } from "@workspace/ui/components/sonner"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import appCss from "@workspace/ui/globals.css?url"

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: DEFAULT_TITLE,
      },
      {
        name: "description",
        content: DEFAULT_DESCRIPTION,
      },
      {
        name: "application-name",
        content: SITE_NAME,
      },
      {
        name: "theme-color",
        content: "#ffffff",
      },
      {
        name: "format-detection",
        content: "telephone=no, address=no, email=no",
      },
      {
        name: "geo.region",
        content: "FR-75",
      },
      {
        name: "geo.placename",
        content: "Paris",
      },
      {
        name: "geo.position",
        content: "48.8566;2.3522",
      },
      {
        name: "ICBM",
        content: "48.8566, 2.3522",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        href: "/favicon.ico",
      },
      {
        rel: "manifest",
        href: "/manifest.json",
      },
    ],
  }),
  notFoundComponent: () => (
    <main className="container mx-auto p-4 pt-16">
      <h1>404</h1>
      <p>The requested page could not be found.</p>
    </main>
  ),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="flex min-h-svh flex-col bg-background text-foreground">
        <ThemeProvider>
          <TooltipProvider>
            {children}
            <Footer />
          </TooltipProvider>
          <Toaster />
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
