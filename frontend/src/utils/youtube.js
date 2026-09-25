/**
 * YouTube URL segédfüggvények
 */

/**
 * Kinyeri a YouTube videó azonosítóját (ID) a megadott URL-ből vagy beágyazó kódból.
 * Támogatja a standard, rövidített (youtu.be), beágyazott (embed), shorts, live és iframe formátumokat.
 * @param {string} url
 * @returns {string|null}
 */
export const getYouTubeVideoId = (url) => {
  if (!url) return null
  const str = String(url).trim()

  // Ha iframe taget másoltak be, kinyerjük az src attribútumot
  const iframeMatch = str.match(/src=["'](.*?)["']/i)
  const target = iframeMatch ? iframeMatch[1] : str

  // Regex YouTube formátumokhoz (watch, youtu.be, embed, shorts, live, v)
  const regExp = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i
  const match = target.match(regExp)

  if (match && match[1]) {
    return match[1]
  }

  // Ha közvetlenül a videó ID-t adták meg (11 karakteres alfanumerikus + _-)
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return str
  }

  return null
}

/**
 * Előállítja a YouTube beágyazható (embed) URL-jét iframe-hez.
 * Csak érvényes videó ID esetén ad vissza beágyazható URL-t, így elkerüli az X-Frame-Options hibákat.
 * @param {string} url
 * @returns {string}
 */
export const getYouTubeEmbedUrl = (url) => {
  if (!url) return ''
  const videoId = getYouTubeVideoId(url)
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}?rel=0`
  }
  return ''
}

/**
 * Ellenőrzi, hogy a megadott szöveg érvényes YouTube videó azonosítható formátum-e.
 * @param {string} url
 * @returns {boolean}
 */
export const isValidVideoUrl = (url) => {
  if (!url || typeof url !== 'string') return false
  const trimmed = url.trim()
  if (!trimmed) return false
  return Boolean(getYouTubeVideoId(trimmed))
}
