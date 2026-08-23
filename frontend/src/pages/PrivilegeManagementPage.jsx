import React, { useEffect, useState } from 'react'
import { getPrivilegeLabel, privilegeOptions } from '../config/privilegeConfig'
import ConfirmModal from '../components/ConfirmModal'
import FloatingFeedback from '../components/FloatingFeedback'

const API_URL = 'https://legocompetition.runasp.net/api/Privilege'
const TEAMS_API_URL = 'https://legocompetition.runasp.net/api/Teams'

export default function PrivilegeManagementPage() {
  const [privileges, setPrivileges] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState(0)
  const [newTeamId, setNewTeamId] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const filteredPrivileges = privileges.filter((privilege) => (
    !normalizedSearch || [
      privilege.id,
      privilege.emailAddress,
      privilege.name,
      privilege.class,
      getPrivilegeLabel(privilege.privilege1),
      privilege.teamId
    ].some((value) => String(value ?? '').toLowerCase().includes(normalizedSearch))
  ))

  const loadPrivileges = async () => {
    try {
      setLoading(true)
      const response = await fetch(API_URL, { headers: { accept: '*/*' } })
      if (!response.ok) throw new Error('Nem sikerült betölteni a jogosultságokat.')
      const data = await response.json()
      setPrivileges(Array.isArray(data) ? data : [])
    } catch (error) {
      setMessage({ type: 'danger', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  const loadTeams = async () => {
    try {
      const response = await fetch(TEAMS_API_URL, { headers: { accept: '*/*' } })
      if (!response.ok) throw new Error('Nem sikerült betölteni a csapatokat.')
      const data = await response.json()
      setTeams(Array.isArray(data) ? data : [])
    } catch (error) {
      setMessage({ type: 'danger', text: error.message })
    }
  }

  useEffect(() => {
    loadPrivileges()
    loadTeams()
  }, [])

  const savePrivilege = async (privilege) => {
    const role = Number(privilege.privilege1)
    const isNewPrivilege = !Number(privilege.id)
    const teamId = privilege.teamId ? Number(privilege.teamId) : null
    const payload = {
      id: Number(privilege.id) || 0,
      emailAddress: privilege.emailAddress.trim().toLowerCase(),
      privilege1: role,
      name: privilege.name || null,
      class: privilege.class !== null && privilege.class !== undefined ? Number(privilege.class) : null,
      isCoach: privilege.isCoach !== null && privilege.isCoach !== undefined ? Number(privilege.isCoach) : null,
      teamId: teamId
    }

    if (!payload.emailAddress) {
      setMessage({ type: 'danger', text: 'Az e-mail-cím megadása kötelező.' })
      return
    }

    try {
      setSavingId(privilege.id || 'new')
      const response = await fetch(API_URL, {
        method: isNewPrivilege ? 'POST' : 'PUT',
        headers: { accept: '*/*', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'A jogosultság mentése nem sikerült.')
      }
      setMessage({
        type: 'success',
        text: isNewPrivilege
          ? `${payload.emailAddress} sikeresen hozzáadva: ${getPrivilegeLabel(role)}.`
          : `${payload.emailAddress} jogosultsága mentve: ${getPrivilegeLabel(role)}.`
      })
      setNewEmail('')
      setNewRole(0)
      setNewTeamId('')
      await loadPrivileges()
    } catch (error) {
      setMessage({ type: 'danger', text: error.message })
    } finally {
      setSavingId(null)
    }
  }

  const deletePrivilege = async (privilege) => {
    try {
      setSavingId(privilege.id)
      const response = await fetch(`${API_URL}/${encodeURIComponent(privilege.emailAddress)}`, {
        method: 'DELETE',
        headers: { accept: '*/*' }
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'A jogosultság törlése nem sikerült.')
      }
      setPrivileges((current) => current.filter((item) => item.id !== privilege.id))
      setDeleteTarget(null)
      setMessage({ type: 'success', text: 'Az e-mail-cím törölve lett.' })
    } catch (error) {
      setMessage({ type: 'danger', text: error.message })
    } finally {
      setSavingId(null)
    }
  }

  const updateLocalRole = (id, value) => {
    setPrivileges((current) => current.map((item) => (
      item.id === id ? { ...item, privilege1: Number(value) } : item
    )))
  }

  const updateLocalField = (id, field, value) => {
    setPrivileges((current) => current.map((item) => (
      item.id === id ? { ...item, [field]: value === '' ? null : value } : item
    )))
  }

  const getTeamName = (teamId) => {
    if (!teamId) return '-'
    const team = teams.find((t) => t.id === Number(teamId))
    return team?.teamName || `ID: ${teamId}`
  }

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h2 className="mb-1">Jogosultságok kezelése</h2>
          <p className="text-muted mb-0">Felhasználók és bírói szerepkörök kezelése. Az edző és versenyző információkat most külön kezeljük.</p>
        </div>
      </div>

      <FloatingFeedback message={message} onClose={() => setMessage(null)} />

      <section className="team-info-box mb-4">
        <h3 className="h5 mb-3">Új e-mail-cím hozzáadása</h3>
        <div className="row g-3 align-items-end">
          <div className="col-lg-6">
            <label className="form-label" htmlFor="new-privilege-email">E-mail-cím</label>
            <input id="new-privilege-email" type="email" className="form-control" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} />
          </div>
          <div className="col-lg-3">
            <label className="form-label" htmlFor="new-privilege-role">Jogosultság</label>
            <select id="new-privilege-role" className="form-select" value={newRole} onChange={(event) => setNewRole(Number(event.target.value))}>
              {privilegeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="col-lg-2">
            <label className="form-label" htmlFor="new-privilege-team">Csapat</label>
            <select id="new-privilege-team" className="form-select" value={newTeamId} onChange={(event) => setNewTeamId(event.target.value)}>
              <option value="">Nincs</option>
              {teams.map((team) => <option key={team.id} value={team.id}>{team.teamName}</option>)}
            </select>
          </div>
          <div className="col-lg-1">
            <button type="button" className="btn btn-primary w-100" disabled={savingId === 'new'} onClick={() => savePrivilege({ id: 0, emailAddress: newEmail, privilege1: newRole, name: null, class: null, isCoach: null, teamId: newTeamId || null })}>
              Hozzáadás
            </button>
          </div>
        </div>
      </section>

      <div className="row mb-4">
        <div className="col-lg-6">
          <label className="form-label fw-semibold" htmlFor="privilege-search">Keresés</label>
          <input
            id="privilege-search"
            type="search"
            className="form-control"
            placeholder="Keresés e-mail, név, jogosultság, csapat vagy azonosító alapján"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
      </div>

      {loading ? <div className="alert alert-info">Jogosultságok betöltése...</div> : (
        <div className="row g-3">
          {filteredPrivileges.map((privilege) => (
            <div className="col-md-6 col-xl-4" key={privilege.id}>
              <section className="team-info-box h-100 d-flex flex-column">
                <div className="team-info-title">Felhasználó #{privilege.id}</div>
                <div className="team-info-value mb-2">{privilege.emailAddress}</div>
                <div className="mb-2 small text-muted">
                  <div>Név: {privilege.name || '-'}</div>
                  <div>Osztály: {privilege.class || '-'}</div>
                  <div>Csapat: {getTeamName(privilege.teamId)}</div>
                  {privilege.isCoach !== null && <div>Edző: {privilege.isCoach ? 'igen' : 'nem'}</div>}
                </div>
                <label className="form-label" htmlFor={`role-${privilege.id}`}>Jogosultság</label>
                <select id={`role-${privilege.id}`} className="form-select mb-2" value={privilege.privilege1} onChange={(event) => updateLocalRole(privilege.id, event.target.value)}>
                  {privilegeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <label className="form-label" htmlFor={`team-${privilege.id}`}>Csapat</label>
                <select id={`team-${privilege.id}`} className="form-select mb-3" value={privilege.teamId || ''} onChange={(event) => updateLocalField(privilege.id, 'teamId', event.target.value)}>
                  <option value="">Nincs</option>
                  {teams.map((team) => <option key={team.id} value={team.id}>{team.teamName}</option>)}
                </select>
                <div className="d-flex gap-2 mt-auto">
                  <button type="button" className="btn btn-primary flex-grow-1" disabled={savingId === privilege.id} onClick={() => savePrivilege(privilege)}>Mentés</button>
                  <button type="button" className="btn btn-outline-danger" disabled={savingId === privilege.id} onClick={() => setDeleteTarget(privilege)}>Törlés</button>
                </div>
              </section>
            </div>
          ))}
          {filteredPrivileges.length === 0 && (
            <div className="col-12">
              <div className="alert alert-secondary mb-0">Nincs a keresésnek megfelelő felhasználó.</div>
            </div>
          )}
        </div>
      )}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Jogosultság törlése"
        confirmLabel="E-mail-cím törlése"
        busy={Boolean(deleteTarget && savingId === deleteTarget.id)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deletePrivilege(deleteTarget)}
      >
        <p className="mb-2">Biztosan törlöd ezt az e-mail-címet és a hozzá tartozó jogosultságot?</p>
        <strong>{deleteTarget?.emailAddress}</strong>
      </ConfirmModal>
    </div>
  )
}