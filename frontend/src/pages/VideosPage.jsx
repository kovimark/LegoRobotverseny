import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getVideos, VIDEOS_CHANGED_EVENT } from '../services/videoApi'
import { getYouTubeEmbedUrl } from '../utils/youtube'
import { DATA_REFRESH_EVENT } from '../config/dataRefresh'

const renderDescriptionWithLinks = (text) => {
  if (!text) return null
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9.-]+\.vercel\.app[^\s]*)/g
  const parts = text.split(urlRegex)
  return parts.map((part, index) => {
    if (!part) return null
    if (part.match(urlRegex)) {
      const href = part.startsWith('http') ? part : `https://${part}`
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary fw-semibold text-decoration-none"
        >
          {part}
        </a>
      )
    }
    return part
  })
}

export default function VideosPage() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [openedVideoId, setOpenedVideoId] = useState(null)

  const loadVideos = async () => {
    try {
      setLoading(true)
      const data = await getVideos()
      setVideos(Array.isArray(data) ? data : [])
    } catch {
      setVideos([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVideos()

    const handleRefresh = () => loadVideos()
    window.addEventListener(VIDEOS_CHANGED_EVENT, handleRefresh)
    window.addEventListener(DATA_REFRESH_EVENT, handleRefresh)

    return () => {
      window.removeEventListener(VIDEOS_CHANGED_EVENT, handleRefresh)
      window.removeEventListener(DATA_REFRESH_EVENT, handleRefresh)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && openedVideoId) {
        setOpenedVideoId(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openedVideoId])

  const toggleDescription = (id) => {
    setOpenedVideoId((prev) => (prev === id ? null : id))
  }

  return (
    <main className="container py-4 my-2">
      {/* Elmosott háttér, ha egy videó leírása nyitva van */}
      {openedVideoId && (
        <div
          className="video-blur-backdrop"
          onClick={() => setOpenedVideoId(null)}
          aria-hidden="true"
        />
      )}

      <div className="text-center mb-4">
        <h2 className="display-6 fw-bold mb-2">Videók</h2>
        <p className="text-muted mb-0">
          A Brickathlon versenyszámok hivatalos videói és bemutatói.
        </p>
      </div>

      {loading && (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-arrow-repeat spin me-2" />
          Videók betöltése...
        </div>
      )}

      {/* Ha vannak videók, kártya rácsban jelenítjük meg */}
      {!loading && videos.length > 0 && (
        <div className="row g-4 mb-5">
          {videos.map((video, index) => {
            const embedUrl = getYouTubeEmbedUrl(video.url)
            const videoId = video.id || `video-${index}`
            const isDescOpen = openedVideoId === videoId
            const hasDescription = Boolean(video.description && video.description.trim())

            return (
              <div className="col-12 col-md-6 col-lg-6" key={videoId}>
                <article
                  className={`card h-100 border-0 rounded-4 bg-white position-relative ${
                    isDescOpen ? 'video-card-elevated' : 'shadow-sm'
                  }`}
                  style={{
                    overflow: 'visible'
                  }}
                >
                  <div className="ratio ratio-16x9 bg-dark rounded-top-4 overflow-hidden">
                    {embedUrl ? (
                      <iframe
                        src={embedUrl}
                        title={video.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div className="d-flex align-items-center justify-content-center text-white small">
                        Videó lejátszó nem tölthető be
                      </div>
                    )}
                  </div>

                  <div className="card-body p-3 d-flex flex-column justify-content-between rounded-bottom-4 bg-white">
                    <h3 className="h6 fw-bold text-dark mb-3">{video.title}</h3>

                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 pt-2 border-top">
                      {hasDescription ? (
                        <button
                          type="button"
                          className={`btn btn-sm d-inline-flex align-items-center gap-1 ${
                            isDescOpen ? 'btn-primary' : 'btn-outline-secondary'
                          }`}
                          onClick={() => toggleDescription(videoId)}
                          aria-expanded={isDescOpen}
                        >
                          <i className={`bi ${isDescOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
                          <span>{isDescOpen ? 'Leírás bezárása' : 'Leírás megnyitása'}</span>
                        </button>
                      ) : (
                        <div />
                      )}

                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline-danger btn-sm d-inline-flex align-items-center gap-1 ms-auto"
                      >
                        <i className="bi bi-youtube" />
                        <span>Megnyitás YouTube-on</span>
                      </a>
                    </div>
                  </div>

                  {/* Lefelé lenyíló Dropdown Overlay leírás (nem tol el semmit) */}
                  {hasDescription && isDescOpen && (
                    <div className="video-description-dropdown">
                      <div className="d-flex justify-content-between align-items-center mb-2 pb-1 border-bottom">
                        <span className="small fw-bold text-dark d-flex align-items-center gap-1">
                          <i className="bi bi-info-circle-fill text-primary" />
                          <span>Videó leírása:</span>
                        </span>
                        <button
                          type="button"
                          className="btn-close btn-close-sm"
                          aria-label="Leírás bezárása"
                          onClick={() => toggleDescription(videoId)}
                        />
                      </div>
                      <p
                        className="small text-muted mb-0"
                        style={{ whiteSpace: 'pre-line', lineHeight: '1.65' }}
                      >
                        {renderDescriptionWithLinks(video.description)}
                      </p>
                    </div>
                  )}
                </article>
              </div>
            )
          })}
        </div>
      )}

      {/* Ha nincs videó */}
      {!loading && videos.length === 0 && (
        <div className="card border-0 bg-light p-4 p-md-5 rounded-4 mx-auto shadow-sm mb-5" style={{ maxWidth: '640px' }}>
          <div className="text-center mb-3">
            <i className="bi bi-camera-video text-primary" style={{ fontSize: '2.4rem' }} />
            <br />
            <h3 className="h5 fw-bold mt-2 mb-2">A szabályok videói hamarosan elérhetőek</h3>
            <p className="text-muted small mb-0">
              A versenyszámok részletes videós bemutatói jelenleg készülőben vannak.
            </p>
          </div>

          <div className="card border-0 bg-white p-3 rounded-3 shadow-sm my-3">
            <div className="d-flex align-items-start gap-2 mb-2 text-primary">
              <i className="bi bi-bell-fill fs-5 mt-1" />
              <div>
                <h4 className="h6 fw-bold mb-1 text-dark">Hogyan értesülhetsz a megjelenésről?</h4>
                <p className="small text-muted mb-2">
                  Amint a videók elérhetővé válnak, a <strong>regisztrált csapatoknak e-mailben értesítést küldünk</strong>, valamint <strong>közvetlen push értesítést küldünk a telefonra és a böngészőbe</strong> azoknak, akik engedélyezték azt.
                </p>
              </div>
            </div>

            <div className="bg-light p-3 rounded-3 border-start border-3 border-primary small">
              <div className="fw-semibold text-dark mb-1">
                <i className="bi bi-phone me-1 text-primary" />
                Értesítések bekapcsolása telefonon / böngészőben:
              </div>
              <ol className="mb-0 ps-3 text-muted">
                <li>Jelentkezz be Google fiókoddal a jobb felső sarokban!</li>
                <li>A megjelenő sávban vagy a <strong>Profil</strong> menüben kattints az értesítések engedélyezésére / bekapcsolására.</li>
              </ol>
            </div>
          </div>

          <div className="d-flex flex-wrap justify-content-center gap-2 mt-2">
            <Link className="btn btn-outline-primary btn-sm px-3 py-2" to="/szabalyzat">
              <i className="bi bi-file-earmark-text me-2" />
              Szabályzat megtekintése
            </Link>
            <Link className="btn btn-primary btn-sm px-3 py-2" to="/versenyjelentkezes">
              <i className="bi bi-pencil-square me-2" />
              Versenyjelentkezés
            </Link>
          </div>
        </div>
      )}

      {/* Kapcsolódó linkek */}
      {!loading && videos.length > 0 && (
        <div className="card border-0 bg-light p-3 rounded-4 mx-auto text-center" style={{ maxWidth: '640px' }}>
          <div className="d-flex flex-wrap justify-content-center gap-2">
            <Link className="btn btn-outline-primary btn-sm px-3" to="/szabalyzat">
              <i className="bi bi-file-earmark-text me-1" />
              Szabályzat
            </Link>
            <Link className="btn btn-primary btn-sm px-3" to="/versenyjelentkezes">
              <i className="bi bi-pencil-square me-1" />
              Versenyjelentkezés
            </Link>
          </div>
        </div>
      )}
    </main>
  )
}
