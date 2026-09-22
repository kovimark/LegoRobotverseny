/**
 * YouTube URL segédfüggvények
 */

/**
 * Kinyeri a YouTube videó azonosítóját (ID) a megadott URL-ből vagy beágyazó kódból.
 * Támogatja a standard, rövidített (youtu.be), beágyazott (embed), shorts és iframe formátumokat.
 */
export const getYouTubeVideoId = (url) => {
  if (!url) return null
  const str = String(url).trim()

  // Ha iframe taget másoltak be, kinyerjük az src attribútumot
  const iframeMatch = str.match(/src=["'](.*?)["']/i)
  const target = iframeMatch ? iframeMatch[1] : str

  // Regex standard YouTube formátumokhoz
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([^#&?]*).*/
  const match = target.match(regExp)

  if (match && match[2] && match[2].length === 11) {
    return match[2]
  }

  // Ha közvetlenül a videó ID-t adták meg (11 karakteres alfanumerikus + _-)
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return str
  }

  return null
}

/**
 * Előállítja a YouTube beágyazható (embed) URL-jét iframe-hez.
 */
export const getYouTubeEmbedUrl = (url) => {
  const videoId = getYouTubeVideoId(url)
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}?rel=0`
  }

  // Ha nem YouTube, de már eleve egy érvényes https link
  if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
    return url
  }

  return ''
}

/**
 * Ellenőrzi, hogy a megadott szöveg érvényes videó link-e.
 */
export const isValidVideoUrl = (url) => {
  if (!url || typeof url !== 'string') return false
  const trimmed = url.trim()
  if (!trimmed) return false

  // YouTube azonosító kinyerhető vagy http(s) URL
  return Boolean(getYouTubeVideoId(trimmed)) || /^https?:\/\/.+/i.test(trimmed)
}
