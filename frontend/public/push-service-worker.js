self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { body: event.data ? event.data.text() : '' }
  }
  const title = payload.title || 'Robotverseny'
  const newsUrl = title ? `/hirek/cim/${encodeURIComponent(title)}` : '/hirek'
  const options = {
    body: payload.body || payload.message || 'Új értesítés érkezett.',
    icon: payload.icon || '/logo192.png',
    badge: payload.badge || '/favicon.ico',
    data: { url: payload.url || payload.link || newsUrl },
    tag: payload.tag || `robotverseny-${Date.now()}`,
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
