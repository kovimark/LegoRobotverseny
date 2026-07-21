import React, { useEffect, useMemo, useState } from 'react'
import { defaultSumoScheduleConfig, loadSumoScheduleConfig, saveSumoScheduleConfig } from '../services/sumoScheduleConfigApi'

export default function SumoScheduleSettings() {
  const [configuration, setConfiguration] = useState(defaultSumoScheduleConfig)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    loadSumoScheduleConfig()
      .then(setConfiguration)
      .catch(() => setMessage({ type: 'danger', text: 'A beállítások betöltése nem sikerült.' }))
      .finally(() => setLoading(false))
  }, [])

  const expectedRounds = useMemo(() => {
    const duration = Number(configuration.plannedDurationMinutes)
    const roundTime = Number(configuration.expectedRoundMinutes)
    if (!duration || !roundTime) return 0
    return Math.max(Number(configuration.minimumRounds) || 0, Math.floor(duration / roundTime))
  }, [configuration])

  const updateField = (name, value) => setConfiguration((current) => ({ ...current, [name]: value }))

  const updateSlot = (slotId, field, value) => setConfiguration((current) => ({
    ...current,
    timeSlots: current.timeSlots.map((slot) => slot.id === slotId
      ? { ...slot, [field]: value, ...(field === 'type' && value === 'open' ? { category: null } : {}) }
      : slot)
  }))

  const addSlot = () => setConfiguration((current) => ({
    ...current,
    timeSlots: [...current.timeSlots, {
      id: `slot-${Date.now()}`,
      type: 'category',
      category: 0,
      startTime: '',
      endTime: ''
    }]
  }))

  const removeSlot = (slotId) => setConfiguration((current) => ({
    ...current,
    timeSlots: current.timeSlots.filter((slot) => slot.id !== slotId)
  }))

  const handleSave = async () => {
    if (Number(configuration.minimumRounds) < 1 || Number(configuration.expectedRoundMinutes) < 1 || Number(configuration.plannedDurationMinutes) < 1) {
      setMessage({ type: 'danger', text: 'A minimum forduló, a várható fordulóidő és a tervezett idő legalább 1 legyen.' })
      return
    }

    try {
      setSaving(true)
      await saveSumoScheduleConfig({
        ...configuration,
        minimumRounds: Number(configuration.minimumRounds),
        expectedRoundMinutes: Number(configuration.expectedRoundMinutes),
        plannedDurationMinutes: Number(configuration.plannedDurationMinutes)
      })
      setMessage({ type: 'success', text: 'A szumó időbeosztás piszkozata elmentve ebben a böngészőben.' })
    } catch (error) {
      setMessage({ type: 'danger', text: 'A beállítások mentése nem sikerült.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="card shadow-sm team-card no-hover-card mb-4">
      <div className="card-body p-3 p-md-4">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-4">
          <div>
            <div className="home-kicker">Backendre előkészített piszkozat</div>
            <h3 className="h4 mb-1">Szumó idő- és fordulóbeállítások</h3>
            <p className="text-muted mb-0">Nincs maximum fordulószám: a rendelkezésre álló idő alatt annyi teljes forduló megy le, amennyi belefér.</p>
          </div>
          <span className="badge text-bg-warning">Helyi mentés</span>
        </div>

        {message && <div className={`alert alert-${message.type}`} role="status">{message.text}</div>}
        {loading ? <div className="alert alert-info">Beállítások betöltése...</div> : (
          <>
            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <label className="form-label fw-semibold" htmlFor="sumo-minimum-rounds">Garantált minimum forduló</label>
                <input id="sumo-minimum-rounds" type="number" min="1" className="form-control" value={configuration.minimumRounds} onChange={(event) => updateField('minimumRounds', event.target.value)} />
                <div className="form-text">Ennyi forduló biztosan lemegy.</div>
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold" htmlFor="sumo-expected-round-time">Egy forduló várható ideje</label>
                <div className="input-group">
                  <input id="sumo-expected-round-time" type="number" min="1" className="form-control" value={configuration.expectedRoundMinutes} onChange={(event) => updateField('expectedRoundMinutes', event.target.value)} />
                  <span className="input-group-text">perc</span>
                </div>
                <div className="form-text">Csak tervezési becslés, nem időkorlát.</div>
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold" htmlFor="sumo-planned-duration">Tervezett teljes játékidő</label>
                <div className="input-group">
                  <input id="sumo-planned-duration" type="number" min="1" className="form-control" value={configuration.plannedDurationMinutes} onChange={(event) => updateField('plannedDurationMinutes', event.target.value)} />
                  <span className="input-group-text">perc</span>
                </div>
                <div className="form-text">Várhatóan legalább {expectedRounds} forduló fér bele.</div>
              </div>
            </div>

            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <div>
                <h4 className="h5 mb-1">Korosztályos és nyílt idősávok</h4>
                <p className="text-muted small mb-0">A korosztályos sávban csak a kijelölt kategória, a nyílt sávban mindkét korosztály játszhat.</p>
              </div>
              <button type="button" className="btn btn-outline-primary btn-sm" onClick={addSlot}>+ Idősáv hozzáadása</button>
            </div>

            <div className="d-flex flex-column gap-3">
              {configuration.timeSlots.map((slot, index) => (
                <div className="team-info-box" key={slot.id}>
                  <div className="row g-3 align-items-end">
                    <div className="col-md-3">
                      <label className="form-label" htmlFor={`slot-type-${slot.id}`}>{index + 1}. idősáv típusa</label>
                      <select id={`slot-type-${slot.id}`} className="form-select" value={slot.type} onChange={(event) => updateSlot(slot.id, 'type', event.target.value)}>
                        <option value="category">Csak kijelölt korosztály</option>
                        <option value="open">Nyílt – mindkét korosztály</option>
                      </select>
                    </div>
                    <div className="col-md-2">
                      <label className="form-label" htmlFor={`slot-category-${slot.id}`}>Korosztály</label>
                      <select id={`slot-category-${slot.id}`} className="form-select" value={slot.category ?? ''} disabled={slot.type === 'open'} onChange={(event) => updateSlot(slot.id, 'category', Number(event.target.value))}>
                        <option value="0">Általános iskola (1–8.)</option>
                        <option value="1">Középiskola (9–13.)</option>
                      </select>
                    </div>
                    <div className="col-md-2">
                      <label className="form-label" htmlFor={`slot-start-${slot.id}`}>Kezdés</label>
                      <input id={`slot-start-${slot.id}`} type="time" className="form-control" value={slot.startTime} onChange={(event) => updateSlot(slot.id, 'startTime', event.target.value)} />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label" htmlFor={`slot-end-${slot.id}`}>Befejezés</label>
                      <input id={`slot-end-${slot.id}`} type="time" className="form-control" value={slot.endTime} onChange={(event) => updateSlot(slot.id, 'endTime', event.target.value)} />
                    </div>
                    <div className="col-md-3 d-flex justify-content-end">
                      <button type="button" className="btn btn-outline-danger" onClick={() => removeSlot(slot.id)}>Idősáv törlése</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-4">
              <div className="small text-muted">A mentés most localStorage-t használ; az API-adapter később egy helyen cserélhető.</div>
              <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Mentés...' : 'Beállítások mentése'}</button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
