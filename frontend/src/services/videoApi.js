import { authFetch } from './apiClient'
import { DATA_REFRESH_EVENT } from '../config/dataRefresh'

const API_URL = 'https://legocompetition.runasp.net/api'
export const VIDEOS_CHANGED_EVENT = 'videosChanged'
const STORAGE_KEY = 'brickathlon_videos'

export const DEFAULT_VIDEOS = [
  {
    id: 'vid_kosarra_dobas_szabalyzat',
    title: 'Brickathlon - Kosárra dobás szabályzat (hivatalos videó)',
    url: 'https://youtu.be/5aBnWcYTrag',
    description: `A Brickathlon versenyen a kosárra dobás versenyszám szabályzat videós verziója.
A videó kiegészíti a szabálykönyvet de nem írja felül azt. A szabálykönyv elolvasása erősen ajánlott, mivel a videó nem tartalmaz minden szabályt.
További infók: brickathlon.vercel.app`,
    createdAt: '2026-09-22T00:00:00.000Z'
  }
]

const getLocalVideos = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_VIDEOS))
      return DEFAULT_VIDEOS
    }
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
    }
    return DEFAULT_VIDEOS
  } catch {
    return DEFAULT_VIDEOS
  }
}

const setLocalVideos = (videos) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(videos))
  } catch {
    // ignore
  }
}

export const getVideos = async () => {
  // Próbáljuk lekérni a szerverről
  try {
    const response = await fetch(`${API_URL}/Videos`, {
      headers: { accept: '*/*' }
    })
    if (response.ok) {
      const data = await response.json()
      if (Array.isArray(data) && data.length > 0) {
        setLocalVideos(data)
        return data
      }
    }
  } catch {
    // Végpont még nem létezik vagy hálózati hiba, lokális/alapértelmezett adatokból dolgozunk
  }

  return getLocalVideos()
}

export const saveVideo = async (video) => {
  const current = getLocalVideos()
  const isUpdate = Boolean(video.id)
  const videoId = isUpdate ? video.id : `vid_${Date.now()}`
  const normalized = {
    id: videoId,
    title: String(video.title || '').trim(),
    url: String(video.url || '').trim(),
    description: String(video.description || '').trim(),
    createdAt: video.createdAt || new Date().toISOString()
  }

  let updatedList
  if (isUpdate) {
    updatedList = current.map((v) => (String(v.id) === String(videoId) ? normalized : v))
  } else {
    updatedList = [normalized, ...current]
  }

  setLocalVideos(updatedList)

  // Próbáljuk beküldeni a szerverre is ha elérhető
  try {
    const method = isUpdate ? 'PUT' : 'POST'
    const endpoint = isUpdate ? `${API_URL}/Videos/${encodeURIComponent(videoId)}` : `${API_URL}/Videos`
    await authFetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json', accept: '*/*' },
      body: JSON.stringify(normalized)
    })
  } catch {
    // Végpont még készülőben, lokális mentés megtörtént
  }

  window.dispatchEvent(new Event(VIDEOS_CHANGED_EVENT))
  window.dispatchEvent(new Event(DATA_REFRESH_EVENT))
  return normalized
}

export const deleteVideo = async (id) => {
  const current = getLocalVideos()
  const updatedList = current.filter((v) => String(v.id) !== String(id))
  setLocalVideos(updatedList)

  // Próbáljuk törölni a szerverről is
  try {
    await authFetch(`${API_URL}/Videos/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { accept: '*/*' }
    })
  } catch {
    // Végpont még készülőben
  }

  window.dispatchEvent(new Event(VIDEOS_CHANGED_EVENT))
  window.dispatchEvent(new Event(DATA_REFRESH_EVENT))
  return true
}
