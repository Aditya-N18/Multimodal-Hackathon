import { createClient } from '@insforge/sdk'

const rawBaseUrl = import.meta.env.VITE_INSFORGE_URL
const baseUrl = rawBaseUrl?.replace(/\/+$/, '') // trailing slash breaks //api/... paths
const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY

const PLACEHOLDER_URL_FRAGMENTS = ['your-app', 'example.com']
const PLACEHOLDER_KEYS = ['your-anon-key']

function isPlaceholderUrl(url) {
  return PLACEHOLDER_URL_FRAGMENTS.some((fragment) => url.includes(fragment))
}

function isPlaceholderKey(key) {
  return PLACEHOLDER_KEYS.includes(key)
}

/** True when real InsForge credentials are set (not template placeholders). */
export const isInsforgeConfigured = Boolean(
  baseUrl &&
    anonKey &&
    !isPlaceholderUrl(baseUrl) &&
    !isPlaceholderKey(anonKey),
)

export const insforge = isInsforgeConfigured
  ? createClient({ baseUrl, anonKey })
  : null
