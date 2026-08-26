import { auth, authPersistenceReady } from '../firebase'

/**
 * Ellenőrzi, hogy az adott URL a LegoRobotverseny backendhez tartozik-e.
 * @param {string|Request|URL} url
 * @returns {boolean}
 */
export const isBackendUrl = (url) => {
  if (!url) return false
  const strUrl = typeof url === 'string' ? url : (url?.url || url?.href || String(url))
  return (
    strUrl.includes('legocompetition.runasp.net') ||
    strUrl.startsWith('/api') ||
    strUrl.includes('localhost:')
  )
}

/**
 * Lekéri az aktuálisan bejelentkezett Firebase felhasználó érvényes ID tokenjét.
 * Ha a token lejárófélben van, a Firebase automatikusan frissíti a háttérben.
 * @returns {Promise<string|null>}
 */
export const getAuthToken = async () => {
  try {
    if (authPersistenceReady) {
      await authPersistenceReady
    }
    const user = auth.currentUser
    if (!user) {
      return null
    }
    return await user.getIdToken()
  } catch (error) {
    console.warn('Nem sikerült lekérni a Firebase ID tokent:', error.message)
    return null
  }
}

/**
 * Összefésüli a megadott fejléceket az Authorization (Bearer token) fejléccel.
 * @param {HeadersInit} [customHeaders]
 * @returns {Promise<HeadersInit>}
 */
export const getAuthHeaders = async (customHeaders = {}) => {
  const token = await getAuthToken()
  if (!token) {
    return customHeaders
  }

  if (customHeaders instanceof Headers) {
    const headers = new Headers(customHeaders)
    if (!headers.has('Authorization') && !headers.has('authorization')) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    return headers
  }

  if (Array.isArray(customHeaders)) {
    const hasAuth = customHeaders.some(([k]) => k.toLowerCase() === 'authorization')
    if (!hasAuth) {
      return [...customHeaders, ['Authorization', `Bearer ${token}`]]
    }
    return customHeaders
  }

  const headers = { ...customHeaders }
  if (!headers['Authorization'] && !headers['authorization']) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

// Eredeti natív fetch referencia elmentése
const originalFetch = window.fetch.bind(window)

/**
 * Globális fetch interceptor: minden backend hívásnál (GET, POST, PUT, PATCH, DELETE stb.)
 * automatikusan hozzáfűzi a Bearer tokent, ha van bejelentkezett felhasználó.
 */
export const setupGlobalFetchInterceptor = () => {
  if (window._hasAuthFetchInterceptor) return
  window._hasAuthFetchInterceptor = true

  window.fetch = async function (input, init = {}) {
    let url = ''
    if (typeof input === 'string') {
      url = input
    } else if (input instanceof URL) {
      url = input.toString()
    } else if (input && typeof input === 'object' && input.url) {
      url = input.url
    }

    if (isBackendUrl(url)) {
      try {
        const existingHeaders = init.headers || (input instanceof Request ? input.headers : {})
        const headers = await getAuthHeaders(existingHeaders)
        const newInit = { ...init, headers }
        return await originalFetch(input, newInit)
      } catch (err) {
        console.warn('Fetch interceptor figyelmeztetés:', err)
      }
    }

    return originalFetch(input, init)
  }
}

// Azonnali inicializálás az importáláskor
setupGlobalFetchInterceptor()

/**
 * Automatikusan Authorization Bearer tokent csatoló fetch wrapper.
 * @param {string|Request|URL} url
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */
export const authFetch = async (url, options = {}) => {
  const headers = await getAuthHeaders(options.headers || {})
  return originalFetch(url, {
    ...options,
    headers
  })
}
