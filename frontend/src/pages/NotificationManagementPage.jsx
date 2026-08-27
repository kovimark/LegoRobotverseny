import React, { useEffect, useMemo, useState } from 'react'
import ConfirmModal from '../components/ConfirmModal'
import FloatingFeedback from '../components/FloatingFeedback'
import { getNotificationTeams, getNotificationPrivileges, getAllNotifications, sendNotificationToTeam, sendNotificationToEmail } from '../services/notificationApi'
import { getPrivilegeLabel } from '../config/privilegeConfig'
import AgeGroupBadge from '../components/AgeGroupBadge'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const contactKey = (contact) => String(contact.email || '').trim().toLowerCase()

const contactsFromTeamsAndPrivileges = (teams = [], privileges = []) => {
  const contacts = new Map()
  const teamById = new Map(teams.map((team) => [team.id, team]))

  // 1. Process teams and their members
  teams.forEach((team) => {
    const teamName = team.teamName || `Csapat #${team.id}`

    if (Array.isArray(team.members)) {
      let contestantIndex = 1
      team.members.forEach((member) => {
        const email = String(member.email || '').trim().toLowerCase()
        if (emailPattern.test(email)) {
          const isCoach = Number(member.isCoach) === 1
          const role = isCoach ? 'Felkészítő' : `${contestantIndex++}. versenyző`
          contacts.set(email, {
            email,
            teamName,
            teamId: team.id,
            privilegeId: member.id || member.privilegeId || null,
            name: member.name || '',
            role,
            category: team.category
          })
        }
      })
    }

    ;[
      [team.teamMember1Email, team.teamMember1Name, '1. versenyző'],
      [team.teamMember2Email, team.teamMember2Name, '2. versenyző'],
      [team.teamCoach1Email, team.teamCoach1 || team.teamCoach1Name, 'Felkészítő'],
      [team.coachEmail, team.coachName, 'Felkészítő']
    ].forEach(([email, name, role]) => {
      if (emailPattern.test(String(email || '').trim())) {
        const cleanEmail = String(email).trim().toLowerCase()
        if (!contacts.has(cleanEmail)) {
          contacts.set(cleanEmail, {
            email: cleanEmail,
            teamName,
            teamId: team.id,
            privilegeId: null,
            name: name || '',
            role,
            category: team.category
          })
        }
      }
    })
  })

  // 2. Process all registered users from Privilege table
  privileges.forEach((item) => {
    const email = String(item.emailAddress || item.email || '').trim().toLowerCase()
    if (!email || !emailPattern.test(email)) return

    const team = item.teamId ? teamById.get(item.teamId) : null
    const teamName = team?.teamName || (item.teamId ? `Csapat #${item.teamId}` : '')
    const teamId = item.teamId || team?.id || null
    const category = team ? team.category : null

    let role = 'Regisztrált felhasználó'
    const priv = Number(item.privilege1)
    if (priv === 1) {
      role = 'Adminisztrátor'
    } else if (priv >= 2) {
      role = getPrivilegeLabel(priv)
    } else if (Number(item.isCoach) === 1) {
      role = 'Felkészítő'
    } else if (teamId) {
      role = 'Versenyző'
    }

    if (contacts.has(email)) {
      const existing = contacts.get(email)
      existing.privilegeId = item.id
      if (priv >= 1) {
        existing.role = `${existing.role} (${role})`
      }
      if (!existing.name && item.name) {
        existing.name = item.name
      }
    } else {
      contacts.set(email, {
        email,
        teamName,
        teamId,
        privilegeId: item.id,
        name: item.name || '',
        role,
        category
      })
    }
  })

  return Array.from(contacts.values()).sort((a, b) => a.email.localeCompare(b.email, 'hu'))
}

