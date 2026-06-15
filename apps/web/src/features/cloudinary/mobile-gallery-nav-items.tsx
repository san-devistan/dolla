import { getMediaCategoryRoute } from "@/lib/admin-routes"
import { toMediaRouteSegment } from "@/lib/media-route-segment"
import { Link } from "@tanstack/react-router"
import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"
import { useCallback, useMemo } from "react"

type MobileGalleryCategory = { name: string; path: string }

type MobileNavigationCallbacks<TCategory extends MobileGalleryCategory> = {
  onCloseMenu: () => void
  onSelectCategory?: (category: TCategory) => void
}

function MobileCategoryNavItem<TCategory extends MobileGalleryCategory>({
  active,
  category,
  isAdminMode,
  isBusy,
  onCloseMenu,
  onSelectCategory,
}: MobileNavigationCallbacks<TCategory> & {
  active: boolean
  category: TCategory
  isAdminMode: boolean
  isBusy: boolean
}) {
  const categoryParams = useMemo(
    () => ({ category: toMediaRouteSegment(category.name) }),
    [category.name]
  )
  const handleSelectCategory = useCallback(() => {
    onSelectCategory?.(category)
    onCloseMenu()
  }, [category, onCloseMenu, onSelectCategory])

  if (onSelectCategory) {
    return (
      <button
        type="button"
        disabled={isBusy}
        className={getMobileNavItemClass(isBusy)}
        onClick={handleSelectCategory}
      >
        <MobileNavActiveDot active={active} />
        {category.name}
      </button>
    )
  }

  return (
    <Link
      to={getMediaCategoryRoute(isAdminMode)}
      params={categoryParams}
      className={getMobileNavItemClass(false)}
      onClick={onCloseMenu}
    >
      <MobileNavActiveDot active={active} />
      {category.name.toUpperCase()}
    </Link>
  )
}

function MobileStaticNavLink({
  active,
  label,
  to,
  onCloseMenu,
}: {
  active: boolean
  label: string
  to:
    | "/"
    | "/about"
    | "/pricing"
    | "/contact"
    | "/admin/home"
    | "/admin/about"
    | "/admin/pricing"
    | "/admin/contact"
  onCloseMenu: () => void
}) {
  return (
    <Link
      to={to}
      className={getMobileNavItemClass(false)}
      onClick={onCloseMenu}
    >
      <MobileNavActiveDot active={active} />
      {label}
    </Link>
  )
}

function MobileAdminActions() {
  return (
    <div className="mt-4 flex flex-col items-center gap-3">
      <Badge
        variant="outline"
        className="border border-destructive bg-destructive px-3 py-2 text-[0.625rem] text-background shadow-sm shadow-destructive/25"
      >
        Admin view
      </Badge>
    </div>
  )
}

function getMobileNavItemClass(isDisabled: boolean) {
  return cn(
    "relative flex min-h-9 items-center justify-center text-center text-2xl font-semibold tracking-normal uppercase transition-opacity disabled:pointer-events-none disabled:opacity-50",
    isDisabled ? "opacity-50" : "hover:opacity-70"
  )
}

function MobileNavActiveDot({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "absolute -left-4 size-2 rounded-full bg-foreground transition-all duration-500",
        active ? "scale-100 opacity-100" : "scale-0 opacity-0"
      )}
    />
  )
}

export { MobileAdminActions, MobileCategoryNavItem, MobileStaticNavLink }
export type { MobileGalleryCategory }
