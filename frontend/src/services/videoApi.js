import { authFetch } from './apiClient'
import { DATA_REFRESH_EVENT } from '../config/dataRefresh'

const API_BASE_URL = 'https://legocompetition.runasp.net/api/Youtube'
export const VIDEOS_CHANGED_EVENT = 'videosChanged'

/**
 * Lekéri az összes YouTube videót a backendről.
 * @returns {Promise<Array<{id: number, title: string, url: string, description: string}>>}
 */
export const getVideos = async () => {
  try {
    const response = await fetch(API_BASE_URL, {
      headers: { accept: 'application/json, text/plain, */*' }
    })
    if (!response.ok) {
      throw new Error(`Szerverhiba (${response.status})`)
    }
    const data = await response.json()
    if (!Array.isArray(data)) {
      return []
    }
    return data.map((v) => ({
      id: v.id ?? 0,
      title: v.title || '',
      url: v.url || '',
      description: v.description || ''
    }))
  } catch (error) {
    console.error('Hiba a videók lekérésekor:', error)
    return []
  }
}

/**
 * Új videó feltöltése vagy meglévő módosítása a backendre.
 * @param {{id?: number|string, title: string, url: string, description?: string, originalUrl?: string}} video
 */
export const saveVideo = async (video) => {
  const isUpdate = Boolean(video.id && Number(video.id) > 0)
  const normalized = {
    id: isUpdate ? Number(video.id) : 0,
    title: String(video.title || '').trim(),
    url: String(video.url || '').trim(),
    description: String(video.description || '').trim()
  }

  let response
  if (isUpdate) {
    const identifier = encodeURIComponent(video.originalUrl || video.url || video.id)
    const queryParam = `?url=${encodeURIComponent(normalized.url)}`
    response = await authFetch(`${API_BASE_URL}/${identifier}${queryParam}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        accept: '*/*'
      },
      body: JSON.stringify(normalized)
    })
  } else {
    response = await authFetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        accept: '*/*'
      },
      body: JSON.stringify(normalized)
    })
  }

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || `Hiba a mentés során (${response.status})`)
  }

  window.dispatchEvent(new Event(VIDEOS_CHANGED_EVENT))
  window.dispatchEvent(new Event(DATA_REFRESH_EVENT))
  return true
}

/**
 * Videó törlése a backendről.
 * Több lehetséges paraméterezést (path + query paraméter, ID) is kipróbál a backend sikeres eléréséhez.
 * @param {string|number|{id?: number|string, url?: string}} target
 */
export const deleteVideo = async (target) => {
  const urlParam = typeof target === 'object' && target !== null
    ? (target.url || target.id)
    : target
  const idParam = typeof target === 'object' && target !== null ? target.id : null

  if (!urlParam && !idParam) {
    throw new Error('Nincs megadva a törlendő videó azonosítója.')
  }

  const encodedUrl = encodeURIComponent(urlParam || '')
  const urlsToTry = []

  // 1. Path és query paraméter együttes átadása (így a query stringes és path-alapú route binding is teljesül)
  if (encodedUrl) {
    urlsToTry.push(`${API_BASE_URL}/${encodedUrl}?url=${encodedUrl}`)
    urlsToTry.push(`${API_BASE_URL}/${encodedUrl}`)
  }

  // 2. Ha van numerikus id
  if (idParam) {
    urlsToTry.push(`${API_BASE_URL}/${idParam}`)
    if (encodedUrl) {
      urlsToTry.push(`${API_BASE_URL}/${idParam}?url=${encodedUrl}`)
    }
  }

  let lastErrorText = ''
  let success = false

  for (const endpoint of urlsToTry) {
    try {
      const response = await authFetch(endpoint, {
        method: 'DELETE',
        headers: {
          accept: '*/*'
        }
      })

      if (response.ok) {
        success = true
        break
      } else {
        lastErrorText = await response.text()
      }
    } catch (err) {
      lastErrorText = err.message
    }
  }

  if (!success) {
    throw new Error(lastErrorText || 'Hiba a törlés során. A backend nem tudta feldolgozni a törlési kérést.')
  }

  window.dispatchEvent(new Event(VIDEOS_CHANGED_EVENT))
  window.dispatchEvent(new Event(DATA_REFRESH_EVENT))
  return true
}
