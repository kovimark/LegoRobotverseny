import React, { useEffect, useMemo, useState } from 'react'
import ConfirmModal from '../components/ConfirmModal'
import FloatingFeedback from '../components/FloatingFeedback'
import { getNotificationTeams, getNotificationPrivileges, getAllNotifications, sendNotificationToEmail, sendNotificationToPerson } from '../services/notificationApi'
import { attachTimestampToMessage, parseMessageTimestamp } from '../utils/notificationFormat'
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
  const [teams, setTeams] = useState([])
  const [privileges, setPrivileges] = useState([])
  const [contacts, setContacts] = useState([])
  const [selectedContactKeys, setSelectedContactKeys] = useState([])
  const [manualTargets, setManualTargets] = useState([])
  const [manualEmail, setManualEmail] = useState('')
  const [manualName, setManualName] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all') // 'all' | 'contestant' | 'coach' | 'admin' | 'judge' | 'individual'
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

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams])
  const privilegeById = useMemo(() => new Map(privileges.map((p) => [p.id, p])), [privileges])

  // Filtered contacts based on search and roleFilter
  const filteredContacts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('hu-HU')
    return contacts.filter((contact) => {
      // 1. Text search
      const matchesSearch = !term || [contact.email, contact.teamName, contact.name, contact.role]
        .some((value) => String(value || '').toLocaleLowerCase('hu-HU').includes(term))
      if (!matchesSearch) return false

      // 2. Role filter
      if (roleFilter === 'contestant') return contact.role.includes('versenyző') || contact.role.includes('Versenyző')
      if (roleFilter === 'coach') return contact.role.includes('Felkészítő')
      if (roleFilter === 'admin') return contact.role.includes('Admin')
      if (roleFilter === 'judge') return contact.role.includes('Bíró')
      if (roleFilter === 'individual') return !contact.teamId

      return true
    })
  }, [contacts, search, roleFilter])

  const filteredSentNotifications = useMemo(() => {
    const term = sentSearch.trim().toLocaleLowerCase('hu-HU')
    if (!term) return sentNotifications
    return sentNotifications.filter((n) => {
      const priv = n.privilege || privilegeById.get(n.privilegeId) || {}
      const teamName = priv.teamId ? (teamById.get(priv.teamId)?.teamName || `Csapat #${priv.teamId}`) : 'Egyéni címzett'
      const roleName = getPrivilegeLabel(priv.privilege1) || (priv.isCoach ? 'Felkészítő' : 'Versenyző')
      return [
        n.title,
        n.text,
        n.message,
        priv.name,
        priv.emailAddress,
        teamName,
        roleName
      ].some((val) => String(val || '').toLocaleLowerCase('hu-HU').includes(term))
    })
  }, [sentNotifications, sentSearch, privilegeById, teamById])

  // Selection helpers
  const selectedContacts = useMemo(() => contacts.filter((contact) => selectedContactKeys.includes(contactKey(contact))), [contacts, selectedContactKeys])
  const allFilteredContactsSelected = filteredContacts.length > 0 && filteredContacts.every((contact) => selectedContactKeys.includes(contactKey(contact)))

  const allEmailTargets = useMemo(() => {
    const combined = [
      ...selectedContacts.map((c) => ({
        email: c.email,
        name: c.name,
        teamName: c.teamName,
        teamId: c.teamId,
        privilegeId: c.privilegeId
      })),
      ...manualTargets.map((m) => {
        const matchedPriv = privileges.find((p) => String(p.emailAddress || p.email || '').trim().toLowerCase() === m.email.toLowerCase())
        return {
          email: m.email,
          name: m.name,
          teamName: m.teamName || 'Egyedi címzett',
          teamId: matchedPriv?.teamId || null,
          privilegeId: matchedPriv?.id || null
        }
      })
    ]
    return Array.from(new Map(combined.map((item) => [item.email.toLowerCase(), item])).values())
  }, [selectedContacts, manualTargets, privileges])

  const toggleContact = (contact) => {
    const key = contactKey(contact)
    setSelectedContactKeys((current) =>
      current.includes(key) ? current.filter((id) => id !== key) : [...current, key])
  }

  const toggleFilteredContacts = () => {
    const keys = filteredContacts.map(contactKey)
    setSelectedContactKeys((current) => allFilteredContactsSelected
      ? current.filter((id) => !keys.includes(id))
      : [...new Set([...current, ...keys])])
  }

  const selectTeamMembers = (teamId) => {
    if (!teamId) return
    const teamMembers = contacts.filter((c) => String(c.teamId) === String(teamId))
    const teamKeys = teamMembers.map(contactKey)
    setSelectedContactKeys((current) => [...new Set([...current, ...teamKeys])])
    setFeedback({
      type: 'success',
      text: `${teamMembers.length} csapattag hozzáadva a kiválasztottakhoz.`
    })
  }

  const addManualTarget = () => {
    const cleanEmail = manualEmail.trim().toLowerCase()
    if (!cleanEmail || !emailPattern.test(cleanEmail)) {
      setFeedback({ type: 'danger', text: 'Adj meg egy érvényes e-mail-címet.' })
      return
    }
    if (manualTargets.some((item) => item.email.toLowerCase() === cleanEmail)) {
      setFeedback({ type: 'warning', text: 'Ez az e-mail-cím már szerepel a kézi címzettek között.' })
      return
    }
    setManualTargets((current) => [...current, { email: cleanEmail, name: manualName.trim(), teamName: 'Kézi címzett' }])
    setManualEmail('')
    setManualName('')
    setFeedback({ type: 'success', text: `A(z) ${cleanEmail} cím hozzáadva a címzettekhez.` })
  }

  const removeManualTarget = (email) => {
    setManualTargets((current) => current.filter((item) => item.email.toLowerCase() !== email.toLowerCase()))
  }

  const openConfirm = () => {
    if (allEmailTargets.length === 0) {
      setFeedback({ type: 'danger', text: 'Válassz ki legalább egy címzett e-mail-címet.' })
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
      const formattedMessage = attachTimestampToMessage(message.trim())
      const notificationPayload = { title: title.trim(), message: formattedMessage }
      const successfulRecipients = []
      const failedRecipients = []

      // Targets mapped from all selected emails
      const targets = allEmailTargets.map((t) => ({
        privilegeId: t.privilegeId || privileges.find((p) => String(p.emailAddress || p.email || '').trim().toLowerCase() === String(t.email || '').trim().toLowerCase())?.id || null,
        email: t.email,
        name: t.name || t.email,
        teamName: t.teamName || 'Egyéni címzett',
        teamId: t.teamId
      }))

      // Deduplicate targets
      const uniqueTargets = []
      const seen = new Set()
      targets.forEach((t) => {
        const key = t.privilegeId ? `id:${t.privilegeId}` : `email:${String(t.email || '').toLowerCase()}`
        if (!seen.has(key)) {
          seen.add(key)
          uniqueTargets.push(t)
        }
      })

      // Send to each person individually (strictly once per recipient)
      const sentPrivilegeIds = new Set()

      for (const target of uniqueTargets) {
        if (target.privilegeId && sentPrivilegeIds.has(target.privilegeId)) {
          continue
        }

        try {
          if (target.privilegeId) {
            await sendNotificationToPerson(target.privilegeId, notificationPayload)
            sentPrivilegeIds.add(target.privilegeId)
            successfulRecipients.push(target.name || target.email)
          } else {
            await sendNotificationToEmail(target.email, notificationPayload)
            successfulRecipients.push(target.name || target.email)
          }
        } catch (error) {
          const errMsg = error.message.includes('Nincs feliratkozott eszköz')
            ? 'Nincs feliratkozott eszköz (még nem kapcsolta be az értesítéseket a profiljában)'
            : error.message
          failedRecipients.push(`${target.name || target.email} (${target.teamName}): ${errMsg}`)
        }
      }

      setConfirmOpen(false)

      if (successfulRecipients.length > 0 && failedRecipients.length === 0) {
        setFeedback({
          type: 'success',
          text: `Az értesítés sikeresen elküldve mind a(z) ${successfulRecipients.length} címzettnek.`
        })
        setTitle('')
        setMessage('')
        setSelectedContactKeys([])
        setManualTargets([])
      } else if (successfulRecipients.length > 0 && failedRecipients.length > 0) {
        setFeedback({
          type: 'warning',
          text: `${successfulRecipients.length} értesítés sikeresen kiküldve. ${failedRecipients.length} nem érhető el: ${failedRecipients.join(' | ')}`
        })
        setTitle('')
        setMessage('')
      } else {
        setFeedback({
          type: 'danger',
          text: `Nem sikerült elküldeni az értesítéseket (${failedRecipients.length} sikertelen): ${failedRecipients.join(' | ')}`
        })
      }

      await refreshSentNotifications()
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="container py-4">
      <FloatingFeedback message={feedback} onClose={() => setFeedback(null)} />

      {/* Fejléc */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <span className="home-kicker">Adminisztráció</span>
          <h1 className="h2 mb-1">Értesítések küldése</h1>
          <p className="text-muted mb-0">
            Közvetlen push értesítések küldése a regisztrált felhasználóknak és csapatoknak.
          </p>
        </div>
      </div>

      <div className="row g-4">
        {/* Bal oldali oszlop: Címzettek kiválasztása */}
        <div className="col-lg-7">
          <section className="card border-0 shadow-sm h-100">
            <div className="card-header bg-light border-0 py-3">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <strong className="fs-5">
                  <i className="bi bi-people-fill text-primary me-2" aria-hidden="true" />
                  Címzettek ({allEmailTargets.length} kiválasztva)
                </strong>

                {/* Csapat szerinti gyors kijelölés */}
                <div className="d-flex align-items-center gap-2">
                  <select
                    className="form-select form-select-sm"
                    style={{ maxWidth: '200px' }}
                    value=""
                    onChange={(e) => {
                      selectTeamMembers(e.target.value)
                      e.target.value = ''
                    }}
                  >
                    <option value="" disabled>Csapat kijelölése…</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.teamName || `Csapat #${t.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="card-body p-3">
              {/* Szerepkör szerinti szűrőgombok */}
              <div className="d-flex flex-wrap gap-1 mb-3">
                <button
                  type="button"
                  className={`btn btn-sm ${roleFilter === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setRoleFilter('all')}
                >
                  Összes ({contacts.length})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${roleFilter === 'contestant' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setRoleFilter('contestant')}
                >
                  Versenyzők
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${roleFilter === 'coach' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setRoleFilter('coach')}
                >
                  Felkészítők
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${roleFilter === 'admin' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setRoleFilter('admin')}
                >
                  Adminok
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${roleFilter === 'individual' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setRoleFilter('individual')}
                >
                  Egyéni (nincs csapatban)
                </button>
              </div>

              {/* Keresés és kijelölés vezérlők */}
              <div className="row g-2 mb-3">
                <div className="col-sm-8">
                  <div className="input-group input-group-sm">
                    <span className="input-group-text"><i className="bi bi-search" /></span>
                    <input
                      type="search"
                      className="form-control"
                      placeholder="Keresés név, e-mail, csapat vagy szerepkör szerint…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                      <button type="button" className="btn btn-outline-secondary" onClick={() => setSearch('')}>
                        Törlés
                      </button>
                    )}
                  </div>
                </div>

                <div className="col-sm-4 text-end">
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm w-100"
                    disabled={filteredContacts.length === 0}
                    onClick={toggleFilteredContacts}
                  >
                    {allFilteredContactsSelected ? 'Kijelölés törlése' : 'Láthatók kijelölése'}
                  </button>
                </div>
              </div>

              {/* Címzettek listája */}
              {loading ? (
                <div className="alert alert-info mb-0">Címzettek betöltése…</div>
              ) : filteredContacts.length > 0 ? (
                <div className="list-group list-group-flush border rounded" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                  {filteredContacts.map((contact) => {
                    const key = contactKey(contact)
                    const isSelected = selectedContactKeys.includes(key)

                    return (
                      <label
                        key={key}
                        className={`list-group-item list-group-item-action d-flex align-items-center gap-3 py-2 cursor-pointer ${isSelected ? 'list-group-item-primary' : ''}`}
                        style={{ cursor: 'pointer' }}
                      >
                        <input
                          type="checkbox"
                          className="form-check-input flex-shrink-0 mt-0"
                          checked={isSelected}
                          onChange={() => toggleContact(contact)}
                        />
                        <div className="flex-grow-1 min-w-0">
                          <div className="d-flex flex-wrap justify-content-between align-items-center gap-1">
                            <strong className="text-truncate">{contact.name || contact.email}</strong>
                            <span className="badge text-bg-light border text-secondary small">{contact.role}</span>
                          </div>
                          <div className="small text-muted text-truncate">{contact.email}</div>
                          {contact.teamName && (
                            <div className="small text-primary mt-1">
                              <i className="bi bi-people me-1" />
                              {contact.teamName}
                              {contact.category && (
                                <span className="ms-2">
                                  <AgeGroupBadge ageGroup={contact.category} />
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
              ) : (
                <div className="alert alert-secondary mb-0">
                  {search ? 'Nincs a keresésnek megfelelő címzett.' : 'Nincsenek elérhető címzettek.'}
                </div>
              )}

              {/* Kézi e-mail hozzáadás */}
              <div className="mt-3 pt-3 border-top">
                <label className="form-label small fw-bold mb-1">Egyedi e-mail-cím hozzáadása:</label>
                <div className="row g-2">
                  <div className="col-sm-6">
                    <input
                      type="email"
                      className="form-control form-control-sm"
                      placeholder="pelda@email.com"
                      value={manualEmail}
                      onChange={(e) => setManualEmail(e.target.value)}
                    />
                  </div>
                  <div className="col-sm-4">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Név (nem kötelező)"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                    />
                  </div>
                  <div className="col-sm-2">
                    <button type="button" className="btn btn-outline-success btn-sm w-100" onClick={addManualTarget}>
                      <i className="bi bi-plus-lg me-1" />Hozzáad
                    </button>
                  </div>
                </div>

                {manualTargets.length > 0 && (
                  <div className="d-flex flex-wrap gap-1 mt-2">
                    {manualTargets.map((m) => (
                      <span key={m.email} className="badge text-bg-info text-dark d-flex align-items-center gap-1">
                        {m.name ? `${m.name} (${m.email})` : m.email}
                        <button
                          type="button"
                          className="btn-close btn-close-white"
                          style={{ fontSize: '0.65rem' }}
                          aria-label="Törlés"
                          onClick={() => removeManualTarget(m.email)}
                        />
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Jobb oldali oszlop: Értesítés összeállítása és küldése */}
        <div className="col-lg-5">
          <section className="card border-0 shadow-sm h-100">
            <div className="card-header bg-light border-0 py-3">
              <strong className="fs-5">
                <i className="bi bi-send-fill text-primary me-2" aria-hidden="true" />
                Értesítés összeállítása
              </strong>
            </div>

            <div className="card-body p-3 d-flex flex-column">
              {/* Címzettek összesítő sáv */}
              <div className="alert alert-light border mb-3 py-2 px-3">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="small text-muted">Kiválasztott címzettek:</span>
                  <strong className="badge text-bg-primary">{allEmailTargets.length} fő / e-mail</strong>
                </div>
                {allEmailTargets.length > 0 && (
                  <div className="small text-truncate mt-1 text-secondary">
                    {allEmailTargets.slice(0, 4).map((t) => t.name || t.email).join(', ')}
                    {allEmailTargets.length > 4 && ` és további ${allEmailTargets.length - 4} címzett…`}
                  </div>
                )}
              </div>

              {/* Értesítés űrlap */}
              <div className="mb-3">
                <label className="form-label fw-bold small" htmlFor="notif-title">
                  Értesítés címe <span className="text-danger">*</span>
                </label>
                <input
                  id="notif-title"
                  type="text"
                  className="form-control"
                  placeholder="pl. Fontos tájékoztatás / Következő meccs"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="mb-3 flex-grow-1">
                <label className="form-label fw-bold small" htmlFor="notif-msg">
                  Értesítés üzenete <span className="text-danger">*</span>
                </label>
                <textarea
                  id="notif-msg"
                  className="form-control"
                  rows={5}
                  placeholder="Írd be az értesítés szövegét, ami megjelenik a címzettek telefonján vagy böngészőjében…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={500}
                />
                <div className="form-text text-end small">{message.length}/500 karakter</div>
              </div>

              <button
                type="button"
                className="btn btn-primary w-100 py-2 fw-bold"
                disabled={sending || allEmailTargets.length === 0 || !title.trim() || !message.trim()}
                onClick={openConfirm}
              >
                {sending ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                    Küldés folyamatban…
                  </>
                ) : (
                  <>
                    <i className="bi bi-send-fill me-2" />
                    Értesítés küldése ({allEmailTargets.length} címzettnek)
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Elküldött értesítések előzményei */}
      <section className="card border-0 shadow-sm mt-4">
        <div className="card-header bg-light border-0 py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div>
            <strong className="fs-5">
              <i className="bi bi-clock-history text-primary me-2" aria-hidden="true" />
              Elküldött értesítések előzményei
            </strong>
            <span className="badge text-bg-secondary ms-2">{sentNotifications.length}</span>
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

        <div className="card-body p-3">
          {/* Előzmények kereső */}
          <div className="mb-3">
            <input
              type="search"
              className="form-control form-control-sm"
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
                    const priv = item.privilege || privilegeById.get(item.privilegeId) || {}
                    const teamName = priv.teamId ? (teamById.get(priv.teamId)?.teamName || `Csapat #${priv.teamId}`) : 'Egyéni címzett'
                    const roleName = getPrivilegeLabel(priv.privilege1) || (priv.isCoach ? 'Felkészítő' : 'Versenyző')
                    const parsed = parseMessageTimestamp(item.text || item.message)

                    return (
                      <tr key={item.id || idx}>
                        <td>
                          <span className="text-muted fw-bold">#{item.id || idx + 1}</span>
                        </td>
                        <td>
                          <strong className="d-block text-primary">{item.title || 'Nincs cím'}</strong>
                          <span className="text-muted small d-block" style={{ whiteSpace: 'pre-wrap' }}>
                            {parsed.text}
                          </span>
                          {parsed.timestamp && (
                            <div className="small text-muted mt-1">
                              <i className="bi bi-clock me-1" />
                              {parsed.timestamp}
                            </div>
                          )}
                        </td>
                        <td>
                          <strong className="d-block">{priv.name || priv.emailAddress || (item.privilegeId ? `Felhasználó #${item.privilegeId}` : 'Mindenki')}</strong>
                          {priv.emailAddress && <span className="small text-muted">{priv.emailAddress}</span>}
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
          <strong>{allEmailTargets.length} e-mail címzettnek</strong>?
        </p>
        <div className="border rounded p-3 bg-light">
          <strong className="d-block mb-2 text-primary">{title}</strong>
          <span className="text-break">{message}</span>
        </div>
      </ConfirmModal>
    </div>
  )
}
