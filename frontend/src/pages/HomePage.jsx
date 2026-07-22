import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getActiveMessages, MESSAGE_BOARD_CHANGED_EVENT } from '../services/messageBoardApi'
import { stripMessageLinkMarkers } from '../utils/messageContent'
import { getCategoryBadgeStyle } from '../utils/categoryColor'

export default function HomePage() {
  const [messages, setMessages] = useState([])

  useEffect(() => {
    const loadMessages = () => getActiveMessages().then((items) => {
      const newestFirst = [...items].sort((a, b) => {
        const dateDifference = (b.start ? new Date(b.start).getTime() : 0) - (a.start ? new Date(a.start).getTime() : 0)
        return dateDifference || Number(b.id || 0) - Number(a.id || 0)
      })
      setMessages(newestFirst.slice(0, 5))
    }).catch(() => setMessages([]))
    loadMessages()
    window.addEventListener(MESSAGE_BOARD_CHANGED_EVENT, loadMessages)
    return () => window.removeEventListener(MESSAGE_BOARD_CHANGED_EVENT, loadMessages)
  }, [])

  const excerpt = (text, length = 150) => {
    const normalized = stripMessageLinkMarkers(text).replace(/\s+/g, ' ').trim()
    return normalized.length > length ? `${normalized.slice(0, length).trimEnd()}…` : normalized
  }

  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="home-panel">
          <span className="home-kicker">Őszi robotverseny</span>
          <h1 className="home-title">Robotverseny</h1>
          <p className="home-copy">
            Jelentkezzetek max 2 fős csapattal, hozzátok az ötleteket, és mutassátok meg, mire képes a robototok a pályán.
          </p>
          <p className="home-description">
            A célunk egy egyszerű, átlátható és izgalmas verseny létrehozása, ahol a résztvevők megmutathatják kreativitásukat és programozási tudásukat. A csapatok különböző kihívásokkal találkoznak, a legjobb megoldások pedig értékes díjakat nyerhetnek.
          </p>
          <div className="home-actions">
            <Link className="btn btn-primary px-4 py-2" to="/versenyjelentkezes">
              Jelentkezés
            </Link>
            <Link className="btn btn-theme-secondary px-4 py-2" to="/szabalyzat">
              Szabályzat
            </Link>
          </div>
        </div>
      </section>

      <section className="home-carousel-section">
        <div className="home-section-heading">          
          <h2 >Hírek és információk</h2>
        </div>

        {messages.length > 0 ? (
          <div id="homeInfoCarousel" className="carousel slide home-carousel" data-bs-ride="carousel">
            {messages.length > 1 && <div className="carousel-indicators">{messages.map((message, index) => <button key={message.id} type="button" data-bs-target="#homeInfoCarousel" data-bs-slide-to={index} className={index === 0 ? 'active' : ''} aria-current={index === 0 ? 'true' : undefined} aria-label={`${index + 1}. hír`} />)}</div>}
            <div className="carousel-inner">
              {messages.map((message, index) => (
                <div className={`carousel-item ${index === 0 ? 'active' : ''}`} key={message.id}>
                  <Link className="home-carousel-link" to={`/hirek/${message.id}`}>
                    <article className="home-carousel-card">
                      <span className="home-card-tag" style={getCategoryBadgeStyle(message.typeHex)}>{message.type || 'Hír'}</span>
                      <h3>{message.title}</h3>
                      <p>{excerpt(message.text)}</p>
                      <span className="home-message-time"><i className="bi bi-calendar3" /><span><strong>Közzétéve:</strong> {message.start ? new Date(message.start).toLocaleString('hu-HU') : 'most'}<br /><strong>Lejárat:</strong> {message.end ? new Date(message.end).toLocaleString('hu-HU') : 'nincs lejárat'}</span></span>
                      <span className="home-read-more">Tovább olvasom <i className="bi bi-arrow-right" /></span>
                    </article>
                  </Link>
                </div>
              ))}
            </div>
            {messages.length > 1 && <><button className="carousel-control-prev" type="button" data-bs-target="#homeInfoCarousel" data-bs-slide="prev"><span className="carousel-control-prev-icon" aria-hidden="true" /><span className="visually-hidden">Előző</span></button><button className="carousel-control-next" type="button" data-bs-target="#homeInfoCarousel" data-bs-slide="next"><span className="carousel-control-next-icon" aria-hidden="true" /><span className="visually-hidden">Következő</span></button></>}
          </div>
        ) : <div className="home-news-empty">Jelenleg nincs közzétett hír.</div>}
        <div className="text-end mt-3"><Link className="btn btn-outline-dark" to="/hirek">Összes hír</Link></div>
      </section>
    </main>
  )
}
