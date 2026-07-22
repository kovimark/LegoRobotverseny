const API_URL = 'https://legocompetition.runasp.net/api/Message'
export const MESSAGE_BOARD_CHANGED_EVENT = 'messageBoardChanged'

const request = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
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

const normalizeMessage = (message, typeDetailsById = {}) => {
  const rawType = message.type ?? message.messageType
  const typeDetails = typeDetailsById[message.typeId] || {}
  return {
    ...message,
    id: message.id ?? message.messageId ?? message.messageID,
    title: message.title || '',
    text: message.text ?? message.body ?? '',
    links: message.links ?? '',
    type: typeof rawType === 'object' ? (rawType?.name || '') : (rawType || typeDetails.name || ''),
    typeId: message.typeId ?? rawType?.id ?? null,
    typeHex: message.typeHex ?? rawType?.hex ?? typeDetails.hex ?? null,
    start: message.start ?? message.messageStart ?? message.startTime ?? null,
    end: message.end ?? message.messageEnd ?? message.endTime ?? null
  }
}

export const getMessages = async () => {
  const [data, typeData] = await Promise.all([request('/getAllMessage'), request('/allType')])
  const typeDetailsById = (Array.isArray(typeData) ? typeData : []).reduce((result, type) => {
    result[type.id] = { name: type.name || '', hex: type.hex || null }
    return result
  }, {})
  return (Array.isArray(data) ? data : []).map((message) => normalizeMessage(message, typeDetailsById))
}

export const getMessageTypes = async () => {
  const data = await request('/allType')
  return (Array.isArray(data) ? data : []).map((type) => ({ id: type.id, name: type.name || String(type), hex: type.hex || null }))
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
  return (await getMessages()).filter((message) => {
    const hasStarted = !message.start || new Date(message.start).getTime() <= now
    const hasNotEnded = !message.end || new Date(message.end).getTime() >= now
    return hasStarted && hasNotEnded
  })
}

export const toLocalDateTimeInput = (utcValue) => {
  if (!utcValue) return ''
  const date = new Date(utcValue)
  if (Number.isNaN(date.getTime())) return ''
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return offsetDate.toISOString().slice(0, 16)
}
