export const formatCurrentTimestamp = (date = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0')
  const y = date.getFullYear()
  const m = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  const hh = pad(date.getHours())
  const mm = pad(date.getMinutes())
  return `${y}.${m}.${d}. ${hh}:${mm}`
}

export const attachTimestampToMessage = (messageText) => {
  const clean = String(messageText || '').trim()
  const timestamp = formatCurrentTimestamp()
  if (clean.includes('(Elküldve:') || /^\[\d{4}\.\d{2}\.\d{2}/.test(clean)) {
    return clean
  }
  return `${clean}\n\n(Elküldve: ${timestamp})`
}

export const parseMessageTimestamp = (rawText) => {
  const text = String(rawText || '').trim()
  const sentMatch = text.match(/\(Elküldve:\s*([^)]+)\)/i)
  if (sentMatch) {
    const cleanText = text.replace(/\n*\(Elküldve:\s*[^)]+\)/i, '').trim()
    return { text: cleanText, timestamp: sentMatch[1].trim() }
  }
  const bracketMatch = text.match(/^\[(\d{4}\.\d{2}\.\d{2}[^\]]*)\]\s*(.*)/s)
  if (bracketMatch) {
    return { text: bracketMatch[2].trim(), timestamp: bracketMatch[1].trim() }
  }
  return { text, timestamp: null }
}
