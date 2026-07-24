self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { body: event.data ? event.data.text() : '' }
  }
  const notificationData = payload.notification || payload.data || payload
  const title = notificationData.title || notificationData.Title || payload.title || payload.Title || 'Robotverseny'
  const options = {
    body: notificationData.body || notificationData.Body || notificationData.message || notificationData.Message || 'Új értesítés érkezett.',
    icon: notificationData.icon || '/logo192.png',
    badge: notificationData.badge || '/favicon.ico',
    data: { url: notificationData.url || notificationData.Url || notificationData.link || notificationData.Link || '/hirek' },
    tag: notificationData.tag || `robotverseny-${Date.now()}`,
    renotify: true
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    (async () => {
      let targetPath = event.notification.data?.url || '/hirek'
      if (!event.notification.data?.url || targetPath === '/hirek') {
        try {
          const response = await fetch('https://legocompetition.runasp.net/api/Message/getAllMessage', {
            headers: { accept: '*/*' }
          })
          if (response.ok) {
            const messages = await response.json()
            const newestMessage = (Array.isArray(messages) ? messages : [])
              .filter((message) => Number.isFinite(Number(message.id ?? message.messageId ?? message.messageID)))
              .sort((left, right) =>
                Number(right.id ?? right.messageId ?? right.messageID)
                - Number(left.id ?? left.messageId ?? left.messageID))[0]
            const newestId = newestMessage?.id ?? newestMessage?.messageId ?? newestMessage?.messageID
            if (newestId !== undefined && newestId !== null) targetPath = `/hirek/${encodeURIComponent(newestId)}`
          }
        } catch {
          targetPath = '/hirek'
        }
      }
      const targetUrl = new URL(targetPath, self.location.origin).href
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const existingClient = clients.find((client) => client.url === targetUrl)
      return existingClient ? existingClient.focus() : self.clients.openWindow(targetUrl)
    })()
  )
})
