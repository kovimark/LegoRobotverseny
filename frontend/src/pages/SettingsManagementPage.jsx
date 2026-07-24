import React, { useEffect, useState } from 'react'
import ConfirmModal from '../components/ConfirmModal'
import FloatingFeedback from '../components/FloatingFeedback'
import TeamGroupManager from '../components/TeamGroupManager'
import BackupManager from '../components/BackupManager'
import CompetitionStatistics from '../components/CompetitionStatistics'
import {
  addCompetitionPhase,
  deleteCompetitionPhase,
  getAllCompetitionPhases,
  getAllSettings,
  modifyCompetitionPhase,
  modifySettings,
  resetEveryScore,
  resetSettings
} from '../services/sumoScheduleConfigApi'
const emptyPhase = { phaseName: '', phaseStartTime: '', phaseEndTime: '' }
const phaseNameOf = (phase) => phase.phaseName || phase.competitionPhaseName || phase.name || ''
const phaseStartOf = (phase) => phase.phaseStartTime ?? phase.startTime ?? phase.start ?? null
const phaseEndOf = (phase) => phase.phaseEndTime ?? phase.endTime ?? phase.end ?? null
const phaseIdOf = (phase) => phase.id ?? phase.phaseID ?? phase.phaseId ?? phase.competitionPhaseId
const toTimeInput = (value) => {
  if (!value) return ''
  const timeMatch = String(value).match(/(?:T|^)(\d{2}):(\d{2})/)
  return timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : ''
}

