type MediaAdminSearch = {
  admin?: true
}

function validateMediaAdminSearch(
  search: Record<string, unknown>
): MediaAdminSearch {
  return search.admin === true || search.admin === "true" ? { admin: true } : {}
}

function getMediaAdminSearch(isAdminMode: boolean): MediaAdminSearch {
  return isAdminMode ? { admin: true } : {}
}

function isMediaAdminMode(search: MediaAdminSearch) {
  return search.admin === true
}

export { getMediaAdminSearch, isMediaAdminMode, validateMediaAdminSearch }
export type { MediaAdminSearch }
