import {
  deleteCookie,
  getCookie,
  getRequestProtocol,
  setCookie,
} from "@tanstack/react-start/server"
import { createHash, createHmac, timingSafeEqual } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

type LocalEnv = Record<string, string>

type AdminAuthState = {
  isAuthenticated: boolean
  isConfigured: boolean
}

type AdminLoginResult =
  | { status: "success" }
  | { status: "missing-secret" }
  | { status: "invalid-secret" }

const ADMIN_SECRET_ENV_NAME = "ADMIN_SECRET"
const ADMIN_SESSION_COOKIE_NAME = "dolla_admin_session"
const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12
const ADMIN_SESSION_PURPOSE = "dolla-admin-session-v1"

let localEnvCache: LocalEnv | null = null

function getAdminAuthState(): AdminAuthState {
  const secret = readAdminSecret()

  return {
    isAuthenticated: secret ? hasValidAdminSession(secret) : false,
    isConfigured: Boolean(secret),
  }
}

function assertAdminAuthenticated() {
  const secret = getRequiredAdminSecret()

  if (!hasValidAdminSession(secret)) {
    throw new Error("Admin authentication required.")
  }
}

function loginAdmin(secretInput: string): AdminLoginResult {
  const secret = readAdminSecret()

  if (!secret) {
    return { status: "missing-secret" }
  }

  if (!constantTimeEqual(secretInput, secret)) {
    return { status: "invalid-secret" }
  }

  setCookie(
    ADMIN_SESSION_COOKIE_NAME,
    getAdminSessionCookieValue(secret),
    getAdminSessionCookieOptions()
  )

  return { status: "success" }
}

function logoutAdmin() {
  deleteCookie(ADMIN_SESSION_COOKIE_NAME, {
    path: "/",
  })
}

function hasValidAdminSession(secret: string) {
  const cookieValue = getCookie(ADMIN_SESSION_COOKIE_NAME)

  if (!cookieValue) {
    return false
  }

  return constantTimeEqual(cookieValue, getAdminSessionCookieValue(secret))
}

function getRequiredAdminSecret() {
  const secret = readAdminSecret()

  if (!secret) {
    throw new Error(`${ADMIN_SECRET_ENV_NAME} is not set.`)
  }

  return secret
}

function readAdminSecret() {
  return readServerEnv(ADMIN_SECRET_ENV_NAME)?.trim() || undefined
}

function getAdminSessionCookieValue(secret: string) {
  return createHmac("sha256", secret)
    .update(ADMIN_SESSION_PURPOSE)
    .digest("base64url")
}

function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax" as const,
    secure: getRequestProtocol({ xForwardedProto: true }) === "https",
  }
}

function constantTimeEqual(left: string, right: string) {
  const leftHash = hashForComparison(left)
  const rightHash = hashForComparison(right)

  return timingSafeEqual(leftHash, rightHash)
}

function hashForComparison(value: string) {
  return createHash("sha256").update(value).digest()
}

function getLocalEnv(): LocalEnv {
  if (localEnvCache) {
    return localEnvCache
  }

  localEnvCache = {}

  for (const file of getLocalEnvFiles()) {
    if (!existsSync(file)) {
      continue
    }

    Object.assign(localEnvCache, parseEnvFile(readFileSync(file, "utf8")))
  }

  return localEnvCache
}

function getLocalEnvFiles() {
  const cwd = process.cwd()
  const candidates = [
    path.join(cwd, ".env"),
    path.join(cwd, ".env.local"),
    path.join(cwd, "apps/web/.env"),
    path.join(cwd, "apps/web/.env.local"),
    path.resolve(cwd, "../..", ".env"),
    path.resolve(cwd, "../..", ".env.local"),
    path.resolve(cwd, "../..", "apps/web/.env"),
    path.resolve(cwd, "../..", "apps/web/.env.local"),
  ]

  return Array.from(new Set(candidates))
}

function parseEnvFile(contents: string): LocalEnv {
  const values: LocalEnv = {}

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith("#")) {
      continue
    }

    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)

    if (!match) {
      continue
    }

    const key = match[1]
    const value = match[2]

    if (!key || value === undefined) {
      continue
    }

    values[key] = normalizeEnvValue(value)
  }

  return values
}

function normalizeEnvValue(rawValue: string) {
  const value = rawValue.trim()
  const quote = value[0]

  if (
    (quote === `"` || quote === `'`) &&
    value.length >= 2 &&
    value.endsWith(quote)
  ) {
    return value.slice(1, -1)
  }

  const commentIndex = value.search(/\s#/)

  if (commentIndex === -1) {
    return value
  }

  return value.slice(0, commentIndex).trim()
}

function readServerEnv(name: string) {
  return process.env[name] || getLocalEnv()[name]
}

export { assertAdminAuthenticated, getAdminAuthState, loginAdmin, logoutAdmin }
export type { AdminAuthState, AdminLoginResult }
