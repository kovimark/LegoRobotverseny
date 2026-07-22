import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getActiveMessages, MESSAGE_BOARD_CHANGED_EVENT } from '../services/messageBoardApi'
import { stripMessageLinkMarkers } from '../utils/messageContent'
import { getCategoryBadgeStyle } from '../utils/categoryColor'

const excerpt = (text, length = 180) => {
  const normalized = stripMessageLinkMarkers(text).replace(/\s+/g, ' ').trim()
  return normalized.length > length ? `${normalized.slice(0, length).trimEnd()}…` : normalized
}

export default function NewsPage() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')

  useEffect(() => {
    const load = async () => {
      try { setLoading(true); setError(''); setMessages(await getActiveMessages()) }
      catch (loadError) { setError(loadError.message) }
      finally { setLoading(false) }
    }
    load()
    window.addEventListener(MESSAGE_BOARD_CHANGED_EVENT, load)
    return () => window.removeEventListener(MESSAGE_BOARD_CHANGED_EVENT, load)
  }, [])

  const categories = useMemo(() => [...new Set(messages.map((message) => message.type).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'hu')), [messages])
  const filteredMessages = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('hu-HU')
    return messages.filter((message) => {
      const categoryMatches = !category || message.type === category
      const queryMatches = !normalizedQuery || `${message.title} ${message.text} ${message.type}`.toLocaleLowerCase('hu-HU').includes(normalizedQuery)
      return categoryMatches && queryMatches
    })
  }, [messages, query, category])

  return (
    <main className="container py-4 news-page">
      <div className="mb-4"><span className="home-kicker">Friss információk</span><h1 className="mt-2 mb-2">Hírek</h1><p className="text-muted mb-0">Közlemények, programok és minden fontos versenyinformáció egy helyen.</p></div>
      <section className="news-filters mb-4" aria-label="Hírek szűrése">
        <div className="row g-3">
          <div className="col-md-8"><label className="form-label fw-semibold" htmlFor="news-search">Keresés</label><div className="input-group"><span className="input-group-text"><i className="bi bi-search" /></span><input id="news-search" type="search" className="form-control" placeholder="Keresés címben és szövegben" value={query} onChange={(event) => setQuery(event.target.value)} /></div></div>
          <div className="col-md-4"><label className="form-label fw-semibold" htmlFor="news-category">Kategória</label><select id="news-category" className="form-select" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Minden kategória</option>{categories.map((name) => <option value={name} key={name}>{name}</option>)}</select></div>
        </div>
      </section>
      {error && <div className="alert alert-danger" role="status">{error}</div>}
      {loading ? <div className="alert alert-info">Hírek betöltése...</div> : filteredMessages.length > 0 ? (
        <div className="row g-3">{filteredMessages.map((message) => <div className="col-md-6 col-xl-4" key={message.id}><Link className="news-card-link" to={`/hirek/${message.id}`}><article className="news-card h-100"><div className="d-flex justify-content-between align-items-start gap-2"><span className="home-card-tag news-card-tag" style={getCategoryBadgeStyle(message.typeHex)}>{message.type || 'Hír'}</span>{message.start && <time className="small text-muted">{new Date(message.start).toLocaleDateString('hu-HU')}</time>}</div><h2 className="h5">{message.title}</h2><p>{excerpt(message.text)}</p><div className="small text-muted mb-2"><i className="bi bi-clock me-1" />{message.start ? new Date(message.start).toLocaleString('hu-HU') : 'Most'} – {message.end ? new Date(message.end).toLocaleString('hu-HU') : 'Nincs lejárat'}</div><span className="news-card-more">Tovább olvasom <i className="bi bi-arrow-right" /></span></article></Link></div>)}</div>
      ) : <div className="news-empty"><i className="bi bi-newspaper" /><h2 className="h5 mt-3">Nincs találat</h2><p className="mb-0 text-muted">Próbálj másik keresést vagy kategóriát.</p></div>}
    </main>
  )
}
