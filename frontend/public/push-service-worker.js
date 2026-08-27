self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { body: event.data ? event.data.text() : '' }
  }
  const notificationData = payload.notification || payload.data || payload
  const title = notificationData.title || notificationData.Title || payload.title || payload.Title || 'Robotverseny'
  const isAnnouncement =
    payload.type === 'message' ||
    payload.type === 'announcement' ||
    payload.type === 'news' ||
    /hír|közlemény/i.test(title)
  const defaultUrl = isAnnouncement ? '/uzenetek?tab=announcements' : '/uzenetek?tab=notifications'

  const options = {
    body: notificationData.body || notificationData.Body || notificationData.message || notificationData.Message || 'Új értesítés érkezett.',
    icon: notificationData.icon || '/logo192.png',
    badge: notificationData.badge || '/favicon.ico',
    data: {
      url: notificationData.url || notificationData.Url || notificationData.link || notificationData.Link || defaultUrl,
      isAnnouncement
    },
    tag: notificationData.tag || `robotverseny-${Date.now()}`,
    renotify: true
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    (async () => {
      let targetPath = event.notification.data?.url || '/uzenetek'
      const targetUrl = new URL(targetPath, self.location.origin).href
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const existingClient = clients.find((client) => client.url.includes('/uzenetek') || client.url.includes('/ertesiteseim') || client.url === targetUrl)
      if (existingClient) {
        if (existingClient.navigate) {
          await existingClient.navigate(targetUrl)
        }
        return existingClient.focus()
      }
      return self.clients.openWindow(targetUrl)
    })()
  )
})
