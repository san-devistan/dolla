const ADMIN_HOME_ROUTE = "/admin/home" as const
const ADMIN_LEGACY_MEDIA_ROUTE = "/admin/media" as const
const ADMIN_CATEGORY_ROUTE = "/admin/$category" as const
const ADMIN_SHOOT_ROUTE = "/admin/$category/$shoot" as const
const ADMIN_PRICING_ROUTE = "/admin/pricing" as const
const ADMIN_ABOUT_ROUTE = "/admin/about" as const
const ADMIN_CONTACT_ROUTE = "/admin/contact" as const
const ADMIN_LOGIN_ROUTE = "/admin/login" as const
const ADMIN_LOGOUT_ROUTE = "/admin/logout" as const

const PUBLIC_HOME_ROUTE = "/" as const
const PUBLIC_CATEGORY_ROUTE = "/$category" as const
const PUBLIC_SHOOT_ROUTE = "/$category/$shoot" as const
const PUBLIC_PRICING_ROUTE = "/pricing" as const
const PUBLIC_ABOUT_ROUTE = "/about" as const
const PUBLIC_CONTACT_ROUTE = "/contact" as const

function getMediaHomeRoute(isAdminMode: boolean) {
  return isAdminMode ? ADMIN_HOME_ROUTE : PUBLIC_HOME_ROUTE
}

function getMediaCategoryRoute(isAdminMode: boolean) {
  return isAdminMode ? ADMIN_CATEGORY_ROUTE : PUBLIC_CATEGORY_ROUTE
}

function getMediaShootRoute(isAdminMode: boolean) {
  return isAdminMode ? ADMIN_SHOOT_ROUTE : PUBLIC_SHOOT_ROUTE
}

function getPricingRoute(isAdminMode: boolean) {
  return isAdminMode ? ADMIN_PRICING_ROUTE : PUBLIC_PRICING_ROUTE
}

function getAboutRoute(isAdminMode: boolean) {
  return isAdminMode ? ADMIN_ABOUT_ROUTE : PUBLIC_ABOUT_ROUTE
}

function getContactRoute(isAdminMode: boolean) {
  return isAdminMode ? ADMIN_CONTACT_ROUTE : PUBLIC_CONTACT_ROUTE
}

function getSafeAdminRedirect(value: string | undefined) {
  if (
    !value ||
    value.startsWith("//") ||
    (value !== "/admin" && !value.startsWith("/admin/"))
  ) {
    return ADMIN_HOME_ROUTE
  }

  if (
    value.startsWith(ADMIN_LOGIN_ROUTE) ||
    value.startsWith(ADMIN_LOGOUT_ROUTE)
  ) {
    return ADMIN_HOME_ROUTE
  }

  return value
}

function getPublicPathForAdminPath(pathname: string) {
  if (pathname === ADMIN_HOME_ROUTE) {
    return PUBLIC_HOME_ROUTE
  }

  if (pathname.startsWith(`${ADMIN_HOME_ROUTE}/`)) {
    return pathname.slice(ADMIN_HOME_ROUTE.length) || PUBLIC_HOME_ROUTE
  }

  if (pathname === ADMIN_PRICING_ROUTE) {
    return PUBLIC_PRICING_ROUTE
  }

  if (pathname === ADMIN_ABOUT_ROUTE) {
    return PUBLIC_ABOUT_ROUTE
  }

  if (pathname === ADMIN_CONTACT_ROUTE) {
    return PUBLIC_CONTACT_ROUTE
  }

  if (pathname.startsWith("/admin/")) {
    return pathname.slice("/admin".length) || PUBLIC_HOME_ROUTE
  }

  return PUBLIC_HOME_ROUTE
}

export {
  ADMIN_ABOUT_ROUTE,
  ADMIN_CONTACT_ROUTE,
  ADMIN_CATEGORY_ROUTE,
  ADMIN_HOME_ROUTE,
  ADMIN_LEGACY_MEDIA_ROUTE,
  ADMIN_LOGIN_ROUTE,
  ADMIN_LOGOUT_ROUTE,
  ADMIN_PRICING_ROUTE,
  ADMIN_SHOOT_ROUTE,
  getAboutRoute,
  getContactRoute,
  getMediaCategoryRoute,
  getMediaHomeRoute,
  getMediaShootRoute,
  getPricingRoute,
  getPublicPathForAdminPath,
  getSafeAdminRedirect,
}
