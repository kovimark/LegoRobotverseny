import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ConfirmModal from '../components/ConfirmModal'
import FloatingFeedback from '../components/FloatingFeedback'
import { getVideos, saveVideo, deleteVideo, VIDEOS_CHANGED_EVENT } from '../services/videoApi'
import { getYouTubeEmbedUrl, isValidVideoUrl } from '../utils/youtube'
import { DATA_REFRESH_EVENT } from '../config/dataRefresh'

const emptyForm = { id: '', title: '', url: '', description: '', originalUrl: '' }

export default function VideoManagementPage() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const isEditing = Boolean(formData.id)

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await getVideos()
      setVideos(Array.isArray(data) ? data : [])
    } catch (err) {
      setFeedback({ type: 'danger', text: `Hiba történt a videók betöltésekor: ${err.message}` })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()

    const handleRefresh = () => loadData()
    window.addEventListener(VIDEOS_CHANGED_EVENT, handleRefresh)
    window.addEventListener(DATA_REFRESH_EVENT, handleRefresh)

    return () => {
      window.removeEventListener(VIDEOS_CHANGED_EVENT, handleRefresh)
      window.removeEventListener(DATA_REFRESH_EVENT, handleRefresh)
    }
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleEdit = (video) => {
    setFormData({
      id: video.id || '',
      title: video.title || '',
      url: video.url || '',
      description: video.description || '',
      originalUrl: video.url || ''
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setFormData(emptyForm)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFeedback(null)

    const title = formData.title.trim()
    const url = formData.url.trim()
    const description = formData.description.trim()

    if (!title) {
      setFeedback({ type: 'danger', text: 'A videó címének megadása kötelező.' })
      return
    }

    if (!url) {
      setFeedback({ type: 'danger', text: 'A videó linkjének megadása kötelező.' })
      return
    }

    if (!isValidVideoUrl(url)) {
      setFeedback({ type: 'danger', text: 'Kérjük, adj meg egy érvényes YouTube vagy videó linket.' })
      return
    }

    try {
      setSaving(true)
      await saveVideo({
        id: formData.id || undefined,
        title,
        url,
        description,
        originalUrl: formData.originalUrl || formData.url
      })

      setFeedback({
        type: 'success',
        text: isEditing ? 'A videó sikeresen módosítva.' : 'Az új videó sikeresen hozzáadva.'
      })
      setFormData(emptyForm)
      await loadData()
    } catch (err) {
      setFeedback({ type: 'danger', text: `Hiba a mentés során: ${err.message}` })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      setIsDeleting(true)
      await deleteVideo(deleteTarget)
      setFeedback({ type: 'success', text: 'A videó sikeresen törölve.' })
      setDeleteTarget(null)
      await loadData()
    } catch (err) {
      setFeedback({ type: 'danger', text: `Hiba a törlés során: ${err.message}` })
    } finally {
      setIsDeleting(false)
    }
  }

  const embedPreviewUrl = getYouTubeEmbedUrl(formData.url)

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const filteredVideos = videos.filter((v) => {
    if (!normalizedSearch) return true
    return (
      (v.title && v.title.toLowerCase().includes(normalizedSearch)) ||
      (v.url && v.url.toLowerCase().includes(normalizedSearch)) ||
      (v.description && v.description.toLowerCase().includes(normalizedSearch))
    )
  })

  return (
    <main className="container py-4 my-2">
      <FloatingFeedback message={feedback} onClose={() => setFeedback(null)} />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Videó törlése"
        confirmLabel={isDeleting ? 'Törlés...' : 'Törlés'}
        cancelLabel="Mégse"
        confirmVariant="danger"
        busy={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      >
        <p className="mb-0">
          Biztosan törölni szeretnéd a(z) <strong>"{deleteTarget?.title || 'kiválasztott'}"</strong> videót?
        </p>
      </ConfirmModal>

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div className="d-flex align-items-center gap-2">
          <Link to="/admin" className="btn btn-outline-secondary btn-sm">
            <i className="bi bi-arrow-left me-1" />
            Admin
          </Link>
          <h2 className="mb-0">Videók kezelése</h2>
        </div>
        <Link to="/videok" className="btn btn-outline-primary btn-sm" target="_blank">
          <i className="bi bi-box-arrow-up-right me-1" />
          Videók oldal megtekintése
        </Link>
      </div>

      <div className="row g-4">
        {/* Űrlap */}
        <div className="col-lg-5">
          <div className="card shadow-sm border-0 p-4 rounded-4 bg-white sticky-lg-top" style={{ top: '5.5rem', zIndex: 10 }}>
            <h3 className="h5 fw-bold mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-camera-video text-primary" />
              <span>{isEditing ? 'Videó szerkesztése' : 'Új videó felvitele'}</span>
            </h3>

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3">
                <label htmlFor="videoTitle" className="form-label fw-semibold">
                  Videó címe <span className="text-danger fw-bold">*</span>
                </label>
                <input
                  type="text"
                  id="videoTitle"
                  name="title"
                  className="form-control"
                  placeholder="pl. Vonalkövetés versenyszabályzat"
                  value={formData.title}
                  onChange={handleChange}
                  disabled={saving}
                />
              </div>

              <div className="mb-3">
                <label htmlFor="videoUrl" className="form-label fw-semibold">
                  YouTube link / URL <span className="text-danger fw-bold">*</span>
                </label>
                <input
                  type="text"
                  id="videoUrl"
                  name="url"
                  className="form-control"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={formData.url}
                  onChange={handleChange}
                  disabled={saving}
                />
                <div className="form-text small">
                  Bármilyen YouTube link (watch, youtu.be, shorts, embed) vagy iframe kód megadható.
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="videoDescription" className="form-label fw-semibold">
                  Videó leírása <span className="text-muted fw-normal small">(opcionális)</span>
                </label>
                <textarea
                  id="videoDescription"
                  name="description"
                  rows={4}
                  className="form-control"
                  placeholder="Részletes leírás, szabálykiegészítés vagy kapcsolódó információk..."
                  value={formData.description}
                  onChange={handleChange}
                  disabled={saving}
                />
              </div>

              {/* Élő előnézet */}
              {embedPreviewUrl && (
                <div className="mb-3 p-2 bg-light rounded-3 border">
                  <div className="small fw-semibold text-muted mb-2">
                    <i className="bi bi-play-circle me-1 text-danger" />
                    Élő előnézet:
                  </div>
                  <div className="ratio ratio-16x9 rounded overflow-hidden shadow-sm">
                    <iframe
                      src={embedPreviewUrl}
                      title="Videó előnézet"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              <div className="d-flex gap-2 mt-4">
                <button
                  type="submit"
                  className="btn btn-primary flex-fill fw-semibold"
                  disabled={saving}
                >
                  <i className={`bi ${isEditing ? 'bi-check-lg' : 'bi-plus-lg'} me-1`} />
                  {saving ? 'Mentés...' : isEditing ? 'Módosítások mentése' : 'Videó hozzáadása'}
                </button>
                {isEditing && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={handleCancelEdit}
                    disabled={saving}
                  >
                    Mégse
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Videók listája */}
        <div className="col-lg-7">
          <div className="card shadow-sm border-0 p-4 rounded-4 bg-white">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <h3 className="h5 fw-bold mb-0 d-flex align-items-center gap-2">
                <i className="bi bi-collection-play text-primary" />
                <span>Felvitt videók ({videos.length})</span>
              </h3>
              {videos.length > 2 && (
                <div className="position-relative" style={{ maxWidth: '240px' }}>
                  <input
                    type="text"
                    className="form-control form-control-sm pe-4"
                    placeholder="Keresés..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <i className="bi bi-search position-absolute top-50 end-0 translate-middle-y me-2 text-muted small pe-none" />
                </div>
              )}
            </div>

            {loading && (
              <div className="text-center py-4 text-muted">
                <i className="bi bi-arrow-repeat spin me-2" />
                Videók betöltése...
              </div>
            )}

            {!loading && videos.length === 0 && (
              <div className="text-center py-5 text-muted border rounded-3 bg-light">
                <i className="bi bi-camera-video text-secondary fs-2 d-block mb-2" />
                <h4 className="h6 fw-bold mb-1">Még nincs rögzített videó</h4>
                <p className="small mb-0">
                  Használd a bal oldali űrlapot az első videó link és cím megadásához!
                </p>
              </div>
            )}

            {!loading && videos.length > 0 && filteredVideos.length === 0 && (
              <div className="text-center py-4 text-muted border rounded-3 bg-light">
                Nincs a keresésnek megfelelő videó.
              </div>
            )}

            {!loading && filteredVideos.length > 0 && (
              <div className="d-flex flex-column gap-3">
                {filteredVideos.map((video, index) => {
                  const embedUrl = getYouTubeEmbedUrl(video.url)
                  return (
                    <article
                      key={video.id || index}
                      className="border rounded-3 p-3 bg-light shadow-sm"
                    >
                      <div className="row g-3 align-items-center">
                        <div className="col-12 col-md-5">
                          {embedUrl ? (
                            <div className="ratio ratio-16x9 rounded overflow-hidden shadow-sm bg-dark">
                              <iframe
                                src={embedUrl}
                                title={video.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          ) : (
                            <div className="ratio ratio-16x9 rounded bg-secondary-subtle d-flex align-items-center justify-content-center text-muted small">
                              Nincs előnézet
                            </div>
                          )}
                        </div>
                        <div className="col-12 col-md-7">
                          <h4 className="h6 fw-bold mb-1 text-dark">{video.title}</h4>
                          <p className="small text-muted text-break mb-2">
                            <i className="bi bi-link-45deg me-1" />
                            <a
                              href={video.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-decoration-none"
                            >
                              {video.url}
                            </a>
                          </p>
                          {video.description && (
                            <p className="small text-muted mb-2 text-truncate" title={video.description}>
                              <i className="bi bi-card-text me-1" />
                              {video.description}
                            </p>
                          )}
                          <div className="d-flex gap-2 mt-2">
                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1"
                              onClick={() => handleEdit(video)}
                            >
                              <i className="bi bi-pencil" />
                              <span>Szerkesztés</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm d-inline-flex align-items-center gap-1"
                              onClick={() => setDeleteTarget(video)}
                            >
                              <i className="bi bi-trash" />
                              <span>Törlés</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
