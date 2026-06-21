import { MobileGalleryHeader } from "@/features/cloudinary/navigation/_components/mobile-gallery-header"
import {
  getAboutRoute,
  getContactRoute,
  getMediaCategoryRoute,
  getMediaHomeRoute,
  getPricingRoute,
} from "@/lib/admin-routes"
import { toMediaRouteSegment } from "@/lib/media-route-segment"
import { Link, useRouterState } from "@tanstack/react-router"
import { Badge } from "@workspace/ui/components/badge"
import { useIsMobile } from "@workspace/ui/hooks/use-mobile"
import { cn } from "@workspace/ui/lib/utils"
import { useCallback, useMemo } from "react"

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

type GalleryHeaderContentProps<TCategory extends GalleryCategory> = Omit<
  GalleryHeaderProps<TCategory>,
  "isAdminMode" | "isBusy"
> & {
  currentPathname: string
  isAdminMode: boolean
  isBusy: boolean
}

type DesktopCategoryNavItemProps<TCategory extends GalleryCategory> = Pick<
  GalleryHeaderContentProps<TCategory>,
  "isAdminMode" | "isBusy" | "onSelectCategory"
> & {
  active: boolean
  category: TCategory
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
  const isMobile = useIsMobile()

  const headerProps = {
    activeCategoryPath,
    categories,
    currentPathname,
    isAdminMode,
    isBusy,
    onSelectCategory,
  }

  if (isMobile) {
    return <MobileGalleryHeader {...headerProps} />
  }

  return <DesktopGalleryHeader {...headerProps} />
}

function DesktopGalleryHeader<TCategory extends GalleryCategory>({
  activeCategoryPath,
  categories,
  currentPathname,
  isAdminMode,
  isBusy,
  onSelectCategory,
}: GalleryHeaderContentProps<TCategory>) {
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
          <div className="flex min-w-max items-center justify-end justify-self-end lg:col-start-3 lg:row-start-1">
            <Badge
              variant="outline"
              className="border border-destructive bg-destructive px-3 py-2 text-[0.625rem] text-background shadow-sm shadow-destructive/25"
            >
              Admin view
            </Badge>
          </div>
        ) : null}
        <Link
          to={getMediaHomeRoute(isAdminMode)}
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
          {categories.map((category) => (
            <DesktopCategoryNavItem
              key={category.path}
              active={category.path === activeCategoryPath}
              category={category}
              isAdminMode={isAdminMode}
              isBusy={isBusy}
              onSelectCategory={onSelectCategory}
            />
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
          <Link
            to={getPricingRoute(isAdminMode)}
            className={getCategoryLinkClass(
              currentPathname === getPricingRoute(isAdminMode)
            )}
          >
            Prix
          </Link>
          <Link
            to={getAboutRoute(isAdminMode)}
            className={getCategoryLinkClass(
              currentPathname === getAboutRoute(isAdminMode)
            )}
          >
            A propos
          </Link>
          <Link
            to={getContactRoute(isAdminMode)}
            className={getCategoryLinkClass(
              currentPathname === getContactRoute(isAdminMode)
            )}
          >
            Contact
          </Link>
        </div>
      </nav>
    </header>
  )
}

function DesktopCategoryNavItem<TCategory extends GalleryCategory>({
  active,
  category,
  isAdminMode,
  isBusy,
  onSelectCategory,
}: DesktopCategoryNavItemProps<TCategory>) {
  const categoryParams = useMemo(
    () => ({ category: toMediaRouteSegment(category.name) }),
    [category.name]
  )
  const handleSelectCategory = useCallback(() => {
    onSelectCategory?.(category)
  }, [category, onSelectCategory])

  if (onSelectCategory) {
    return (
      <button
        type="button"
        disabled={isBusy}
        className={getCategoryLinkClass(active)}
        onClick={handleSelectCategory}
      >
        {category.name}
      </button>
    )
  }

  return (
    <Link
      to={getMediaCategoryRoute(isAdminMode)}
      params={categoryParams}
      className={getCategoryLinkClass(active)}
    >
      {category.name}
    </Link>
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
