import React, { useEffect, useMemo, useState } from 'react'
import ConfirmModal from '../components/ConfirmModal'
import FloatingFeedback from '../components/FloatingFeedback'
import AgeGroupBadge from '../components/AgeGroupBadge'

const API_URL = 'https://legocompetition.runasp.net/api'
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const contactKey = (contact) => `${contact.email.trim().toLocaleLowerCase('hu-HU')}|${contact.teamName.trim().toLocaleLowerCase('hu-HU')}`

const contactsFromTeams = (teams) => {
  const contacts = []
  teams.forEach((team) => {
    const teamName = team.teamName || `Csapat #${team.id}`
    ;[
      [team.teamMember1Email, team.teamMember1Name, '1. versenyző'],
      [team.teamMember2Email, team.teamMember2Name, '2. versenyző'],
      [team.teamCoach1Email, team.teamCoach1, 'Felkészítő']
    ].forEach(([email, name, role]) => {
      if (emailPattern.test(String(email || '').trim())) {
        contacts.push({ email: String(email).trim(), teamName, name: name || '', role, category: team.category })
      }
    })
  })
  return Array.from(new Map(contacts.map((contact) => [contactKey(contact), contact])).values())
}

export default function EmailManagementPage() {
  const [contacts, setContacts] = useState([])
  const [selectedKeys, setSelectedKeys] = useState([])
  const [manualTargets, setManualTargets] = useState([])
  const [manualEmail, setManualEmail] = useState('')
  const [manualTeamName, setManualTeamName] = useState('')
  const [search, setSearch] = useState('')
  const [subject, setSubject] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`${API_URL}/Teams`, { headers: { accept: '*/*' } })
        if (!response.ok) throw new Error((await response.text()) || 'A címzettek betöltése sikertelen.')
        const teams = await response.json()
        setContacts(contactsFromTeams(Array.isArray(teams) ? teams : []))
      } catch (error) {
        setFeedback({ type: 'danger', text: error.message })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filteredContacts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('hu-HU')
    if (!term) return contacts
    return contacts.filter((contact) =>
      [contact.email, contact.teamName, contact.name, contact.role]
        .some((value) => String(value || '').toLocaleLowerCase('hu-HU').includes(term)))
  }, [contacts, search])

  const allFilteredSelected = filteredContacts.length > 0
    && filteredContacts.every((contact) => selectedKeys.includes(contactKey(contact)))
  const selectedContacts = contacts.filter((contact) => selectedKeys.includes(contactKey(contact)))
  const targets = Array.from(new Map(
    [...selectedContacts, ...manualTargets].map((target) => [contactKey(target), {
      email: target.email.trim(),
      teamName: target.teamName.trim()
    }])
  ).values())

  const toggleContact = (contact) => {
    const key = contactKey(contact)
    setSelectedKeys((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])
  }

  const toggleFiltered = () => {
    const keys = filteredContacts.map(contactKey)
    setSelectedKeys((current) => allFilteredSelected
      ? current.filter((key) => !keys.includes(key))
      : [...new Set([...current, ...keys])])
  }

  const addManualTarget = () => {
    const email = manualEmail.trim()
    const teamName = manualTeamName.trim()
    if (!emailPattern.test(email)) {
      setFeedback({ type: 'danger', text: 'Adj meg egy érvényes e-mail-címet.' })
      return
    }
    if (!teamName) {
      setFeedback({ type: 'danger', text: 'Add meg, melyik csapathoz tartozik a címzett.' })
      return
    }
    const target = { email, teamName }
    if (targets.some((item) => contactKey(item) === contactKey(target))) {
      setFeedback({ type: 'danger', text: 'Ez a címzett már szerepel a listában.' })
      return
    }
    setManualTargets((current) => [...current, target])
    setManualEmail('')
    setManualTeamName('')
  }

  const requestSend = () => {
    if (!subject.trim()) return setFeedback({ type: 'danger', text: 'Add meg az e-mail tárgyát.' })
    if (!customMessage.trim()) return setFeedback({ type: 'danger', text: 'Írd be az e-mail szövegét.' })
    if (targets.length === 0) return setFeedback({ type: 'danger', text: 'Válassz vagy adj hozzá legalább egy címzettet.' })
    setConfirmOpen(true)
  }

  const sendEmails = async () => {
    try {
      setSending(true)
      const response = await fetch(`${API_URL}/Email/send-bulk`, {
        method: 'POST',
        headers: { accept: '*/*', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          customMessage: customMessage.trim().replace(/\r?\n/g, '<br>'),
          targets
        })
      })
      if (!response.ok) throw new Error((await response.text()) || 'Az e-mailek küldése sikertelen.')
      setConfirmOpen(false)
      setSubject('')
      setCustomMessage('')
      setSelectedKeys([])
      setManualTargets([])
      setFeedback({ type: 'success', text: `Az e-mail ${targets.length} címzettnek elküldve.` })
    } catch (error) {
      setConfirmOpen(false)
      setFeedback({ type: 'danger', text: error.message })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="container py-4">
      <h2 className="mb-1">E-mail küldése</h2>
      <p className="text-muted mb-4">Küldj egyedi szövegű e-mailt tetszőleges számú címzettnek.</p>
      <FloatingFeedback message={feedback} onClose={() => setFeedback(null)} />

      <section className="card shadow-sm team-card no-hover-card mb-4">
        <div className="card-body p-4">
          <label className="form-label fw-semibold" htmlFor="bulk-email-subject">Tárgy</label>
          <input id="bulk-email-subject" className="form-control mb-3" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Az e-mail tárgya" />
          <label className="form-label fw-semibold" htmlFor="bulk-email-message">Üzenet</label>
          <textarea id="bulk-email-message" className="form-control" rows="8" value={customMessage} onChange={(event) => setCustomMessage(event.target.value)} placeholder="Írd ide az üzenetet…" />
          <div className="form-text">A szövegdobozban megadott sortörések az e-mailben is sortörésként jelennek meg.</div>
        </div>
      </section>

      <section className="card shadow-sm team-card no-hover-card mb-4">
        <div className="card-body p-4">
          <h3 className="h5 mb-3">Egyedi címzett hozzáadása</h3>
          <div className="row g-3 align-items-end">
            <div className="col-md-5"><label className="form-label" htmlFor="manual-email">E-mail-cím</label><input id="manual-email" type="email" className="form-control" value={manualEmail} onChange={(event) => setManualEmail(event.target.value)} placeholder="pelda@email.hu" /></div>
            <div className="col-md-5"><label className="form-label" htmlFor="manual-team">Csapat neve</label><input id="manual-team" className="form-control" value={manualTeamName} onChange={(event) => setManualTeamName(event.target.value)} placeholder="Csapatnév" /></div>
            <div className="col-md-2"><button type="button" className="btn btn-outline-primary w-100" onClick={addManualTarget}><i className="bi bi-plus-lg me-2" />Hozzáadás</button></div>
          </div>
          {manualTargets.length > 0 && <div className="d-flex flex-wrap gap-2 mt-3">{manualTargets.map((target) => <span className="badge text-bg-light border text-dark p-2" key={contactKey(target)}>{target.email} · {target.teamName}<button type="button" className="btn-close ms-2" aria-label={`${target.email} eltávolítása`} onClick={() => setManualTargets((current) => current.filter((item) => contactKey(item) !== contactKey(target)))} /></span>)}</div>}
        </div>
      </section>

      <section className="card shadow-sm team-card no-hover-card">
        <div className="card-body p-4">
          <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-3">
            <div className="flex-grow-1"><label className="form-label fw-semibold" htmlFor="email-contact-search">Regisztrált címzettek keresése</label><input id="email-contact-search" type="search" className="form-control" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Név, csapat vagy e-mail-cím…" /></div>
            <button type="button" className="btn btn-outline-primary" disabled={filteredContacts.length === 0} onClick={toggleFiltered}>{allFilteredSelected ? 'Láthatók kijelölésének törlése' : 'Összes látható kijelölése'}</button>
          </div>
          <div className="mb-3 fw-semibold">{targets.length} címzett kijelölve</div>
          {loading ? <div className="alert alert-info mb-0">Címzettek betöltése…</div> : <div className="notification-team-grid">
            {filteredContacts.map((contact) => <label className={`notification-team-option ${selectedKeys.includes(contactKey(contact)) ? 'selected' : ''}`} key={contactKey(contact)}>
              <input type="checkbox" checked={selectedKeys.includes(contactKey(contact))} onChange={() => toggleContact(contact)} />
              <span><strong><AgeGroupBadge category={contact.category} className="me-2" />{contact.name || contact.email}</strong><small>{contact.email} · {contact.teamName} · {contact.role}</small></span>
            </label>)}
            {filteredContacts.length === 0 && <div className="alert alert-secondary mb-0">Nincs megfelelő címzett.</div>}
          </div>}
          <div className="text-end mt-4"><button type="button" className="btn btn-primary" disabled={sending || loading} onClick={requestSend}><i className="bi bi-envelope-fill me-2" />E-mail küldése</button></div>
        </div>
      </section>

      <ConfirmModal open={confirmOpen} title="E-mailek elküldése" confirmLabel="Küldés" confirmVariant="primary" busy={sending} onClose={() => setConfirmOpen(false)} onConfirm={sendEmails}>
        <p>Biztosan elküldöd ezt az e-mailt <strong>{targets.length} címzettnek</strong>?</p>
        <div className="border rounded p-3 bg-light"><strong className="d-block mb-2">{subject}</strong><div style={{ whiteSpace: 'pre-wrap' }}>{customMessage}</div></div>
      </ConfirmModal>
    </div>
  )
}
