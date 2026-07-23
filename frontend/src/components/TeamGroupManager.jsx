import React, { useEffect, useMemo, useState } from 'react'
import ConfirmModal from './ConfirmModal'
import FloatingFeedback from './FloatingFeedback'

const API_URL = 'https://legocompetition.runasp.net/api/Teams'
const GROUP_OPTIONS = Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index))

const toUpdatePayload = (team, group) => ({
  teamName: team.teamName || '',
  teamMember1Name: team.teamMember1Name || '',
  teamMember1Class: Number(team.teamMember1Class) || 0,
  teamMember1Email: team.teamMember1Email || '',
  teamMember2Name: team.teamMember2Name || '',
  teamMember2Class: Number(team.teamMember2Class) || 0,
  teamMember2Email: team.teamMember2Email || '',
  teamCoach1: team.teamCoach1 || '',
  teamCoach1Email: team.teamCoach1Email || '',
  schoolName: team.schoolName || '',
  category: Number(team.category) === 1 ? 1 : 0,
  group
})

export default function TeamGroupManager() {
  const [teams, setTeams] = useState([])
  const [draftGroups, setDraftGroups] = useState({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [saveTarget, setSaveTarget] = useState(null)

  const loadTeams = async () => {
    try {
      setLoading(true)
      const response = await fetch(API_URL, { headers: { accept: '*/*' } })
      if (!response.ok) throw new Error('Nem sikerült betölteni a csapatokat.')
      const data = await response.json()
      const list = Array.isArray(data) ? data : []
      setTeams(list)
      setDraftGroups(Object.fromEntries(list.map((team) => {
        const group = String(team.group || '').trim().toUpperCase()
        return [team.id, GROUP_OPTIONS.includes(group) ? group : '']
      })))
    } catch (error) { setFeedback({ type: 'danger', text: error.message }) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadTeams() }, [])

  const filteredTeams = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('hu-HU')
    return teams.filter((team) => !term || `${team.teamName} ${team.schoolName} ${team.group || ''}`.toLocaleLowerCase('hu-HU').includes(term))
  }, [teams, search])

  const saveGroup = async () => {
    const team = saveTarget
    if (!team) return
    const group = String(draftGroups[team.id] || '').toUpperCase()
    if (!GROUP_OPTIONS.includes(group)) {
      setSaveTarget(null)
      setFeedback({ type: 'danger', text: 'Válassz egy A és Z közötti csoportbetűt.' })
      return
    }
    try {
      setSavingId(team.id)
      const response = await fetch(`${API_URL}/${team.id}`, {
        method: 'PUT',
        headers: { accept: '*/*', 'Content-Type': 'application/json' },
        body: JSON.stringify(toUpdatePayload(team, group))
      })
      if (!response.ok) throw new Error((await response.text()) || 'A csoport mentése nem sikerült.')
      setTeams((current) => current.map((item) => item.id === team.id ? { ...item, group } : item))
      setSaveTarget(null)
      setFeedback({ type: 'success', text: `${team.teamName} csoportja elmentve: ${group}.` })
    } catch (error) { setFeedback({ type: 'danger', text: error.message }) }
    finally { setSavingId(null) }
  }

  return (
    <section className="card shadow-sm team-card no-hover-card mb-4">
      <div className="card-body p-4">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3"><div><h2 className="h5 mb-1">Csapatcsoportok</h2><p className="text-muted mb-0">A csapatok csoportja egy betű lehet: A, B, C, D…</p></div><div className="team-group-search"><label className="visually-hidden" htmlFor="team-group-search">Csapat keresése</label><div className="input-group"><span className="input-group-text"><i className="bi bi-search" /></span><input id="team-group-search" type="search" className="form-control" placeholder="Csapat vagy iskola keresése" value={search} onChange={(event) => setSearch(event.target.value)} /></div></div></div>
        <FloatingFeedback message={feedback} onClose={() => setFeedback(null)} />
        {loading ? <div className="alert alert-info mb-0">Csapatok betöltése...</div> : filteredTeams.length > 0 ? <div className="row g-3">{filteredTeams.map((team) => <div className="col-md-6 col-xl-4" key={team.id}><div className="team-info-box h-100"><div className="team-info-title">{team.teamName}</div><div className="small text-muted mb-3">{team.schoolName}</div><label className="form-label" htmlFor={`team-group-${team.id}`}>Csoport jele</label><div className="input-group"><input id={`team-group-${team.id}`} type="text" className="form-control text-uppercase" maxLength="1" placeholder="pl. A" value={draftGroups[team.id] || ''} onChange={(event) => { const value = event.target.value.toUpperCase().replace(/[^A-Z]/g, ''); setDraftGroups((current) => ({ ...current, [team.id]: value })) }} /><button type="button" className="btn btn-primary" disabled={savingId === team.id || !draftGroups[team.id]} onClick={() => setSaveTarget(team)}>Mentés</button></div><div className="form-text">Egy betű adható meg A és Z között.</div></div></div>)}</div> : <div className="alert alert-secondary mb-0">Nincs a keresésnek megfelelő csapat.</div>}
      </div>
      <ConfirmModal open={Boolean(saveTarget)} title="Csapatcsoport mentése" confirmLabel="Csoport mentése" confirmVariant="primary" busy={Boolean(saveTarget && savingId === saveTarget.id)} onClose={() => setSaveTarget(null)} onConfirm={saveGroup}><p className="mb-0">A(z) <strong>{saveTarget?.teamName}</strong> csapat csoportja <strong>{saveTarget ? draftGroups[saveTarget.id] : ''}</strong> legyen?</p></ConfirmModal>
    </section>
  )
}
