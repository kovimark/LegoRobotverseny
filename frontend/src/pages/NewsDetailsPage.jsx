import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getActiveMessages } from '../services/messageBoardApi'
import MessageLinks from '../components/MessageLinks'
import MessageText from '../components/MessageText'
import { getCategoryBadgeStyle } from '../utils/categoryColor'

export default function NewsDetailsPage() {
  const { messageId } = useParams()
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getActiveMessages()
      .then((items) => setMessage(items.find((item) => String(item.id) === String(messageId)) || null))
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false))
  }, [messageId])

  if (loading) return <main className="container py-5"><div className="alert alert-info">Hír betöltése...</div></main>
  if (error) return <main className="container py-5"><div className="alert alert-danger">{error}</div><Link to="/hirek" className="btn btn-outline-dark">Vissza a hírekhez</Link></main>
  if (!message) return <main className="container py-5"><div className="news-empty"><i className="bi bi-file-earmark-x" /><h1 className="h4 mt-3">Ez a hír nem található vagy már nem aktív.</h1><Link to="/hirek" className="btn btn-primary mt-2">Vissza a hírekhez</Link></div></main>

  return (
    <main className="container py-4 news-details-page">
      <Link to="/hirek" className="news-back-link"><i className="bi bi-arrow-left" /> Összes hír</Link>
      <article className="news-details-card">
        <header className="news-details-header"><span className="home-card-tag" style={getCategoryBadgeStyle(message.typeHex)}>{message.type || 'Hír'}</span><h1>{message.title}</h1><div className="news-details-date"><i className="bi bi-calendar3" /><span>Megjelenés: {message.start ? new Date(message.start).toLocaleString('hu-HU') : 'azonnal'}<br />Lejárat: {message.end ? new Date(message.end).toLocaleString('hu-HU') : 'nincs megadva'}</span></div></header>
        <div className="news-details-content"><MessageText text={message.text} links={message.links} /></div>
        <div className="news-details-links"><MessageLinks links={message.links} /></div>
      </article>
    </main>
  )
}
