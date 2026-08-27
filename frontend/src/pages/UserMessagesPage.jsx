import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getAllNotificationsByPerson, getAllNotificationsByTeam } from '../services/notificationApi'
import { getMessages } from '../services/messageBoardApi'
import { parseMessageTimestamp } from '../utils/notificationFormat'
import MessageText from '../components/MessageText'
import MessageLinks from '../components/MessageLinks'

export default function UserMessagesPage({ user, userTeamId = null }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') === 'announcements' || searchParams.get('tab') === 'hirek' ? 'announcements' : 'notifications'
  const [activeTab, setActiveTab] = useState(initialTab) // 'notifications' | 'announcements'
  const [notifications, setNotifications] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'announcements' || tabParam === 'hirek') {
      setActiveTab('announcements')
    } else if (tabParam === 'notifications' || tabParam === 'ertesitesek') {
      setActiveTab('notifications')
    }
  }, [searchParams])

  const handleTabSelect = (tab) => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

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
          // ignore
        }
      }

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
    loadData()
  }, [loadData])

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

  if (!user) {
    return (
      <div className="container py-5 text-center">
        <div className="alert alert-warning max-w-md mx-auto">
          <i className="bi bi-person-lock fs-3 d-block mb-2" />
          <h2 className="h5">Jelentkezz be!</h2>
          <p className="mb-0">Az értesítések és üzenetek megtekintéséhez kérjük, jelentkezz be Google fiókoddal.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h1 className="h3 mb-1 d-flex align-items-center gap-2">
            <i className="bi bi-bell-fill text-primary" />
            <span>Értesítések és üzenetek</span>
          </h1>
          <p className="text-muted mb-0">Nézd meg a személyesen neked küldött értesítéseket és az aktuális versenyhíreket.</p>
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

      {error && <div className="alert alert-danger mb-4">{error}</div>}

      <div className="card shadow-sm team-card no-hover-card mb-4">
        <div className="card-body p-4">
          {/* Fülválasztó */}
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4 pb-3 border-bottom">
            <div className="btn-group" role="group" aria-label="Üzenet típusok">
              <button
                type="button"
                className={`btn ${activeTab === 'notifications' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => handleTabSelect('notifications')}
              >
                <i className="bi bi-bell me-2" />
                Személyes értesítések
                <span className="badge text-bg-light ms-2">{notifications.length}</span>
              </button>
              <button
                type="button"
                className={`btn ${activeTab === 'announcements' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => handleTabSelect('announcements')}
              >
                <i className="bi bi-newspaper me-2" />
                Hírek és közlemények
                <span className="badge text-bg-light ms-2">{announcements.length}</span>
              </button>
            </div>
          </div>

          {/* Kereső */}
          <div className="mb-4">
            <input
              type="search"
              className="form-control"
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
                        >
                          <i className="bi bi-newspaper me-1" />
                          Hír olvasása
                        </Link>
                        <Link
                          to="/hirek"
                          className="btn btn-link btn-sm text-decoration-none p-0 text-secondary"
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
      </div>
    </div>
  )
}
