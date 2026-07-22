import React from 'react'

const parseLinks = (links) => String(links || '')
  .split(/\r?\n/)
  .map((link) => link.trim())
  .filter(Boolean)
  .map((link) => {
    try {
      const url = new URL(link)
      return ['http:', 'https:'].includes(url.protocol) ? url : null
    } catch {
      return null
    }
  })
  .filter(Boolean)

const getYouTubeId = (url) => {
  const host = url.hostname.replace(/^www\./, '').toLowerCase()
  if (host === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] || null
  if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (url.pathname === '/watch') return url.searchParams.get('v')
    const parts = url.pathname.split('/').filter(Boolean)
    if (['embed', 'shorts', 'live'].includes(parts[0])) return parts[1] || null
  }
  return null
}

export default function MessageLinks({ links, compact = false }) {
  const parsedLinks = parseLinks(links)
  if (parsedLinks.length === 0) return null

  return (
    <section className={`message-links ${compact ? 'message-links-compact' : ''}`} aria-label="Kapcsolódó linkek">
      {!compact && <h2 className="h5 mb-3">Kapcsolódó tartalmak</h2>}
      {parsedLinks.map((url, index) => {
        const youtubeId = getYouTubeId(url)
        return youtubeId && !compact ? (
          <div className="message-video" key={`${url.href}-${index}`}>
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}`}
              title={`Kapcsolódó YouTube-videó ${index + 1}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
            />
          </div>
        ) : (
          <a className="message-external-link" href={url.href} target="_blank" rel="noopener noreferrer" key={`${url.href}-${index}`}>
            <i className={`bi ${youtubeId ? 'bi-youtube' : 'bi-link-45deg'}`} />
            <span>{youtubeId ? 'YouTube-videó megnyitása' : url.href}</span>
            <i className="bi bi-box-arrow-up-right" />
          </a>
        )
      })}
    </section>
  )
}
