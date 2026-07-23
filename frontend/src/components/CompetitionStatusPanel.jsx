import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { getAllCompetitionPhases, getAllSettings, SUMO_CONFIG_CHANGED_EVENT } from '../services/sumoScheduleConfigApi'

const phaseNameOf = (phase) => phase?.phaseName || phase?.competitionPhaseName || phase?.name || ''
const startOf = (phase) => phase?.phaseStartTime ?? phase?.startTime ?? phase?.start ?? null
const endOf = (phase) => phase?.phaseEndTime ?? phase?.endTime ?? phase?.end ?? null

const timeParts = (value) => {
  if (!value) return null
  const match = String(value).match(/(?:T|\s|^)(\d{1,2}):(\d{2})(?::(\d{2}))?/)
  return match ? { hours: Number(match[1]), minutes: Number(match[2]), seconds: Number(match[3] || 0) } : null
}

const todayAt = (value, now) => {
  const parts = timeParts(value)
  if (!parts) return null
  const date = new Date(now)
  date.setHours(parts.hours, parts.minutes, parts.seconds, 0)
  return date
}

const timeLabel = (value) => {
  const parts = timeParts(value)
  return parts ? `${String(parts.hours).padStart(2, '0')}:${String(parts.minutes).padStart(2, '0')}` : 'nincs megadva'
}

const countdownLabel = (milliseconds) => {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}

export default function CompetitionStatusPanel() {
  const [settings, setSettings] = useState(null)
  const [phases, setPhases] = useState([])
  const [now, setNow] = useState(() => new Date())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setError('')
      const [settingsData, phasesData] = await Promise.all([getAllSettings(), getAllCompetitionPhases()])
      setSettings(settingsData)
      setPhases(Array.isArray(phasesData) ? phasesData : [])
    } catch (requestError) {
      setError(requestError.message || 'Nem sikerült betölteni a verseny állapotát.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    window.addEventListener(SUMO_CONFIG_CHANGED_EVENT, load)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener(SUMO_CONFIG_CHANGED_EVENT, load)
    }
  }, [load])

  const status = useMemo(() => {
    const configuredPhase = settings?.competitionPhase
    const configuredName = typeof configuredPhase === 'string' ? configuredPhase : phaseNameOf(configuredPhase)
    const configuredId = settings?.competitionPhaseId ?? configuredPhase?.id
    const ordered = [...phases].sort((left, right) =>
      (todayAt(startOf(left), now)?.getTime() ?? Number.MAX_SAFE_INTEGER)
      - (todayAt(startOf(right), now)?.getTime() ?? Number.MAX_SAFE_INTEGER))
    const active = ordered.find((phase) =>
      (configuredId != null && String(phase.id) === String(configuredId))
      || (configuredName && phaseNameOf(phase).toLocaleLowerCase('hu') === configuredName.toLocaleLowerCase('hu'))
    ) || (configuredName ? { phaseName: configuredName } : null)

    if (!active) return { active: null, next: ordered[0] || null, mode: 'none', progress: 0 }

    const start = todayAt(startOf(active), now)
    const end = todayAt(endOf(active), now)
    let mode = 'untimed'
    let remaining = null
    let progress = 0
    if (start && now < start) {
      mode = 'before'
      remaining = start - now
    } else if (end && now < end) {
      mode = 'active'
      remaining = end - now
      if (start && end > start) progress = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100))
    } else if (end) {
      mode = 'ended'
      progress = 100
    } else if (start) {
      mode = 'active'
    }
    const activeIndex = ordered.findIndex((phase) =>
      (active.id != null && String(phase.id) === String(active.id)) || phaseNameOf(phase) === phaseNameOf(active))
    return { active, next: activeIndex >= 0 ? ordered[activeIndex + 1] || null : null, mode, remaining, progress }
  }, [now, phases, settings])

  if (loading) return <div className="competition-status-panel competition-status-loading">Versenyállapot betöltése…</div>
  if (error) return <div className="competition-status-panel competition-status-error">{error}</div>

  const modeText = {
    none: 'Nincs aktív versenyszakasz',
    before: 'A szakasz hamarosan kezdődik',
    active: 'A szakasz folyamatban van',
    ended: 'A szakasz befejeződött',
    untimed: 'Aktív versenyszakasz'
  }[status.mode]

  return (
    <section className="competition-status-panel mb-4" aria-live="polite">
      <div className="competition-status-main">
        <div>
          <div className="competition-status-kicker">Verseny állapota</div>
          <h3>{status.active ? phaseNameOf(status.active) : 'Még nincs kiválasztott szakasz'}</h3>
          <span className={`competition-status-badge status-${status.mode}`}>{modeText}</span>
        </div>
        {status.remaining != null ? (
          <div className="competition-countdown">
            <span>{status.mode === 'before' ? 'Kezdésig hátralévő idő' : 'A szakaszból hátralévő idő'}</span>
            <strong>{countdownLabel(status.remaining)}</strong>
          </div>
        ) : (
          <div className="competition-countdown">
            <span>Időzítés</span>
            <strong className="competition-countdown-text">
              {status.active && !endOf(status.active) ? 'Nincs befejezés megadva' : modeText}
            </strong>
          </div>
        )}
      </div>

      {status.active && startOf(status.active) && endOf(status.active) && (
        <div className="competition-progress" role="progressbar" aria-valuenow={Math.round(status.progress)} aria-valuemin="0" aria-valuemax="100">
          <span style={{ width: `${status.progress}%` }} />
        </div>
      )}

      <div className="competition-status-grid">
        <div><span>{status.active ? `${phaseNameOf(status.active)} időpontja` : 'Szakasz időpontja'}</span><strong>{status.active ? `${timeLabel(startOf(status.active))}–${timeLabel(endOf(status.active))}` : '–'}</strong></div>
        <div><span>Következő szakasz</span><strong>{status.next ? `${phaseNameOf(status.next)} · ${timeLabel(startOf(status.next))}` : 'Nincs további szakasz'}</strong></div>
        <div><span>Korosztálybontás</span><strong>{Number(settings?.ageGroupBreakdown) === 1 ? 'Bekapcsolva' : 'Kikapcsolva'}</strong></div>
        <div>
          <span>Szumóforduló időkerete</span>
          <strong>{settings?.minSumoRoundTime == null && settings?.maxSumoRoundTime == null
            ? 'Nincs megadva'
            : `${settings?.minSumoRoundTime ?? '–'}–${settings?.maxSumoRoundTime ?? '–'} perc`}</strong>
        </div>
      </div>
    </section>
  )
}
