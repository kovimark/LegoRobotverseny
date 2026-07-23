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
  const response = await fetch(`${API_URL}/Teams`, { headers: { accept: '*/*' } })
  const text = await response.text()
  if (!response.ok) throw new Error(text || `A csapatok betöltése sikertelen (${response.status}).`)
  const data = text ? JSON.parse(text) : []
  return Array.isArray(data) ? data : []
}

export const sendNotificationToTeam = async (teamId, notification) => {
  const response = await fetch(`${API_URL}/Notification/send-to-team/${encodeURIComponent(teamId)}`, {
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

export const subscribeTeamsToPush = async (teamIds) => {
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

  for (const teamId of teamIds) {
    const response = await fetch(`${API_URL}/Notification/subscribe`, {
      method: 'POST',
      headers: { accept: '*/*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, ...subscriptionData })
    })
    await readResponse(response)
  }
  return subscription
}
