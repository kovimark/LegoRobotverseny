import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getActiveMessages, MESSAGE_BOARD_CHANGED_EVENT } from '../services/messageBoardApi'
import { stripMessageLinkMarkers } from '../utils/messageContent'
import { getCategoryBadgeStyle } from '../utils/categoryColor'

const competitions = [
  {
    title: 'Szumó',
    icon: 'bi-record-circle',
    text: 'Közvetlen robotpárharcok, gyors döntések és stabil szerkezet a győzelemért.'
  },
  {
    title: 'Vonalkövetés',
    icon: 'bi-sign-turn-right',
    text: 'Precíz érzékelés és megbízható programozás időre teljesítendő pályán.'
  },
  {
    title: 'Hegymászás',
    icon: 'bi-graph-up-arrow',
    text: 'Tapadás, erőátvitel és szerkezeti tervezés különböző meredekségű emelkedőkön.'
  },
  {
    title: 'Kosárra dobás',
    icon: 'bi-bullseye',
    text: 'Pontosság, következetesség és jól hangolt mechanika minden próbálkozásnál.'
  }
]

const quickLinks = [
  {
    title: 'Szabálykönyv',
    text: 'Olvasd el a teljes hivatalos szabálykönyvet és a részletes versenyfeltételeket.',
    to: '/szabalyzat',
    cta: 'Szabályzat megnyitása',
    icon: 'bi-journal-text'
  },
  {
    title: 'Jelentkezés',
    text: 'Nevezd be a csapatodat az online felületen, és kezdd meg a felkészülést időben.',
    to: '/versenyjelentkezes',
    cta: 'Jelentkezés indítása',
    icon: 'bi-pencil-square'
  },
  {
    title: 'Állások',
    text: 'Kövesd a pontokat, helyezéseket és az összesített eredményeket egy helyen.',
    to: '/allasok',
    cta: 'Állások megtekintése',
    icon: 'bi-trophy'
  },
  {
    title: 'Hírek',
    text: 'Minden fontos közlemény, frissítés és versenyinformáció elérhető a hírek között.',
    to: '/hirek',
    cta: 'Hírek böngészése',
    icon: 'bi-megaphone'
  }
]

const excerpt = (text, length = 180) => {
  const normalized = stripMessageLinkMarkers(text).replace(/\s+/g, ' ').trim()
  return normalized.length > length ? `${normalized.slice(0, length).trimEnd()}…` : normalized
}

const getMessageTimestamp = (message) => {
  const timestamp = message.start ? new Date(message.start).getTime() : 0
  return Number.isNaN(timestamp) ? 0 : timestamp
}

export default function HomePage() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadMessages = async () => {
      try {
        setLoading(true)
        setError('')
        setMessages(await getActiveMessages())
      } catch (loadError) {
        setError(loadError.message)
      } finally {
        setLoading(false)
      }
    }

    loadMessages()
    window.addEventListener(MESSAGE_BOARD_CHANGED_EVENT, loadMessages)
    return () => window.removeEventListener(MESSAGE_BOARD_CHANGED_EVENT, loadMessages)
  }, [])

  const featuredMessages = useMemo(() => (
    [...messages]
      .sort((left, right) => getMessageTimestamp(right) - getMessageTimestamp(left))
      .slice(0, 3)
  ), [messages])

  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="home-panel">
          <span className="home-kicker">BRICKATHLON 2026</span>
          <h1 className="home-title">LEGO robotverseny diákoknak</h1>
          <p className="home-copy">
            Négy versenyszám, átlátható lebonyolítás és egy olyan felület, ahol minden fontos információ egy helyen követhető.
          </p>
          <p className="home-description">
            A Brickathlon célja, hogy a csapatok megmutathassák kreativitásukat építésben, programozásban és problémamegoldásban. A weboldalon megtalálod a szabályokat, a jelentkezést, a híreket és az aktuális állásokat is.
          </p>
          <div className="home-actions">
            <Link className="btn btn-primary px-4 py-2" to="/versenyjelentkezes">
              Jelentkezés
            </Link>
            <Link className="btn btn-theme-secondary px-4 py-2" to="/szabalyzat">
              Szabálykönyv
            </Link>
            <Link className="btn btn-outline-primary px-4 py-2" to="/allasok">
              Állások
            </Link>
          </div>
        </div>
      </section>

      <section className="container py-4">
        <div className="home-section-heading">
          <span className="home-kicker">Versenyszámok</span>
          <h2>Négy különböző kihívás</h2>
        </div>
        <div className="row g-3">
          {competitions.map((competition) => (
            <div className="col-md-6 col-xl-3" key={competition.title}>
              <article className="news-card h-100">
                <span className="home-card-tag">{competition.title}</span>
                <h3 className="h5 d-flex align-items-center gap-2">
                  <i className={`bi ${competition.icon}`} />
                  <span>{competition.title}</span>
                </h3>
                <p className="mb-0">{competition.text}</p>
              </article>
            </div>
          ))}
        </div>
      </section>

      <section className="container py-4">
        <div className="home-section-heading">
          <span className="home-kicker">Gyors elérés</span>
          <h2>Legfontosabb oldalak</h2>
        </div>
        <div className="row g-3">
          {quickLinks.map((item) => (
            <div className="col-md-6 col-xl-3" key={item.title}>
              <Link className="news-card-link" to={item.to}>
                <article className="news-card h-100">
                  <span className="home-card-tag">
                    <i className={`bi ${item.icon} me-2`} />
                    {item.title}
                  </span>
                  <h3 className="h5">{item.title}</h3>
                  <p>{item.text}</p>
                  <span className="news-card-more">
                    {item.cta}
                    <i className="bi bi-arrow-right" />
                  </span>
                </article>
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="container py-4 pb-5">
        <div className="home-section-heading">
          <span className="home-kicker">Friss hírek</span>
          <h2>Aktuális közlemények</h2>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {loading ? (
          <div className="alert alert-info">Hírek betöltése...</div>
        ) : featuredMessages.length > 0 ? (
          <div className="row g-3">
            {featuredMessages.map((message) => (
              <div className="col-md-6 col-xl-4" key={message.id}>
                <Link className="news-card-link" to={`/hirek/${message.id}`}>
                  <article className="news-card h-100">
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <span className="home-card-tag news-card-tag" style={getCategoryBadgeStyle(message.typeHex)}>
                        {message.type || 'Hír'}
                      </span>
                      {message.start && (
                        <time className="small text-muted">
                          {new Date(message.start).toLocaleDateString('hu-HU')}
                        </time>
                      )}
                    </div>
                    <h3 className="h5">{message.title || 'Közlemény'}</h3>
                    <p>{excerpt(message.text)}</p>
                    <span className="news-card-more">
                      Tovább olvasom
                      <i className="bi bi-arrow-right" />
                    </span>
                  </article>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="home-news-empty">
            <i className="bi bi-newspaper" />
            <h2 className="h5 mt-3">Jelenleg nincs aktív hír</h2>
            <p className="mb-0 text-muted">Nézz vissza később az új közleményekért.</p>
          </div>
        )}
      </section>
    </main>
  )
}
