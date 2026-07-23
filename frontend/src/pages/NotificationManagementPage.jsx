import React, { useEffect, useMemo, useState } from 'react'
import ConfirmModal from '../components/ConfirmModal'
import FloatingFeedback from '../components/FloatingFeedback'
import { getNotificationTeams, sendNotificationToTeam } from '../services/notificationApi'

export default function NotificationManagementPage() {
  const [teams, setTeams] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [search, setSearch] = useState('')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        setTeams(await getNotificationTeams())
      } catch (error) {
        setFeedback({ type: 'danger', text: error.message })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filteredTeams = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('hu-HU')
    if (!term) return teams
    return teams.filter((team) =>
      [team.teamName, team.schoolName, team.teamMember1Email, team.teamMember2Email]
        .some((value) => String(value || '').toLocaleLowerCase('hu-HU').includes(term)))
  }, [search, teams])

  const selectedTeams = teams.filter((team) => selectedIds.includes(team.id))
  const allFilteredSelected = filteredTeams.length > 0 && filteredTeams.every((team) => selectedIds.includes(team.id))

  const toggleTeam = (teamId) => {
    setSelectedIds((current) =>
      current.includes(teamId) ? current.filter((id) => id !== teamId) : [...current, teamId])
  }

  const toggleFiltered = () => {
    const filteredIds = filteredTeams.map((team) => team.id)
    setSelectedIds((current) => allFilteredSelected
      ? current.filter((id) => !filteredIds.includes(id))
      : [...new Set([...current, ...filteredIds])])
  }

  const requestSend = () => {
    if (selectedIds.length === 0) {
      setFeedback({ type: 'danger', text: 'Válassz ki legalább egy csapatot.' })
      return
    }
    if (!title.trim()) {
      setFeedback({ type: 'danger', text: 'Írd be az értesítés címét.' })
      return
    }
    if (!message.trim()) {
      setFeedback({ type: 'danger', text: 'Írd be az értesítés tartalmát.' })
      return
    }
    setConfirmOpen(true)
  }

  const send = async () => {
    try {
      setSending(true)
      const failures = []
      for (const team of selectedTeams) {
        try {
          await sendNotificationToTeam(team.id, { title: title.trim(), message: message.trim() })
        } catch (error) {
          failures.push(`${team.teamName || `#${team.id}`}: ${error.message}`)
        }
      }
      setConfirmOpen(false)
      if (failures.length > 0) {
        setFeedback({
          type: 'danger',
          text: `${selectedTeams.length - failures.length} értesítés elküldve, ${failures.length} sikertelen. ${failures.join(' | ')}`
        })
      } else {
        setFeedback({ type: 'success', text: `Az értesítés ${selectedTeams.length} csapatnak sikeresen elküldve.` })
        setTitle('')
        setMessage('')
        setSelectedIds([])
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="container py-4">
      <h2 className="mb-1">Értesítések küldése</h2>
      <p className="text-muted mb-4">Küldj közvetlen értesítést egy vagy több csapatnak.</p>
      <FloatingFeedback message={feedback} onClose={() => setFeedback(null)} />

      <section className="card shadow-sm team-card no-hover-card mb-4">
        <div className="card-body p-4">
          <label className="form-label fw-semibold" htmlFor="notification-title">Értesítés címe</label>
          <input
            id="notification-title"
            className="form-control mb-3"
            maxLength="100"
            placeholder="pl. Következő forduló"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <label className="form-label fw-semibold" htmlFor="notification-message">Értesítés tartalma</label>
          <textarea
            id="notification-message"
            className="form-control"
            rows="4"
            maxLength="500"
            placeholder="Írd ide a csapatnak küldendő értesítést…"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
          <div className="d-flex justify-content-between mt-2">
            <span className="form-text">A kijelölt csapatok ugyanazt az értesítést kapják meg.</span>
            <span className="form-text">{message.length}/500</span>
          </div>
        </div>
      </section>

      <section className="card shadow-sm team-card no-hover-card">
        <div className="card-body p-4">
          <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-3">
            <div className="flex-grow-1">
              <label className="form-label fw-semibold" htmlFor="notification-team-search">Csapatok keresése</label>
              <input id="notification-team-search" type="search" className="form-control" placeholder="Csapat, iskola vagy e-mail…" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <button type="button" className="btn btn-outline-primary" disabled={filteredTeams.length === 0} onClick={toggleFiltered}>
              {allFilteredSelected ? 'Láthatók kijelölésének törlése' : 'Összes látható kijelölése'}
            </button>
          </div>

          <div className="mb-3 fw-semibold">{selectedIds.length} csapat kijelölve</div>
          {loading ? <div className="alert alert-info mb-0">Csapatok betöltése…</div> : (
            <div className="notification-team-grid">
              {filteredTeams.map((team) => (
                <label className={`notification-team-option ${selectedIds.includes(team.id) ? 'selected' : ''}`} key={team.id}>
                  <input type="checkbox" checked={selectedIds.includes(team.id)} onChange={() => toggleTeam(team.id)} />
                  <span>
                    <strong>{team.teamName || `Csapat #${team.id}`}</strong>
                    <small>{team.schoolName || 'Nincs megadott iskola'}</small>
                  </span>
                </label>
              ))}
              {filteredTeams.length === 0 && <div className="alert alert-secondary mb-0">Nincs a keresésnek megfelelő csapat.</div>}
            </div>
          )}

          <div className="text-end mt-4">
            <button type="button" className="btn btn-primary" disabled={sending || loading} onClick={requestSend}>
              Értesítés küldése
            </button>
          </div>
        </div>
      </section>

      <ConfirmModal
        open={confirmOpen}
        title="Értesítés elküldése"
        confirmLabel="Küldés"
        busy={sending}
        onClose={() => setConfirmOpen(false)}
        onConfirm={send}
      >
        <p>Biztosan elküldöd ezt az értesítést <strong>{selectedTeams.length} csapatnak</strong>?</p>
        <div className="border rounded p-3 bg-light">
          <strong className="d-block mb-2">{title}</strong>
          <span>{message}</span>
        </div>
      </ConfirmModal>
    </div>
  )
}