export default function NotificationManagementPage() {
  const [recipientMode, setRecipientMode] = useState('teams') // 'teams' | 'emails'
  const [teams, setTeams] = useState([])
  const [, setPrivileges] = useState([])
  const [contacts, setContacts] = useState([])
  const [selectedTeamIds, setSelectedTeamIds] = useState([])
  const [selectedContactKeys, setSelectedContactKeys] = useState([])
  const [manualTargets, setManualTargets] = useState([])
  const [manualEmail, setManualEmail] = useState('')
  const [manualName, setManualName] = useState('')
  const [search, setSearch] = useState('')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [feedback, setFeedback] = useState(null)

  // Sent notifications state
  const [sentNotifications, setSentNotifications] = useState([])
  const [loadingSent, setLoadingSent] = useState(false)
  const [sentSearch, setSentSearch] = useState('')

  const refreshSentNotifications = async () => {
    try {
      setLoadingSent(true)
      const data = await getAllNotifications()
      setSentNotifications(Array.isArray(data) ? data : [])
    } catch (err) {
      console.warn('Nem sikerült betölteni az elküldött értesítéseket:', err)
    } finally {
      setLoadingSent(false)
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const [loadedTeams, loadedPrivileges, loadedSent] = await Promise.all([
          getNotificationTeams(),
          getNotificationPrivileges(),
          getAllNotifications()
        ])
        const validTeams = loadedTeams.filter((team) => team && typeof team === 'object' && team.id !== null && team.id !== undefined)
        setTeams(validTeams)
        setPrivileges(Array.isArray(loadedPrivileges) ? loadedPrivileges : [])
        setContacts(contactsFromTeamsAndPrivileges(validTeams, loadedPrivileges))
        setSentNotifications(Array.isArray(loadedSent) ? loadedSent : [])
      } catch (error) {
        setFeedback({ type: 'danger', text: error.message })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Filtered lists based on search
  const filteredTeams = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('hu-HU')
    if (!term) return teams
    return teams.filter((team) => {
      const memberValues = Array.isArray(team.members)
        ? team.members.flatMap((m) => [m.name, m.email])
        : []
      return [
        team.teamName,
        team.schoolName,
        team.teamMember1Email,
        team.teamMember2Email,
        team.teamCoach1Email,
        ...memberValues
      ].some((value) => String(value || '').toLocaleLowerCase('hu-HU').includes(term))
    })
  }, [search, teams])

  const filteredContacts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('hu-HU')
    if (!term) return contacts
    return contacts.filter((contact) =>
      [contact.email, contact.teamName, contact.name, contact.role]
        .some((value) => String(value || '').toLocaleLowerCase('hu-HU').includes(term)))
  }, [contacts, search])

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams])

  const filteredSentNotifications = useMemo(() => {
    const term = sentSearch.trim().toLocaleLowerCase('hu-HU')
    if (!term) return sentNotifications
    return sentNotifications.filter((n) => {
      const p = n.privilege || {}
      const teamName = p.teamId ? (teamById.get(p.teamId)?.teamName || `Csapat #${p.teamId}`) : 'Egyéni címzett'
      const roleName = getPrivilegeLabel(p.privilege1)
      return [
        n.title,
        n.text,
        n.message,
        p.name,
        p.emailAddress,
        teamName,
        roleName
      ].some((val) => String(val || '').toLocaleLowerCase('hu-HU').includes(term))
    })
  }, [sentNotifications, sentSearch, teamById])

  // Team mode selections
  const selectedTeams = useMemo(() => teams.filter((team) => selectedTeamIds.includes(team.id)), [teams, selectedTeamIds])
  const allFilteredTeamsSelected = filteredTeams.length > 0 && filteredTeams.every((team) => selectedTeamIds.includes(team.id))

  const toggleTeam = (teamId) => {
    setSelectedTeamIds((current) =>
      current.includes(teamId) ? current.filter((id) => id !== teamId) : [...current, teamId])
  }

  const toggleFilteredTeams = () => {
    const filteredIds = filteredTeams.map((team) => team.id)
    setSelectedTeamIds((current) => allFilteredTeamsSelected
      ? current.filter((id) => !filteredIds.includes(id))
      : [...new Set([...current, ...filteredIds])])
  }

  // Email mode selections
  const selectedContacts = useMemo(() => contacts.filter((contact) => selectedContactKeys.includes(contactKey(contact))), [contacts, selectedContactKeys])
  const allFilteredContactsSelected = filteredContacts.length > 0 && filteredContacts.every((contact) => selectedContactKeys.includes(contactKey(contact)))

  const allEmailTargets = useMemo(() => {
    const combined = [
      ...selectedContacts.map((c) => ({ email: c.email, name: c.name, teamName: c.teamName, teamId: c.teamId })),
      ...manualTargets.map((m) => ({ email: m.email, name: m.name, teamName: m.teamName || 'Egyedi címzett', teamId: null }))
    ]
    return Array.from(new Map(combined.map((item) => [item.email.toLowerCase(), item])).values())
  }, [selectedContacts, manualTargets])

  const toggleContact = (contact) => {
    const key = contactKey(contact)
    setSelectedContactKeys((current) =>
      current.includes(key) ? current.filter((id) => id !== key) : [...current, key])
  }

  const toggleFilteredContacts = () => {
    const keys = filteredContacts.map(contactKey)
    setSelectedContactKeys((current) => allFilteredContactsSelected
      ? current.filter((key) => !keys.includes(key))
      : [...new Set([...current, ...keys])])
  }

  const addManualTarget = () => {
    const email = manualEmail.trim().toLowerCase()
    const name = manualName.trim()
    if (!emailPattern.test(email)) {
      setFeedback({ type: 'danger', text: 'Kérjük, adj meg egy érvényes e-mail-címet.' })
      return
    }
    if (manualTargets.some((target) => target.email === email)) {
      setFeedback({ type: 'danger', text: 'Ez az e-mail-cím már hozzá lett adva az egyedi listához.' })
      return
    }
    setManualTargets((current) => [...current, { email, name, teamName: name || 'Egyedi címzett' }])
    setManualEmail('')
    setManualName('')
  }

  const removeManualTarget = (emailToRemove) => {
    setManualTargets((current) => current.filter((target) => target.email !== emailToRemove))
  }

  // Request send validation
  const requestSend = () => {
    if (recipientMode === 'teams' && selectedTeamIds.length === 0) {
      setFeedback({ type: 'danger', text: 'Válassz ki legalább egy csapatot.' })
      return
    }
    if (recipientMode === 'emails' && allEmailTargets.length === 0) {
      setFeedback({ type: 'danger', text: 'Válassz ki vagy adj hozzá legalább egy e-mail-címet.' })
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
      const notificationPayload = { title: title.trim(), message: message.trim() }

      if (recipientMode === 'teams') {
        for (const team of selectedTeams) {
          try {
            await sendNotificationToTeam(team.id, notificationPayload)
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
          setSelectedTeamIds([])
        }
      } else {
        // Email mode
        for (const target of allEmailTargets) {
          try {
            await sendNotificationToEmail(target.email, notificationPayload, target.teamId)
          } catch (error) {
            failures.push(`${target.name || target.email}: ${error.message}`)
          }
        }
        setConfirmOpen(false)
        if (failures.length > 0) {
          setFeedback({
            type: 'danger',
            text: `${allEmailTargets.length - failures.length} értesítés elküldve, ${failures.length} sikertelen. ${failures.join(' | ')}`
          })
        } else {
          setFeedback({ type: 'success', text: `Az értesítés ${allEmailTargets.length} címzettnek sikeresen elküldve.` })
          setTitle('')
          setMessage('')
          setSelectedContactKeys([])
          setManualTargets([])
        }
      }
      await refreshSentNotifications()
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="container py-4">
      <h2 className="mb-1">Értesítések küldése</h2>
      <p className="text-muted mb-4">Küldj közvetlen push értesítést csapatonként vagy egyéni e-mail-címek szerint.</p>
      <FloatingFeedback message={feedback} onClose={() => setFeedback(null)} />

      {/* Értesítés tartalma */}
      <section className="card shadow-sm team-card no-hover-card mb-4">
        <div className="card-body p-4">
          <label className="form-label fw-semibold" htmlFor="notification-title">Értesítés címe</label>
          <input
            id="notification-title"
            className="form-control mb-3"
            maxLength="100"
            placeholder="pl. Következő forduló vagy fontos tájékoztatás"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <label className="form-label fw-semibold" htmlFor="notification-message">Értesítés tartalma</label>
          <textarea
            id="notification-message"
            className="form-control"
            rows="4"
            maxLength="500"
            placeholder="Írd ide az értesítés szövegét…"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
          <div className="d-flex justify-content-between mt-2">
            <span className="form-text">A kiválasztott címzettek ezt az értesítést fogják megkapni a böngészőjükben.</span>
            <span className="form-text">{message.length}/500</span>
          </div>
        </div>
      </section>

      {/* Címzettek kiválasztása mód */}
      <section className="card shadow-sm team-card no-hover-card">
        <div className="card-body p-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4 pb-3 border-bottom">
            <div>
              <h3 className="h5 mb-1">Címzettek kiválasztása</h3>
              <p className="text-muted small mb-0">Válaszd ki, hogy csapatok vagy egyéni e-mail-címek szerint szeretnél értesítést küldeni.</p>
            </div>
            <div className="btn-group" role="group" aria-label="Címzés módja">
              <button
                type="button"
                className={`btn ${recipientMode === 'teams' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => { setRecipientMode('teams'); setSearch('') }}
              >
                <i className="bi bi-people-fill me-2" />
                Csapatok szerint ({selectedTeamIds.length})
              </button>
              <button
                type="button"
                className={`btn ${recipientMode === 'emails' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => { setRecipientMode('emails'); setSearch('') }}
              >
                <i className="bi bi-envelope-fill me-2" />
                E-mail-címek szerint ({allEmailTargets.length})
              </button>
            </div>
          </div>

          {/* E-MAIL MÓD: Egyedi címzett hozzáadása */}
          {recipientMode === 'emails' && (
            <div className="card bg-light border-0 p-3 mb-4 rounded-3">
              <h4 className="h6 fw-bold mb-2">
                <i className="bi bi-person-plus-fill text-primary me-2" />
                Egyedi e-mail-cím hozzáadása
              </h4>
              <div className="row g-2 align-items-end">
                <div className="col-md-5">
                  <label className="form-label small" htmlFor="manual-notif-email">E-mail-cím</label>
                  <input
                    id="manual-notif-email"
                    type="email"
                    className="form-control form-control-sm"
                    placeholder="pelda@iskola.hu"
                    value={manualEmail}
                    onChange={(event) => setManualEmail(event.target.value)}
                  />
                </div>
                <div className="col-md-5">
                  <label className="form-label small" htmlFor="manual-notif-name">Név / Megjegyzés (opcionális)</label>
                  <input
                    id="manual-notif-name"
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="pl. Versenybíró vagy Felkészítő"
                    value={manualName}
                    onChange={(event) => setManualName(event.target.value)}
                  />
                </div>
                <div className="col-md-2">
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm w-100"
                    onClick={addManualTarget}
                  >
                    <i className="bi bi-plus-lg me-1" />
                    Hozzáadás
                  </button>
                </div>
              </div>

              {manualTargets.length > 0 && (
                <div className="d-flex flex-wrap gap-2 mt-3 pt-2 border-top">
                  {manualTargets.map((target) => (
                    <span className="badge text-bg-light border text-dark p-2 d-flex align-items-center" key={target.email}>
                      <i className="bi bi-envelope me-1 text-muted" />
                      <strong>{target.email}</strong>
                      {target.name && <span className="ms-1 text-muted">({target.name})</span>}
                      <button
                        type="button"
                        className="btn-close ms-2"
                        aria-label={`${target.email} eltávolítása`}
                        onClick={() => removeManualTarget(target.email)}
                      />
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Keresőmező és tömeges kijelölés */}
          <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-3">
            <div className="flex-grow-1">
              <label className="form-label fw-semibold" htmlFor="notification-search">
                {recipientMode === 'teams' ? 'Csapatok keresése' : 'Regisztrált e-mail-címek keresése'}
              </label>
              <input
                id="notification-search"
                type="search"
                className="form-control"
                placeholder={recipientMode === 'teams' ? 'Csapat, iskola vagy e-mail…' : 'Név, csapat, e-mail vagy szerepkör…'}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn btn-outline-primary"
              disabled={loading || (recipientMode === 'teams' ? filteredTeams.length === 0 : filteredContacts.length === 0)}
              onClick={recipientMode === 'teams' ? toggleFilteredTeams : toggleFilteredContacts}
            >
              {(recipientMode === 'teams' ? allFilteredTeamsSelected : allFilteredContactsSelected)
                ? 'Láthatók kijelölésének törlése'
                : 'Összes látható kijelölése'}
            </button>
          </div>

          {/* Kijelölt elemek számlálója */}
          <div className="mb-3 fw-semibold">
            {recipientMode === 'teams'
              ? `${selectedTeamIds.length} csapat kijelölve`
              : `${allEmailTargets.length} e-mail-cím kijelölve`}
          </div>

          {/* Lista megjelenítése */}
          {loading ? (
            <div className="alert alert-info mb-0">Betöltés…</div>
          ) : recipientMode === 'teams' ? (
            <div className="notification-team-grid">
              {filteredTeams.map((team) => (
                <label className={`notification-team-option ${selectedTeamIds.includes(team.id) ? 'selected' : ''}`} key={team.id}>
                  <input type="checkbox" checked={selectedTeamIds.includes(team.id)} onChange={() => toggleTeam(team.id)} />
                  <span>
                    <strong><AgeGroupBadge category={team.category} className="me-2" />{team.teamName || `Csapat #${team.id}`}</strong>
                    <small>{team.schoolName || 'Nincs megadott iskola'}</small>
                  </span>
                </label>
              ))}
              {filteredTeams.length === 0 && <div className="alert alert-secondary mb-0">Nincs a keresésnek megfelelő csapat.</div>}
            </div>
          ) : (
            <div className="notification-team-grid">
              {filteredContacts.map((contact) => {
                const key = contactKey(contact)
                const isSelected = selectedContactKeys.includes(key)
                return (
                  <label className={`notification-team-option ${isSelected ? 'selected' : ''}`} key={key}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleContact(contact)} />
                    <span>
                      <strong>
                        {contact.category !== null && contact.category !== undefined && (
                          <AgeGroupBadge category={contact.category} className="me-2" />
                        )}
                        {contact.name || contact.email}
                      </strong>
                      <small>
                        <span className="text-primary fw-semibold">{contact.email}</span>
                        {' · '}
                        {contact.teamName ? contact.teamName : <span className="text-muted">Egyéni (nincs csapatban)</span>}
                        {' · '}
                        <span className="badge text-bg-light border text-dark ms-1">{contact.role}</span>
                      </small>
                    </span>
                  </label>
                )
              })}
              {filteredContacts.length === 0 && <div className="alert alert-secondary mb-0">Nincs a keresésnek megfelelő e-mail-cím.</div>}
            </div>
          )}

          <div className="text-end mt-4">
            <button type="button" className="btn btn-primary btn-lg" disabled={sending || loading} onClick={requestSend}>
              <i className="bi bi-send-fill me-2" />
              Értesítés küldése
            </button>
          </div>
        </div>
      </section>

      {/* Elküldött értesítések listája */}
      <section className="card shadow-sm team-card no-hover-card mt-4">
        <div className="card-body p-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3 pb-3 border-bottom">
            <div>
              <h2 className="h5 mb-1 d-flex align-items-center gap-2">
                <i className="bi bi-clock-history text-primary" />
                <span>Elküldött értesítések előzményei</span>
                <span className="badge text-bg-secondary">{sentNotifications.length}</span>
              </h2>
              <p className="text-muted small mb-0">Az eddig kiküldött összes értesítés és a hozzájuk tartozó címzettek listája.</p>
            </div>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={loadingSent}
              onClick={refreshSentNotifications}
            >
              <i className={`bi bi-arrow-clockwise me-1 ${loadingSent ? 'spin-animation' : ''}`} />
              Frissítés
            </button>
          </div>

          <div className="mb-3">
            <input
              type="search"
              className="form-control"
              placeholder="Keresés az elküldött értesítésekben (cím, tartalom, címzett, csapat, szerepkör)…"
              value={sentSearch}
              onChange={(e) => setSentSearch(e.target.value)}
            />
          </div>

          {loadingSent ? (
            <div className="alert alert-info mb-0">Értesítések betöltése…</div>
          ) : filteredSentNotifications.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '4rem' }}>#</th>
                    <th>Értesítés címe és tartalma</th>
                    <th>Címzett</th>
                    <th>Csapat / Szerepkör</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSentNotifications.map((item, idx) => {
                    const priv = item.privilege || {}
                    const teamName = priv.teamId ? (teamById.get(priv.teamId)?.teamName || `Csapat #${priv.teamId}`) : 'Egyéni címzett'
                    const roleName = getPrivilegeLabel(priv.privilege1)

                    return (
                      <tr key={item.id || idx}>
                        <td>
                          <span className="text-muted fw-bold">#{item.id || idx + 1}</span>
                        </td>
                        <td>
                          <strong className="d-block text-primary">{item.title || 'Nincs cím'}</strong>
                          <span className="text-muted small" style={{ whiteSpace: 'pre-wrap' }}>
                            {item.text || item.message}
                          </span>
                        </td>
                        <td>
                          <strong className="d-block">{priv.name || priv.emailAddress || 'Ismeretlen'}</strong>
                          <span className="small text-muted">{priv.emailAddress}</span>
                        </td>
                        <td>
                          <span className="badge text-bg-light border text-dark me-1">{teamName}</span>
                          <span className="badge text-bg-secondary">{roleName}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="alert alert-secondary mb-0">
              {sentSearch ? 'Nincs a keresésnek megfelelő elküldött értesítés.' : 'Még nem lett értesítés elküldve.'}
            </div>
          )}
        </div>
      </section>

      {/* Megerősítő ablak */}
      <ConfirmModal
        open={confirmOpen}
        title="Értesítés elküldése"
        confirmLabel="Küldés megerősítése"
        busy={sending}
        onClose={() => setConfirmOpen(false)}
        onConfirm={send}
      >
        <p>
          Biztosan elküldöd ezt az értesítést{' '}
          <strong>
            {recipientMode === 'teams'
              ? `${selectedTeams.length} csapatnak`
              : `${allEmailTargets.length} e-mail-címre`}
          </strong>?
        </p>
        <div className="border rounded p-3 bg-light">
          <strong className="d-block mb-2 text-primary">{title}</strong>
          <span className="text-break">{message}</span>
        </div>
      </ConfirmModal>
    </div>
  )
}
