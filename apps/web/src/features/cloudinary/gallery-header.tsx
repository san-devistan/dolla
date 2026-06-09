import { getMediaAdminSearch } from "@/lib/media-admin-mode"
import { toMediaRouteSegment } from "@/lib/media-route-segment"
import { Link, useRouterState } from "@tanstack/react-router"
import { Badge } from "@workspace/ui/components/badge"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

type GalleryCategory = {
  name: string
  path: string
}

type GalleryHeaderProps<TCategory extends GalleryCategory> = {
  activeCategoryPath?: string
  categories: TCategory[]
  isAdminMode?: boolean
  isBusy?: boolean
  onSelectCategory?: (category: TCategory) => void
}

function GalleryHeader<TCategory extends GalleryCategory>({
  activeCategoryPath,
  categories,
  isAdminMode = false,
  isBusy = false,
  onSelectCategory,
}: GalleryHeaderProps<TCategory>) {
  const currentPathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  return (
    <header
      className={cn(
        "mx-auto w-full max-w-[1540px] px-4 pb-5 text-center sm:px-6 lg:px-8",
        isAdminMode ? "pt-6" : "pt-10"
      )}
    >
      <div
        className={cn(
          "grid grid-cols-1 items-center gap-y-5",
          isAdminMode && "lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
        )}
      >
        {isAdminMode ? (
          <div className="flex min-w-max items-center justify-end gap-3 justify-self-end lg:col-start-3 lg:row-start-1">
            <Badge
              variant="outline"
              className="border border-border px-3 py-2 text-[0.625rem] text-foreground"
            >
              Admin view
            </Badge>
            <a
              href={currentPathname}
              className={buttonVariants({
                variant: "ghost",
                size: "sm",
                className: "font-black tracking-[0.22em]",
              })}
            >
              Public view
            </a>
          </div>
        ) : null}
        <Link
          to="/"
          search={getMediaAdminSearch(isAdminMode)}
          className={cn(
            "justify-self-center font-sans text-3xl font-extrabold tracking-[0.1em] uppercase md:text-4xl",
            isAdminMode && "lg:col-start-2 lg:row-start-1"
          )}
        >
          Dolla Shashin
        </Link>
      </div>
      <nav
        aria-label="Main navigation"
        className="mt-8 flex flex-wrap justify-center gap-x-14 gap-y-3 text-sm tracking-wide uppercase"
      >
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
          {categories.map((category) =>
            onSelectCategory ? (
              <button
                key={category.path}
                type="button"
                disabled={isBusy}
                className={getCategoryLinkClass(
                  category.path === activeCategoryPath
                )}
                onClick={() => onSelectCategory(category)}
              >
                {category.name}
              </button>
            ) : (
              <Link
                key={category.path}
                to="/$category"
                params={{ category: toMediaRouteSegment(category.name) }}
                search={getMediaAdminSearch(isAdminMode)}
                className={getCategoryLinkClass(
                  category.path === activeCategoryPath
                )}
              >
                {category.name}
              </Link>
            )
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
          <Link
            to="/about"
            search={getMediaAdminSearch(isAdminMode)}
            className={getCategoryLinkClass(currentPathname === "/about")}
          >
            About
          </Link>
          <Link
            to="/pricing"
            search={getMediaAdminSearch(isAdminMode)}
            className={getCategoryLinkClass(currentPathname === "/pricing")}
          >
            Pricing
          </Link>
        </div>
      </nav>
    </header>
  )
}

function getCategoryLinkClass(isActive: boolean) {
  return cn(
    "border-b border-transparent pb-1 transition-colors disabled:pointer-events-none disabled:opacity-50",
    isActive
      ? "border-foreground"
      : "hover:border-muted-foreground hover:text-brand"
  )
}

export { GalleryHeader }
export type { GalleryCategory }
