import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getAllNotificationsByPerson, getAllNotificationsByTeam } from '../services/notificationApi'
import { getMessages } from '../services/messageBoardApi'
import { parseMessageTimestamp } from '../utils/notificationFormat'
import MessageText from './MessageText'
import MessageLinks from './MessageLinks'

export default function UserMessagesModal({ open, onClose, user, userTeamId = null, initialTab = 'notifications' }) {
  const [activeTab, setActiveTab] = useState(initialTab) // 'notifications' | 'announcements'
  const [notifications, setNotifications] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab)
    }
  }, [initialTab, open])

  const loadData = useCallback(async () => {
    if (!user?.email) return
    try {
      setLoading(true)
      setError('')

      const [personNotifsRes, allMsgsRes] = await Promise.allSettled([
        getAllNotificationsByPerson(user.email),
        getMessages()
      ])
      const personNotifs = personNotifsRes.status === 'fulfilled' && Array.isArray(personNotifsRes.value) ? personNotifsRes.value : []
      const allMsgs = allMsgsRes.status === 'fulfilled' && Array.isArray(allMsgsRes.value) ? allMsgsRes.value : []

      let teamNotifs = []
      if (userTeamId) {
        teamNotifs = await getAllNotificationsByTeam(userTeamId)
      } else {
        try {
          const teamRes = await fetch(`https://legocompetition.runasp.net/api/Teams/teambyemail/${encodeURIComponent(user.email)}`)
          if (teamRes.ok) {
            const teamData = await teamRes.json()
            const foundId = Array.isArray(teamData) ? teamData[0]?.id : (teamData?.id || teamData?.teamId)
            if (foundId) {
              teamNotifs = await getAllNotificationsByTeam(foundId)
            }
          }
        } catch {
          // ignore team lookup
        }
      }

      // Deduplicate notifications
      const combined = [...personNotifs, ...(Array.isArray(teamNotifs) ? teamNotifs : [])]
      const notifMap = new Map()
      combined.forEach((item, index) => {
        const key = item.id ? String(item.id) : `${item.title}-${item.text || item.message}-${index}`
        if (!notifMap.has(key)) {
          notifMap.set(key, item)
        }
      })

      setNotifications(Array.from(notifMap.values()))
      setAnnouncements(Array.isArray(allMsgs) ? allMsgs : [])
    } catch (err) {
      setError(err.message || 'Nem sikerült betölteni az üzeneteket.')
    } finally {
      setLoading(false)
    }
  }, [user?.email, userTeamId])

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open, loadData])

  const filteredNotifications = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('hu-HU')
    if (!term) return notifications
    return notifications.filter((item) =>
      `${item.title || ''} ${item.text || item.message || ''}`.toLocaleLowerCase('hu-HU').includes(term)
    )
  }, [notifications, search])

  const filteredAnnouncements = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('hu-HU')
    if (!term) return announcements
    return announcements.filter((item) =>
      `${item.title || ''} ${item.text || ''} ${item.type || ''}`.toLocaleLowerCase('hu-HU').includes(term)
    )
  }, [announcements, search])

  if (!open) return null

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', zIndex: 1200 }}>
      <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
        <div className="modal-content shadow-lg border-0">
          <div className="modal-header bg-light">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-bell-fill text-primary fs-5" aria-hidden="true" />
              <h1 className="modal-title fs-5 mb-0">Értesítések és üzenetek</h1>
            </div>
            <button type="button" className="btn-close" aria-label="Bezárás" onClick={onClose} />
          </div>

          <div className="modal-body p-4">
            {error && <div className="alert alert-danger mb-3">{error}</div>}

            {/* Fülválasztó */}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 pb-2 border-bottom">
              <div className="btn-group" role="group" aria-label="Üzenet típusok">
                <button
                  type="button"
                  className={`btn ${activeTab === 'notifications' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setActiveTab('notifications')}
                >
                  <i className="bi bi-bell me-2" />
                  Személyes értesítések
                  <span className="badge text-bg-light ms-2">{notifications.length}</span>
                </button>
                <button
                  type="button"
                  className={`btn ${activeTab === 'announcements' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setActiveTab('announcements')}
                >
                  <i className="bi bi-newspaper me-2" />
                  Hírek és közlemények
                  <span className="badge text-bg-light ms-2">{announcements.length}</span>
                </button>
              </div>

              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                disabled={loading}
                onClick={loadData}
              >
                <i className={`bi bi-arrow-clockwise me-1 ${loading ? 'spin-animation' : ''}`} />
                Frissítés
              </button>
            </div>

            {/* Kereső */}
            <div className="mb-3">
              <input
                type="search"
                className="form-control form-control-sm"
                placeholder="Keresés az üzenetekben…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Tartalom */}
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary mb-2" role="status" />
                <div className="text-muted small">Üzenetek betöltése…</div>
              </div>
            ) : activeTab === 'notifications' ? (
              <div className="d-flex flex-column gap-3">
                {filteredNotifications.length > 0 ? (
                  filteredNotifications.map((notif, idx) => {
                    const parsed = parseMessageTimestamp(notif.text || notif.message)

                    return (
                      <div className="card border shadow-sm rounded-3 overflow-hidden" key={notif.id || idx}>
                        <div className="card-header bg-light d-flex flex-wrap justify-content-between align-items-center gap-2 py-2 px-3">
                          <strong className="text-primary d-flex align-items-center gap-2">
                            <i className="bi bi-bell-fill" />
                            {notif.title || 'Értesítés'}
                          </strong>
                          <div className="d-flex align-items-center gap-2">
                            {parsed.timestamp && (
                              <small className="text-muted">
                                <i className="bi bi-clock me-1" />
                                {parsed.timestamp}
                              </small>
                            )}
                            {notif.id && <span className="badge text-bg-secondary">#{notif.id}</span>}
                          </div>
                        </div>
                        <div className="card-body py-3 px-3">
                          <p className="card-text mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                            {parsed.text || 'Nincs szöveges tartalom.'}
                          </p>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="alert alert-secondary text-center py-4 mb-0">
                    <i className="bi bi-bell-slash fs-3 d-block mb-2 text-muted" />
                    <span>{search ? 'Nincs a keresésnek megfelelő értesítés.' : 'Még nem érkezett személyes értesítés.'}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {filteredAnnouncements.length > 0 ? (
                  filteredAnnouncements.map((msg) => (
                    <div className="card border shadow-sm rounded-3 overflow-hidden" key={msg.id}>
                      <div className="card-header bg-light d-flex flex-wrap justify-content-between align-items-center gap-2 py-2 px-3">
                        <div className="d-flex align-items-center gap-2">
                          {msg.type && (
                            <span
                              className="badge"
                              style={{
                                backgroundColor: msg.typeHex || '#198754',
                                color: '#fff'
                              }}
                            >
                              {msg.type}
                            </span>
                          )}
                          <strong className="fs-6">{msg.title}</strong>
                        </div>
                        {msg.start && (
                          <small className="text-muted">
                            <i className="bi bi-calendar3 me-1" />
                            {new Date(msg.start).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </small>
                        )}
                      </div>
                      <div className="card-body py-3 px-3">
                        <div className="mb-2">
                          <MessageText text={msg.text} links={msg.links} />
                        </div>
                        <MessageLinks links={msg.links} />

                        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3 pt-2 border-top">
                          <Link
                            to={`/hirek/${msg.id}`}
                            className="btn btn-outline-primary btn-sm"
                            onClick={onClose}
                          >
                            <i className="bi bi-newspaper me-1" />
                            Hír olvasása
                          </Link>
                          <Link
                            to="/hirek"
                            className="btn btn-link btn-sm text-decoration-none p-0 text-secondary"
                            onClick={onClose}
                          >
                            Összes hír a Hírek oldalon <i className="bi bi-arrow-right" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="alert alert-secondary text-center py-4 mb-0">
                    <i className="bi bi-newspaper fs-3 d-block mb-2 text-muted" />
                    <span>{search ? 'Nincs a keresésnek megfelelő hír.' : 'Nincsenek aktív hírek vagy közlemények.'}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="modal-footer bg-light py-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Bezárás
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
