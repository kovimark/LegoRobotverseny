import { authFetch } from './apiClient'

const API_URL = 'https://brickathlon.runasp.net/api/Message'
export const MESSAGE_BOARD_CHANGED_EVENT = 'messageBoardChanged'

const request = async (path, options = {}) => {
  const response = await authFetch(`${API_URL}${path}`, {
    headers: { accept: '*/*', ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
    ...options
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || `Szerverhiba (${response.status})`)
  }
  if (response.status === 204) return null
  const contentType = response.headers.get('content-type') || ''
  return contentType.includes('application/json') ? response.json() : response.text()
}

const CACHE_KEY = 'brickathlon_cached_message_types'

const getCachedTypes = () => {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(CACHE_KEY) : null
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const saveCachedTypes = (types) => {
  try {
    if (typeof window !== 'undefined' && Array.isArray(types) && types.length > 0) {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(types))
    }
  } catch {}
}

const getFallbackTypeMap = () => ({
  5: { name: 'Hír', hex: '#fa7921' },
  9: { name: 'Fontos hír', hex: '#e55934' },
  10: { name: 'Menetrend', hex: '#9bc53d' }
})

const buildTypeDetailsMap = (typeData = []) => {
  const map = { ...getFallbackTypeMap() }
  const cached = getCachedTypes()
  if (Array.isArray(cached)) {
    cached.forEach((t) => {
      if (t && t.id) {
        map[t.id] = { name: t.name || '', hex: t.hex || null }
      }
    })
  }
  if (Array.isArray(typeData) && typeData.length > 0) {
    saveCachedTypes(typeData)
    typeData.forEach((t) => {
      if (t && typeof t === 'object' && t.id) {
        map[t.id] = { name: t.name || '', hex: t.hex || null }
      }
    })
  }
  return map
}

const normalizeMessage = (message, typeDetailsById = {}) => {
  const rawType = message.type ?? message.messageType
  const typeDetails = typeDetailsById[message.typeId] || {}
  const resolvedType = typeof rawType === 'object'
    ? (rawType?.name || '')
    : (rawType || typeDetails.name || '')
  const resolvedHex = message.typeHex ?? rawType?.hex ?? typeDetails.hex ?? null

  return {
    ...message,
    id: message.id ?? message.messageId ?? message.messageID,
    title: message.title || '',
    text: message.text ?? message.body ?? '',
    links: message.links ?? '',
    type: resolvedType,
    typeId: message.typeId ?? rawType?.id ?? null,
    typeHex: resolvedHex,
    start: message.start ?? message.messageStart ?? message.startTime ?? null,
    end: message.end ?? message.messageEnd ?? message.endTime ?? null
  }
}

export const getMessages = async (includeTypes = true) => {
  let typeData = []
  let data = []

  if (includeTypes) {
    try {
      const [messagesData, typesResponse] = await Promise.all([
        request('/getAllMessage'),
        request('/allType').catch(() => [])
      ])
      data = messagesData
      typeData = typesResponse
    } catch {
      data = await request('/getAllMessage').catch(() => [])
    }
  } else {
    data = await request('/getAllMessage').catch(() => [])
  }

  const typeDetailsById = buildTypeDetailsMap(typeData)
  return (Array.isArray(data) ? data : []).map((message) => normalizeMessage(message, typeDetailsById))
}

export const getMessageTypes = async () => {
  try {
    const data = await request('/allType')
    const list = Array.isArray(data) ? data : []
    if (list.length > 0) {
      saveCachedTypes(list)
    }
    return list.map((type) => ({ id: type.id, name: type.name || String(type), hex: type.hex || null }))
  } catch {
    const cached = getCachedTypes()
    if (Array.isArray(cached) && cached.length > 0) {
      return cached.map((type) => ({ id: type.id, name: type.name || String(type), hex: type.hex || null }))
    }
    return Object.entries(getFallbackTypeMap()).map(([id, t]) => ({ id: Number(id), name: t.name, hex: t.hex }))
  }
}

export const addMessageType = async (name, hex) => request('/addType', {
  method: 'POST',
  body: JSON.stringify({ id: 0, name, hex, messages: [] })
})
export const renameMessageType = async (oldType, updatedType) => request(`/modifyType/${encodeURIComponent(oldType)}`, {
  method: 'PUT',
  body: JSON.stringify({
    id: Number(updatedType.id) || 0,
    name: updatedType.name,
    hex: updatedType.hex,
    messages: []
  })
})
export const deleteMessageType = async (type) => request(`/modifyType/${encodeURIComponent(type)}`, { method: 'DELETE' })

const toPayload = (message) => ({
  title: message.title.trim(),
  text: message.text.trim(),
  type: message.type,
  start: message.start ? new Date(message.start).toISOString() : new Date().toISOString(),
  end: message.end ? new Date(message.end).toISOString() : null,
  links: String(message.links || '').split(/\r?\n/).map((link) => link.trim()).filter(Boolean).join('\n')
})

export const saveMessage = async (message) => {
  const isExisting = Number.isFinite(Number(message.id))
  const path = isExisting ? `/modifyMessage/${message.id}` : '/addMessage'
  const result = await request(path, { method: isExisting ? 'PUT' : 'POST', body: JSON.stringify(toPayload(message)) })
  window.dispatchEvent(new Event(MESSAGE_BOARD_CHANGED_EVENT))
  return result
}

export const deleteMessage = async (messageId) => {
  const result = await request(`/deleteMessage/${messageId}`, { method: 'DELETE' })
  window.dispatchEvent(new Event(MESSAGE_BOARD_CHANGED_EVENT))
  return result
}

export const getActiveMessages = async () => {
  const now = Date.now()
  return (await getMessages(true)).filter((message) => {
    const hasStarted = !message.start || new Date(message.start).getTime() <= now
    const hasNotEnded = !message.end || new Date(message.end).getTime() >= now
    return hasStarted && hasNotEnded
  })
}

export const getMessageByTitle = async (messageTitle) => {
  const [data, typeData] = await Promise.all([
    request(`/getMessageByTitle/${encodeURIComponent(messageTitle)}`),
    request('/allType').catch(() => [])
  ])
  const typeDetailsById = buildTypeDetailsMap(typeData)
  const message = Array.isArray(data) ? data[0] : data
  return message ? normalizeMessage(message, typeDetailsById) : null
}

export const toLocalDateTimeInput = (utcValue) => {
  if (!utcValue) return ''
  const date = new Date(utcValue)
  if (Number.isNaN(date.getTime())) return ''
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return offsetDate.toISOString().slice(0, 16)
}
