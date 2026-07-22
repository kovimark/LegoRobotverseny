import React, { useEffect, useState } from 'react'
import ConfirmModal from '../components/ConfirmModal'
import FloatingFeedback from '../components/FloatingFeedback'
import TeamGroupManager from '../components/TeamGroupManager'
import {
  addCompetitionPhase,
  getAllCompetitionPhases,
  getAllSettings,
  modifyCompetitionPhase,
  modifySettings,
  resetEveryScore,
  resetSettings
} from '../services/sumoScheduleConfigApi'
const emptyPhase = { phaseName: '', phaseStartTime: '', phaseEndTime: '' }
const phaseNameOf = (phase) => phase.phaseName || phase.name || ''
const phaseStartOf = (phase) => phase.phaseStartTime ?? phase.startTime ?? phase.start ?? null
const phaseEndOf = (phase) => phase.phaseEndTime ?? phase.endTime ?? phase.end ?? null
const toTimeInput = (value) => {
  if (!value) return ''
  const timeMatch = String(value).match(/(?:T|^)(\d{2}):(\d{2})/)
  return timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : ''
}

export default function SettingsManagementPage({ groupOnly = false }) {
  const [settings, setSettings] = useState({ ageGroupBreakdown: 0, competitionPhase: '', minSumoRoundTime: '', maxSumoRoundTime: '' })
  const [phases, setPhases] = useState([])
  const [phaseDraft, setPhaseDraft] = useState(emptyPhase)
  const [editingPhaseName, setEditingPhaseName] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)
  const [dangerAction, setDangerAction] = useState(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const [settingsData, phaseData] = await Promise.all([getAllSettings(), getAllCompetitionPhases()])
      setPhases(phaseData)
      setSettings({
        ageGroupBreakdown: Number(settingsData?.ageGroupBreakdown) === 1 ? 1 : 0,
        competitionPhase: typeof settingsData?.competitionPhase === 'string'
          ? settingsData.competitionPhase
          : phaseNameOf(settingsData?.competitionPhase || {}),
        minSumoRoundTime: settingsData?.minSumoRoundTime ?? '',
        maxSumoRoundTime: settingsData?.maxSumoRoundTime ?? ''
      })
    } catch (error) {
      setStatus({ type: 'danger', text: error.message })
    } finally { setLoading(false) }
  }

  useEffect(() => { if (!groupOnly) loadData() }, [groupOnly])
  const updateSettings = (name, value) => setSettings((current) => ({ ...current, [name]: value }))
  const updatePhase = (name, value) => setPhaseDraft((current) => ({ ...current, [name]: value }))

  const saveMainSettings = async (event) => {
    event.preventDefault()
    const min = settings.minSumoRoundTime === '' ? null : Number(settings.minSumoRoundTime)
    const max = settings.maxSumoRoundTime === '' ? null : Number(settings.maxSumoRoundTime)
    if ((min !== null && (!Number.isFinite(min) || min < 0)) || (max !== null && (!Number.isFinite(max) || max < 0))) {
      setStatus({ type: 'danger', text: 'A szumóforduló minimum és maximum ideje 0 vagy annál nagyobb szám legyen.' })
      return
    }
    if (min !== null && max !== null && min > max) {
      setStatus({ type: 'danger', text: 'A szumóforduló minimum ideje nem lehet nagyobb a maximum idejénél.' })
      return
    }
    try {
      setSaving(true)
      await modifySettings(settings)
      setStatus({ type: 'success', text: 'A beállítások mentése sikerült.' })
      await loadData()
    } catch (error) { setStatus({ type: 'danger', text: error.message }) } finally { setSaving(false) }
  }

  const savePhase = async (event) => {
    event.preventDefault()
    if (!phaseDraft.phaseName.trim()) {
      setStatus({ type: 'danger', text: 'A versenyszakasz neve kötelező.' })
      return
    }
    if (phaseDraft.phaseStartTime && phaseDraft.phaseEndTime && phaseDraft.phaseStartTime > phaseDraft.phaseEndTime) {
      setStatus({ type: 'danger', text: 'A szakasz kezdete nem lehet később a befejezésnél.' })
      return
    }
    try {
      setSaving(true)
      if (editingPhaseName) await modifyCompetitionPhase(editingPhaseName, phaseDraft)
      else await addCompetitionPhase(phaseDraft)
      setStatus({ type: 'success', text: editingPhaseName ? 'A versenyszakasz módosítva.' : 'A versenyszakasz hozzáadva.' })
      setEditingPhaseName(null)
      setPhaseDraft(emptyPhase)
      await loadData()
    } catch (error) { setStatus({ type: 'danger', text: error.message }) } finally { setSaving(false) }
  }

  const editPhase = (phase) => {
    const name = phaseNameOf(phase)
    setEditingPhaseName(name)
    setPhaseDraft({ phaseName: name, phaseStartTime: toTimeInput(phaseStartOf(phase)), phaseEndTime: toTimeInput(phaseEndOf(phase)) })
  }

  const handleResetSettings = async () => {
    try { setSaving(true); await resetSettings(); setDangerAction(null); setStatus({ type: 'success', text: 'A beállítások alaphelyzetbe álltak.' }); await loadData() }
    catch (error) { setStatus({ type: 'danger', text: error.message }) }
    finally { setSaving(false) }
  }

  const handleResetScores = async () => {
    try { setSaving(true); await resetEveryScore(); setDangerAction(null); setStatus({ type: 'success', text: 'Minden pont alaphelyzetbe állítása megtörtént.' }) }
    catch (error) { setStatus({ type: 'danger', text: error.message }) }
    finally { setSaving(false) }
  }

  if (groupOnly) return <div className="container py-4"><h1 className="h2 mb-1">Beállítások</h1><p className="text-muted mb-4">Csapatcsoportok kezelése.</p><TeamGroupManager /></div>

  return (
    <div className="container py-4">
      <h2 className="mb-1">Versenybeállítások</h2>
      <p className="text-muted mb-4">Korosztály, aktuális szakasz, időintervallumok és a teljes szumóforduló időkerete.</p>
      <FloatingFeedback message={status} onClose={() => setStatus(null)} />
      {loading ? <div className="alert alert-info">Beállítások betöltése...</div> : <>
        <form className="card shadow-sm team-card no-hover-card mb-4" onSubmit={saveMainSettings}>
          <div className="card-body p-4"><h3 className="h5 mb-3">Aktuális beállítások</h3><div className="row g-3">
            <div className="col-md-6"><label className="form-label" htmlFor="age-breakdown">Korosztálybontás</label><select id="age-breakdown" className="form-select" value={settings.ageGroupBreakdown} onChange={(event) => updateSettings('ageGroupBreakdown', Number(event.target.value))}><option value="0">Nincs korosztálybontás</option><option value="1">Van korosztálybontás</option></select></div>
            <div className="col-md-6"><label className="form-label" htmlFor="competition-phase">Aktuális versenyszakasz</label><select id="competition-phase" className="form-select" value={settings.competitionPhase} onChange={(event) => updateSettings('competitionPhase', event.target.value)}><option value="">Nincs kiválasztva</option>{phases.map((phase) => { const name = phaseNameOf(phase); return <option value={name} key={phase.id ?? name}>{name}</option> })}</select></div>
            <div className="col-md-6"><label className="form-label" htmlFor="min-sumo-time">Egy teljes szumóforduló minimum ideje</label><div className="input-group"><input id="min-sumo-time" type="number" min="0" step="0.1" className="form-control" value={settings.minSumoRoundTime} onChange={(event) => updateSettings('minSumoRoundTime', event.target.value)} /><span className="input-group-text">perc</span></div><div className="form-text">Az adott forduló összes mérkőzésének lejátszására szánt minimum idő.</div></div>
            <div className="col-md-6"><label className="form-label" htmlFor="max-sumo-time">Egy teljes szumóforduló maximum ideje</label><div className="input-group"><input id="max-sumo-time" type="number" min="0" step="0.1" className="form-control" value={settings.maxSumoRoundTime} onChange={(event) => updateSettings('maxSumoRoundTime', event.target.value)} /><span className="input-group-text">perc</span></div><div className="form-text">Az adott forduló összes mérkőzésének lejátszására szánt maximum idő.</div></div>
            <div className="col-12 text-end"><button className="btn btn-primary" disabled={saving}>Beállítások mentése</button></div>
          </div></div>
        </form>

        <form className="card shadow-sm team-card no-hover-card mb-4" onSubmit={savePhase}>
          <div className="card-body p-4"><div className="d-flex justify-content-between mb-3"><h3 className="h5 mb-0">{editingPhaseName ? 'Versenyszakasz módosítása' : 'Új versenyszakasz'}</h3>{editingPhaseName && <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => { setEditingPhaseName(null); setPhaseDraft(emptyPhase) }}>Mégse</button>}</div><div className="row g-3">
            <div className="col-md-4"><label className="form-label" htmlFor="phase-name">Szakasz neve</label><input id="phase-name" className="form-control" placeholder="pl. Teszt, Alapszakasz, Kiesés" value={phaseDraft.phaseName} onChange={(event) => updatePhase('phaseName', event.target.value)} /></div>
            <div className="col-md-3"><label className="form-label" htmlFor="phase-start">Kezdés</label><input id="phase-start" type="time" step="60" className="form-control" value={phaseDraft.phaseStartTime} onChange={(event) => updatePhase('phaseStartTime', event.target.value)} /></div>
            <div className="col-md-3"><label className="form-label" htmlFor="phase-end">Befejezés</label><input id="phase-end" type="time" step="60" className="form-control" value={phaseDraft.phaseEndTime} onChange={(event) => updatePhase('phaseEndTime', event.target.value)} /></div>
            <div className="col-md-2 d-flex align-items-end"><button className="btn btn-primary w-100" disabled={saving}>{editingPhaseName ? 'Módosítás' : 'Hozzáadás'}</button></div>
          </div><div className="form-text mt-2">Csak az óra és perc kerül mentésre, dátum nélkül.</div></div>
        </form>

        <div className="row g-3 mb-4">{phases.map((phase) => { const name = phaseNameOf(phase); return <div className="col-md-6 col-xl-4" key={phase.id ?? name}><article className="team-info-box h-100"><h4 className="h5">{name}</h4><div className="small text-muted">{toTimeInput(phaseStartOf(phase)) || 'Nincs kezdés'} – {toTimeInput(phaseEndOf(phase)) || 'Nincs befejezés'}</div><button type="button" className="btn btn-outline-primary btn-sm mt-3" onClick={() => editPhase(phase)}>Módosítás</button></article></div> })}</div>

        <TeamGroupManager />
        <section className="card border-danger mb-4"><div className="card-body"><h3 className="h5 text-danger">Veszélyes műveletek</h3><div className="d-flex flex-wrap gap-2"><button type="button" className="btn btn-outline-danger" onClick={() => setDangerAction('settings')}>Beállítások alaphelyzetbe állítása</button><button type="button" className="btn btn-danger" onClick={() => setDangerAction('scores')}>Minden pont törlése</button></div></div></section>
      </>}
      <ConfirmModal
        open={Boolean(dangerAction)}
        title={dangerAction === 'scores' ? 'Minden pont törlése' : 'Beállítások alaphelyzetbe állítása'}
        confirmLabel={dangerAction === 'scores' ? 'Minden pont törlése' : 'Beállítások visszaállítása'}
        requiredText={dangerAction === 'scores' ? 'MINDEN PONT TÖRLÉSE' : ''}
        busy={saving}
        onClose={() => setDangerAction(null)}
        onConfirm={dangerAction === 'scores' ? handleResetScores : handleResetSettings}
      >
        {dangerAction === 'scores'
          ? <p className="mb-0">Ez minden rögzített pontot és eredményt törölhet, és nem vonható vissza.</p>
          : <p className="mb-0">Biztosan alaphelyzetbe állítod az összes versenybeállítást?</p>}
      </ConfirmModal>
    </div>
  )
}
