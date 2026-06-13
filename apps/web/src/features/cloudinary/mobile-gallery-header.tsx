import {
  MobileAdminActions,
  MobileCategoryNavItem,
  type MobileGalleryCategory,
  MobileStaticNavLink,
} from "@/features/cloudinary/mobile-gallery-nav-items"
import {
  getAboutRoute,
  getContactRoute,
  getMediaHomeRoute,
  getPricingRoute,
} from "@/lib/admin-routes"
import { Link } from "@tanstack/react-router"
import { cn } from "@workspace/ui/lib/utils"
import { MenuIcon, XIcon } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

type MobileGalleryHeaderProps<TCategory extends MobileGalleryCategory> = {
  activeCategoryPath?: string
  categories: TCategory[]
  currentPathname: string
  isAdminMode: boolean
  isBusy: boolean
  onSelectCategory?: (category: TCategory) => void
}

type MobileHeaderCallbacks = {
  onCloseMenu: () => void
  onToggleMenu: () => void
}

function MobileGalleryHeader<TCategory extends MobileGalleryCategory>({
  activeCategoryPath,
  categories,
  currentPathname,
  isAdminMode,
  isBusy,
  onSelectCategory,
}: MobileGalleryHeaderProps<TCategory>) {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
  }, [])

  const closeMenu = useCallback(() => {
    clearCloseTimeout()

    closeTimeoutRef.current = setTimeout(() => {
      setMenuOpen(false)
      closeTimeoutRef.current = null
    }, 500)
  }, [clearCloseTimeout])

  const toggleMenu = useCallback(() => {
    clearCloseTimeout()
    setMenuOpen((currentMenuOpen) => !currentMenuOpen)
  }, [clearCloseTimeout])

  useEffect(() => clearCloseTimeout, [clearCloseTimeout])

  return (
    <>
      <MobileHeaderBar
        isAdminMode={isAdminMode}
        menuOpen={menuOpen}
        onCloseMenu={closeMenu}
        onToggleMenu={toggleMenu}
      />
      <MobileNavigationOverlay
        activeCategoryPath={activeCategoryPath}
        categories={categories}
        currentPathname={currentPathname}
        isAdminMode={isAdminMode}
        isBusy={isBusy}
        menuOpen={menuOpen}
        onCloseMenu={closeMenu}
        onSelectCategory={onSelectCategory}
      />
    </>
  )
}

function MobileHeaderBar({
  isAdminMode,
  menuOpen,
  onCloseMenu,
  onToggleMenu,
}: MobileHeaderCallbacks & {
  isAdminMode: boolean
  menuOpen: boolean
}) {
  return (
    <header className="sticky top-0 left-0 z-50 flex w-full items-center justify-between bg-background px-4 py-2">
      <h1 className="font-sans text-lg font-extrabold tracking-[0.1em] uppercase">
        <Link to={getMediaHomeRoute(isAdminMode)} onClick={onCloseMenu}>
          DOLLA SHASHIN
        </Link>
      </h1>
      <button
        type="button"
        aria-controls="mobile-gallery-navigation"
        aria-expanded={menuOpen}
        aria-label={menuOpen ? "Close navigation" : "Open navigation"}
        className="inline-flex size-10 items-center justify-center text-foreground transition-opacity hover:opacity-70"
        onClick={onToggleMenu}
      >
        {menuOpen ? (
          <XIcon className="size-6" aria-hidden="true" />
        ) : (
          <MenuIcon className="size-6" aria-hidden="true" />
        )}
      </button>
    </header>
  )
}

function MobileNavigationOverlay<TCategory extends MobileGalleryCategory>({
  activeCategoryPath,
  categories,
  currentPathname,
  isAdminMode,
  isBusy,
  menuOpen,
  onCloseMenu,
  onSelectCategory,
}: MobileGalleryHeaderProps<TCategory> & {
  onCloseMenu: () => void
  menuOpen: boolean
}) {
  return (
    <nav
      id="mobile-gallery-navigation"
      aria-label="Main navigation"
      className={cn(
        "fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-background font-heading transition-all duration-500 ease-in-out",
        menuOpen
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0"
      )}
    >
      <MobileStaticNavLink
        active={currentPathname === getMediaHomeRoute(isAdminMode)}
        label="HOME"
        to={getMediaHomeRoute(isAdminMode)}
        onCloseMenu={onCloseMenu}
      />
      {categories.map((category) => (
        <MobileCategoryNavItem
          key={category.path}
          active={category.path === activeCategoryPath}
          category={category}
          isAdminMode={isAdminMode}
          isBusy={isBusy}
          onCloseMenu={onCloseMenu}
          onSelectCategory={onSelectCategory}
        />
      ))}
      <MobileStaticNavLink
        active={currentPathname === getPricingRoute(isAdminMode)}
        label="PRIX"
        to={getPricingRoute(isAdminMode)}
        onCloseMenu={onCloseMenu}
      />
      <MobileStaticNavLink
        active={currentPathname === getAboutRoute(isAdminMode)}
        label="A PROPOS"
        to={getAboutRoute(isAdminMode)}
        onCloseMenu={onCloseMenu}
      />
      <MobileStaticNavLink
        active={currentPathname === getContactRoute(isAdminMode)}
        label="CONTACT"
        to={getContactRoute(isAdminMode)}
        onCloseMenu={onCloseMenu}
      />
      {isAdminMode ? (
        <MobileAdminActions
          currentPathname={currentPathname}
          onCloseMenu={onCloseMenu}
        />
      ) : null}
    </nav>
  )
}

export { MobileGalleryHeader }
