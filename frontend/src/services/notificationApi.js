import { authFetch } from './apiClient'

const API_URL = 'https://legocompetition.runasp.net/api'

const readResponse = async (response) => {
  const text = await response.text()
  if (response.ok) return text
  try {
    const data = JSON.parse(text)
    throw new Error(Object.values(data.errors || {}).flat().join(' ') || data.title || text)
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error(text || `Szerverhiba (${response.status})`)
    throw error
  }
}

export const getNotificationTeams = async () => {
  const response = await authFetch(`${API_URL}/Teams`, { headers: { accept: '*/*' } })
  const text = await response.text()
  if (!response.ok) throw new Error(text || `A csapatok betöltése sikertelen (${response.status}).`)
  const data = text ? JSON.parse(text) : []
  return Array.isArray(data) ? data : []
}

export const getNotificationPrivileges = async () => {
  try {
    const response = await authFetch(`${API_URL}/Privilege`, { headers: { accept: '*/*' } })
    const text = await response.text()
    if (!response.ok) return []
    const data = text ? JSON.parse(text) : []
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export const getAllNotifications = async () => {
  try {
    const response = await authFetch(`${API_URL}/Notification/getAllNotifications`, { headers: { accept: '*/*' } })
    const text = await response.text()
    if (!response.ok) return []
    const data = text ? JSON.parse(text) : []
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export const deleteNotification = async (notificationId) => {
  const response = await authFetch(`${API_URL}/Notification/deleteNotification/${notificationId}`, {
    method: 'DELETE',
    headers: { accept: '*/*' }
  })
  return readResponse(response)
}

export const getAllNotificationsByPerson = async (email) => {
  const cleanEmail = String(email || '').trim().toLowerCase()
  if (!cleanEmail) return []
  try {
    const response = await authFetch(`${API_URL}/Notification/getAllNotificationsByPerson/${encodeURIComponent(cleanEmail)}`, { headers: { accept: '*/*' } })
    const text = await response.text()
    if (!response.ok) return []
    const data = text ? JSON.parse(text) : []
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export const getAllNotificationsByTeam = async (teamId) => {
  if (!teamId) return []
  try {
    const response = await authFetch(`${API_URL}/Notification/getAllNotificationsByTeam/${encodeURIComponent(teamId)}`, { headers: { accept: '*/*' } })
    const text = await response.text()
    if (!response.ok) return []
    const data = text ? JSON.parse(text) : []
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export const sendNotificationToPerson = async (privilegeId, notification) => {
  const response = await authFetch(`${API_URL}/Notification/send-to-person/${encodeURIComponent(privilegeId)}`, {
    method: 'POST',
    headers: {
      accept: '*/*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: notification.title,
      message: notification.message
    })
  })
  return readResponse(response)
}

export const sendNotificationToTeam = async (teamId, notification) => {
  try {
    const privileges = await getNotificationPrivileges()
    const teamMembers = privileges.filter((p) => Number(p.teamId) === Number(teamId))
    if (teamMembers.length > 0) {
      const results = await Promise.allSettled(
        teamMembers.map((m) => sendNotificationToPerson(m.id, notification))
      )
      const fulfilled = results.filter((r) => r.status === 'fulfilled')
      if (fulfilled.length > 0) {
        return `Értesítés elküldve (${fulfilled.length}/${teamMembers.length} tagnak eljuttatva).`
      }
      const firstError = results[0]?.reason?.message || 'Nincs feliratkozott eszköz ennél a csapatnál.'
      throw new Error(firstError)
    }
  } catch (error) {
    throw error
  }

  throw new Error(`A(z) #${teamId} csapathoz nem találhatók regisztrált tagok.`)
}

export const sendNotificationToEmail = async (email, notification, teamIdFallback = null) => {
  const cleanEmail = String(email || '').trim().toLowerCase()
  if (!cleanEmail) throw new Error('Érvénytelen e-mail-cím.')

  // 1. Try finding person in Privilege table and use send-to-person
  try {
    const privileges = await getNotificationPrivileges()
    const person = privileges.find((p) => String(p.emailAddress || p.email || '').trim().toLowerCase() === cleanEmail)
    if (person && person.id) {
      return await sendNotificationToPerson(person.id, notification)
    }
  } catch (error) {
    throw error
  }

  // 2. Try looking up team
  if (teamIdFallback) {
    return sendNotificationToTeam(teamIdFallback, notification)
  }

  try {
    const teamResponse = await authFetch(`${API_URL}/Teams/teambyemail/${encodeURIComponent(cleanEmail)}`)
    if (teamResponse.ok) {
      const teamData = await teamResponse.json()
      const foundId = Array.isArray(teamData) ? teamData[0]?.id : (teamData?.id || teamData?.teamId)
      if (foundId) {
        return sendNotificationToTeam(foundId, notification)
      }
    }
  } catch {
    // ignore lookup error
  }

  throw new Error(`A(z) ${cleanEmail} címhez nem található regisztrált felhasználó a push értesítéshez.`)
}

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)))
}

export const getCurrentPushSubscription = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
  const registration = await navigator.serviceWorker.register('/push-service-worker.js')
  return registration.pushManager.getSubscription()
}

export const unsubscribeFromPush = async () => {
  const subscription = await getCurrentPushSubscription()
  if (!subscription) return false
  return subscription.unsubscribe()
}

export const subscribeToPush = async (userEmailOrPrivilegeId = null) => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    throw new Error('Ez a böngésző nem támogatja a push értesítéseket.')
  }
  const vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY
  if (!vapidPublicKey) throw new Error('A REACT_APP_VAPID_PUBLIC_KEY nincs beállítva a .env fájlban.')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Az értesítési engedély nem lett megadva.')

  const registration = await navigator.serviceWorker.register('/push-service-worker.js')
  const subscription = await registration.pushManager.getSubscription()
    || await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    })
  const serialized = subscription.toJSON()
  const subscriptionData = {
    endpoint: subscription.endpoint,
    p256dh: serialized.keys?.p256dh,
    auth: serialized.keys?.auth
  }

  let targetPrivilegeId = null

  if (typeof userEmailOrPrivilegeId === 'number' && userEmailOrPrivilegeId > 0) {
    targetPrivilegeId = userEmailOrPrivilegeId
  } else if (typeof userEmailOrPrivilegeId === 'string' && userEmailOrPrivilegeId.includes('@')) {
    const cleanEmail = userEmailOrPrivilegeId.trim().toLowerCase()
    try {
      const allPrivs = await getNotificationPrivileges()
      const matched = allPrivs.find((p) => String(p.emailAddress || p.email || '').trim().toLowerCase() === cleanEmail)
      if (matched?.id) {
        targetPrivilegeId = matched.id
      }
    } catch {
      // ignore
    }
  }

  const response = await authFetch(`${API_URL}/Notification/subscribe`, {
    method: 'POST',
    headers: { accept: '*/*', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      privilegeID: targetPrivilegeId ? Number(targetPrivilegeId) : 0,
      ...subscriptionData
    })
  })

  await readResponse(response)
  return subscription
}

export const subscribeTeamsToPush = async (teamIds = [], privilegeIdOrEmail = null) => {
  return subscribeToPush(privilegeIdOrEmail)
}
