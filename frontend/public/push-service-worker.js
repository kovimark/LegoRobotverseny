self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { body: event.data ? event.data.text() : '' }
  }
  const notificationData = payload.notification || payload.data || payload
  const title = notificationData.title || notificationData.Title || payload.title || payload.Title || 'Robotverseny'
  const newsUrl = title ? `/hirek/cim/${encodeURIComponent(title)}` : '/hirek'
  const options = {
    body: notificationData.body || notificationData.Body || notificationData.message || notificationData.Message || 'Új értesítés érkezett.',
    icon: notificationData.icon || '/logo192.png',
    badge: notificationData.badge || '/favicon.ico',
    data: { url: notificationData.url || notificationData.Url || notificationData.link || notificationData.Link || newsUrl },
    tag: notificationData.tag || `robotverseny-${Date.now()}`,
    renotify: true
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = new URL(event.notification.data?.url || '/sajat-csapataim', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => client.url === targetUrl)
      return existingClient ? existingClient.focus() : self.clients.openWindow(targetUrl)
    })
  )
})