export default function SettingsManagementPage({ groupOnly = false }) {
  const [settings, setSettings] = useState({ ageGroupBreakdown: 0, competitionPhase: '', minSumoRoundTime: '', maxSumoRoundTime: '', psGroupAdvance: 0, hsGroupAdvance: 0, allGroupAdvance: 0 })
  const [phases, setPhases] = useState([])
  const [phaseDraft, setPhaseDraft] = useState(emptyPhase)
  const [editingPhaseName, setEditingPhaseName] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)
  const [dangerAction, setDangerAction] = useState(null)
  const [shiftMinutes, setShiftMinutes] = useState('')
  const [confirmScheduleShift, setConfirmScheduleShift] = useState(false)
  const [phaseToDelete, setPhaseToDelete] = useState(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const [settingsData, phaseData] = await Promise.all([getAllSettings(), getAllCompetitionPhases()])
      setPhases(phaseData)
      const selectedPhase = typeof settingsData?.competitionPhase === 'string'
        ? settingsData.competitionPhase
        : phaseNameOf(settingsData?.competitionPhase || {}) || phaseNameOf(phaseData.find((phase) => Number(phase.id) === Number(settingsData?.competitionPhaseId)) || {})
      setSettings({
        ageGroupBreakdown: Number(settingsData?.ageGroupBreakdown) === 1 ? 1 : 0,
        competitionPhase: selectedPhase,
        minSumoRoundTime: settingsData?.minSumoRoundTime ?? '',
        maxSumoRoundTime: settingsData?.maxSumoRoundTime ?? '',
        psGroupAdvance: settingsData?.psGroupAdvance ?? 0,
        hsGroupAdvance: settingsData?.hsGroupAdvance ?? 0,
        allGroupAdvance: settingsData?.allGroupAdvance ?? 0
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
    if ((min !== null && (!Number.isInteger(min) || min < 0)) || (max !== null && (!Number.isInteger(max) || max < 0))) {
      setStatus({ type: 'danger', text: 'A szumóforduló minimum és maximum ideje 0 vagy annál nagyobb egész perc legyen.' })
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
    const editingIndex = scheduledPhases.findIndex((phase) => phaseNameOf(phase) === editingPhaseName)
    const normalizedDraft = { ...phaseDraft }
    if (!normalizedDraft.phaseName.trim()) {
      setStatus({ type: 'danger', text: 'A versenyszakasz neve kötelező.' })
      return
    }
    if (normalizedDraft.phaseStartTime && normalizedDraft.phaseEndTime && normalizedDraft.phaseStartTime > normalizedDraft.phaseEndTime) {
      setStatus({ type: 'danger', text: 'A szakasz kezdete nem lehet később a befejezésnél.' })
      return
    }
    try {
      setSaving(true)
      if (editingPhaseName) {
        await modifyCompetitionPhase(editingPhaseName, normalizedDraft)
        let previousEnd = normalizedDraft.phaseEndTime
        let originalPreviousEnd = toTimeInput(phaseEndOf(scheduledPhases[editingIndex]))
        for (const phase of scheduledPhases.slice(editingIndex + 1)) {
          const originalStart = toTimeInput(phaseStartOf(phase))
          const originalEnd = toTimeInput(phaseEndOf(phase))
          let shiftedStart = originalStart
          let shiftedEnd = originalEnd
          if (previousEnd && originalPreviousEnd && originalStart) {
            const [previousHour, previousMinute] = originalPreviousEnd.split(':').map(Number)
            const [startHour, startMinute] = originalStart.split(':').map(Number)
            const gap = Math.max(0, (startHour * 60 + startMinute) - (previousHour * 60 + previousMinute))
            shiftedStart = shiftTimeByMinutes(previousEnd, gap)
            if (originalEnd) {
              const [endHour, endMinute] = originalEnd.split(':').map(Number)
              const duration = Math.max(0, (endHour * 60 + endMinute) - (startHour * 60 + startMinute))
              shiftedEnd = shiftTimeByMinutes(shiftedStart, duration)
            }
          }
          await modifyCompetitionPhase(phaseNameOf(phase), {
            phaseName: phaseNameOf(phase),
            phaseStartTime: shiftedStart,
            phaseEndTime: shiftedEnd
          })
          previousEnd = shiftedEnd
          originalPreviousEnd = originalEnd
        }
      } else await addCompetitionPhase(normalizedDraft)
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

  const createDefaultPhases = async () => {
    const existingNames = new Set(phases.map(phaseNameOf).map((name) => name.toLocaleLowerCase('hu-HU')))
    const defaults = ['Teszt', 'Csoportkör', 'Szünet', 'Egyenes kiesés'].filter((name) => !existingNames.has(name.toLocaleLowerCase('hu-HU')))
    if (defaults.length === 0) {
      setStatus({ type: 'info', text: 'Az alapértelmezett versenyszakaszok már léteznek.' })
      return
    }
    try {
      setSaving(true)
      for (const phaseName of defaults) await addCompetitionPhase({ phaseName, phaseStartTime: '', phaseEndTime: '' })
      setStatus({ type: 'success', text: 'Az alapértelmezett versenyszakaszok létrejöttek.' })
      await loadData()
    } catch (error) { setStatus({ type: 'danger', text: error.message }) }
    finally { setSaving(false) }
  }

  const activatePhase = async (phaseName) => {
    try {
      setSaving(true)
      await modifySettings({ ...settings, competitionPhase: phaseName })
      setSettings((current) => ({ ...current, competitionPhase: phaseName }))
      setStatus({ type: 'success', text: `Az aktuális versenyszakasz: ${phaseName}.` })
    } catch (error) { setStatus({ type: 'danger', text: error.message }) }
    finally { setSaving(false) }
  }

  const handleDeletePhase = async () => {
    if (!phaseToDelete) return
    const phaseName = phaseNameOf(phaseToDelete)
    const phaseId = phaseIdOf(phaseToDelete)
    if (phaseId === null || phaseId === undefined) {
      setPhaseToDelete(null)
      setStatus({ type: 'danger', text: 'A versenyszakasz azonosítója hiányzik, ezért nem törölhető.' })
      return
    }
    try {
      setSaving(true)
      if (settings.competitionPhase === phaseName) {
        await modifySettings({ ...settings, competitionPhase: '' })
        setSettings((current) => ({ ...current, competitionPhase: '' }))
      }
      await deleteCompetitionPhase(phaseId)
      setPhaseToDelete(null)
      if (editingPhaseName === phaseName) { setEditingPhaseName(null); setPhaseDraft(emptyPhase) }
      setStatus({ type: 'success', text: `A(z) ${phaseName} menetrendi elem törölve.` })
      await loadData()
    } catch (error) { setStatus({ type: 'danger', text: error.message }) }
    finally { setSaving(false) }
  }

  const scheduledPhases = [...phases].sort((left, right) => {
    const leftTime = toTimeInput(phaseStartOf(left)) || '99:99'
    const rightTime = toTimeInput(phaseStartOf(right)) || '99:99'
    return leftTime.localeCompare(rightTime) || phaseNameOf(left).localeCompare(phaseNameOf(right), 'hu')
  })

  const shiftTimeByMinutes = (value, minutes) => {
    const time = toTimeInput(value)
    if (!time) return ''
    const [hours, currentMinutes] = time.split(':').map(Number)
    const shifted = hours * 60 + currentMinutes + minutes
    if (shifted < 0 || shifted >= 24 * 60) throw new Error('A csúsztatás valamelyik időpontot másik napra vinné.')
    return `${String(Math.floor(shifted / 60)).padStart(2, '0')}:${String(shifted % 60).padStart(2, '0')}`
  }

  const applyScheduleShift = async () => {
    const minutes = Number(shiftMinutes)
    if (!Number.isInteger(minutes) || minutes < 0) {
      setConfirmScheduleShift(false)
      setStatus({ type: 'danger', text: 'A csúszás 0 vagy annál nagyobb egész perc legyen.' })
      return
    }
    const activeIndex = scheduledPhases.findIndex((phase) => phaseNameOf(phase) === settings.competitionPhase)
    const firstAffectedIndex = activeIndex >= 0 ? activeIndex : 0
    try {
      setSaving(true)
      const updates = scheduledPhases.slice(firstAffectedIndex).map((phase, relativeIndex) => {
        const isCurrentPhase = activeIndex >= 0 && relativeIndex === 0
        return {
          originalName: phaseNameOf(phase),
          phaseName: phaseNameOf(phase),
          phaseStartTime: isCurrentPhase ? toTimeInput(phaseStartOf(phase)) : shiftTimeByMinutes(phaseStartOf(phase), minutes),
          phaseEndTime: shiftTimeByMinutes(phaseEndOf(phase), minutes)
        }
      })
      for (const update of updates) await modifyCompetitionPhase(update.originalName, update)
      setConfirmScheduleShift(false)
      setShiftMinutes('')
      setStatus({ type: 'success', text: `A menetrend érintett időpontjai ${minutes} perccel későbbre kerültek.` })
      await loadData()
    } catch (error) {
      setConfirmScheduleShift(false)
      setStatus({ type: 'danger', text: error.message })
    } finally { setSaving(false) }
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
            <div className="col-md-6"><label className="form-label" htmlFor="min-sumo-time">Egy teljes szumóforduló minimum ideje</label><div className="input-group"><input id="min-sumo-time" type="number" min="0" step="1" className="form-control" value={settings.minSumoRoundTime} onChange={(event) => updateSettings('minSumoRoundTime', event.target.value)} /><span className="input-group-text">perc</span></div><div className="form-text">Az adott forduló összes mérkőzésének lejátszására szánt minimum idő, egész percben.</div></div>
            <div className="col-md-6"><label className="form-label" htmlFor="max-sumo-time">Egy teljes szumóforduló maximum ideje</label><div className="input-group"><input id="max-sumo-time" type="number" min="0" step="1" className="form-control" value={settings.maxSumoRoundTime} onChange={(event) => updateSettings('maxSumoRoundTime', event.target.value)} /><span className="input-group-text">perc</span></div><div className="form-text">Az adott forduló összes mérkőzésének lejátszására szánt maximum idő, egész percben.</div></div>
            <div className="col-12 text-end"><button className="btn btn-primary" disabled={saving}>Beállítások mentése</button></div>
          </div></div>
        </form>

        <section className="card shadow-sm team-card no-hover-card mb-4">
          <div className="card-body p-4">
            <h3 className="h5 mb-1">Továbbjutók száma</h3>
            <p className="text-muted">A csoportkörből a kieséses szakaszba jutó csapatok száma.</p>
            <div className="row g-3">
              <div className="col-md-4"><label className="form-label" htmlFor="advance-all">Továbbjutók – korosztálybontás nélkül</label><input id="advance-all" type="number" min="0" step="1" className="form-control" value={settings.allGroupAdvance} onChange={(event) => updateSettings('allGroupAdvance', event.target.value)} /></div>
              <div className="col-md-4"><label className="form-label" htmlFor="advance-primary">Továbbjutók – általános iskolás</label><input id="advance-primary" type="number" min="0" step="1" className="form-control" value={settings.psGroupAdvance} onChange={(event) => updateSettings('psGroupAdvance', event.target.value)} /></div>
              <div className="col-md-4"><label className="form-label" htmlFor="advance-secondary">Továbbjutók – középiskolás</label><input id="advance-secondary" type="number" min="0" step="1" className="form-control" value={settings.hsGroupAdvance} onChange={(event) => updateSettings('hsGroupAdvance', event.target.value)} /></div>
              <div className="col-12"><div className="form-text">Ugyanezeket a létszámokat használja a vonalkövetés és a szumó csoportköre.</div></div>
              <div className="col-12 text-end"><button type="button" className="btn btn-primary" disabled={saving} onClick={async () => { try { setSaving(true); await modifySettings(settings); setStatus({ type: 'success', text: 'A továbbjutási beállítások mentve.' }); await loadData() } catch (error) { setStatus({ type: 'danger', text: error.message }) } finally { setSaving(false) } }}>Továbbjutási beállítások mentése</button></div>
            </div>
          </div>
        </section>

        <section className="card shadow-sm team-card no-hover-card mb-4"><div className="card-body p-4"><div className="d-flex flex-wrap justify-content-between align-items-center gap-3"><div><h3 className="h5 mb-1">Versenymenetrend</h3><p className="text-muted mb-0">A menetrend menet közben is bővíthető és módosítható. Bármilyen szakasz megadható.</p></div><button type="button" className="btn btn-outline-primary" disabled={saving} onClick={createDefaultPhases}>Alap menetrend létrehozása</button></div><div className="mt-3"><span className="me-2">Most zajlik:</span><span className={`badge ${settings.competitionPhase ? 'text-bg-success' : 'text-bg-secondary'}`}>{settings.competitionPhase || 'Nincs kiválasztva'}</span></div><div className="schedule-shift-panel mt-4"><div><div className="fw-semibold">Menetrend csúsztatása</div><div className="small text-muted">Az aktuális szakasz befejezését és minden későbbi időpontot egyszerre tolja el.</div></div><div className="input-group schedule-shift-control"><input type="number" min="0" step="1" className="form-control" aria-label="Csúszás percekben" placeholder="pl. 15" value={shiftMinutes} onChange={(event) => setShiftMinutes(event.target.value)} /><span className="input-group-text">perc</span><button type="button" className="btn btn-warning" disabled={saving || shiftMinutes === ''} onClick={() => setConfirmScheduleShift(true)}>Hozzáadás</button></div></div></div></section>

        <form className="card shadow-sm team-card no-hover-card mb-4" onSubmit={savePhase}>
          <div className="card-body p-4"><div className="d-flex justify-content-between mb-3"><h3 className="h5 mb-0">{editingPhaseName ? 'Menetrendi elem módosítása' : 'Új menetrendi elem'}</h3>{editingPhaseName && <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => { setEditingPhaseName(null); setPhaseDraft(emptyPhase) }}>Mégse</button>}</div><div className="row g-3">
            <div className="col-md-4"><label className="form-label" htmlFor="phase-name">Megnevezés</label><input id="phase-name" className="form-control" placeholder="pl. Teszt, Csoportkör, Ebédszünet" value={phaseDraft.phaseName} onChange={(event) => updatePhase('phaseName', event.target.value)} /></div>
            <div className="col-md-3"><label className="form-label" htmlFor="phase-start">Kezdés</label><input id="phase-start" type="time" step="60" className="form-control" value={phaseDraft.phaseStartTime} onChange={(event) => updatePhase('phaseStartTime', event.target.value)} /></div>
            <div className="col-md-3"><label className="form-label" htmlFor="phase-end">Befejezés</label><input id="phase-end" type="time" step="60" className="form-control" value={phaseDraft.phaseEndTime} onChange={(event) => updatePhase('phaseEndTime', event.target.value)} /></div>
            <div className="col-md-2 d-flex align-items-end"><button className="btn btn-primary w-100" disabled={saving}>{editingPhaseName ? 'Módosítás' : 'Hozzáadás'}</button></div>
          </div><div className="form-text mt-2">Csak az óra és perc kerül mentésre, dátum nélkül.</div></div>
        </form>

        {scheduledPhases.length > 0 ? <section className="competition-schedule mb-4">{scheduledPhases.map((phase) => { const name = phaseNameOf(phase); const active = settings.competitionPhase === name; const start = toTimeInput(phaseStartOf(phase)); const end = toTimeInput(phaseEndOf(phase)); return <article className={`competition-schedule-item ${active ? 'active' : ''}`} key={phaseIdOf(phase) ?? name}><div className="competition-schedule-time"><i className="bi bi-clock" /><span>{start || 'Nincs kezdés'}{(start || end) && ' – '}{end || (start ? 'nincs befejezés' : '')}</span></div><div className="competition-schedule-content"><h4 className="h5 mb-0">{name}</h4>{active && <span className="badge text-bg-success">Most zajlik</span>}</div><div className="competition-schedule-actions"><button type="button" className="btn btn-outline-primary btn-sm" onClick={() => editPhase(phase)}>Módosítás</button>{!active && <button type="button" className="btn btn-success btn-sm" disabled={saving} onClick={() => activatePhase(name)}>Aktiválás</button>}<button type="button" className="btn btn-outline-danger btn-sm" disabled={saving} onClick={() => setPhaseToDelete(phase)}>Törlés</button></div></article> })}</section> : <div className="alert alert-warning mb-4">Még nincs menetrendi elem. Hozd létre az alap menetrendet, vagy adj hozzá egyedi elemet.</div>}

        <CompetitionStatistics onStatus={setStatus} />
        <TeamGroupManager />
        <BackupManager onStatus={setStatus} onSettingsRestored={loadData} />
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
      <ConfirmModal open={confirmScheduleShift} title="Menetrend csúsztatása" confirmLabel="Időpontok eltolása" confirmVariant="warning" busy={saving} onClose={() => setConfirmScheduleShift(false)} onConfirm={applyScheduleShift}>
        <p>Biztosan hozzáadsz <strong>{shiftMinutes || 0} percet</strong> az aktuális szakasz befejezéséhez és minden utána következő időponthoz?</p>
        <p className="small text-muted mb-0">A korábban befejezett szakaszok és az aktuális szakasz kezdési ideje nem változik.</p>
      </ConfirmModal>
      <ConfirmModal open={Boolean(phaseToDelete)} title="Menetrendi elem törlése" confirmLabel="Végleges törlés" confirmVariant="danger" busy={saving} onClose={() => setPhaseToDelete(null)} onConfirm={handleDeletePhase}>
        <p className="mb-2">Biztosan törlöd ezt a menetrendi elemet?</p><strong>{phaseNameOf(phaseToDelete || {})}</strong>
        {settings.competitionPhase === phaseNameOf(phaseToDelete || {}) && <p className="small text-danger mt-2 mb-0">Ez az aktuális szakasz. Törléskor az aktuális kijelölés is megszűnik.</p>}
      </ConfirmModal>
    </div>
  )
}
