import { useEffect } from 'react'
import {
  getAllCompetitionPhases,
  getAllSettings,
  modifySettings
} from '../services/sumoScheduleConfigApi'

const phaseNameOf = (phase) => phase?.phaseName || phase?.competitionPhaseName || phase?.name || ''
const phaseEndOf = (phase) => phase?.phaseEndTime ?? phase?.endTime ?? phase?.end ?? null

const todayAt = (value) => {
  if (!value) return null
  const match = String(value).match(/(?:T|\s|^)(\d{1,2}):(\d{2})(?::(\d{2}))?/)
  if (!match) return null
  const date = new Date()
  date.setHours(Number(match[1]), Number(match[2]), Number(match[3] || 0), 0)
  return date
}

export default function AutomaticPhaseAdvancer({ enabled }) {
  useEffect(() => {
    if (!enabled) return undefined

    let stopped = false
    let checking = false

    const checkPhase = async () => {
      if (checking || stopped) return
      checking = true
      try {
        const [settings, phases] = await Promise.all([getAllSettings(), getAllCompetitionPhases()])
        if (stopped || !settings || !Array.isArray(phases) || phases.length < 2) return

        const configuredPhase = settings.competitionPhase
        const configuredName = typeof configuredPhase === 'string'
          ? configuredPhase
          : phaseNameOf(configuredPhase)
        const configuredId = settings.competitionPhaseId ?? configuredPhase?.id
        const ordered = [...phases].sort((left, right) =>
          (todayAt(left.phaseStartTime ?? left.startTime ?? left.start)?.getTime() ?? Number.MAX_SAFE_INTEGER)
          - (todayAt(right.phaseStartTime ?? right.startTime ?? right.start)?.getTime() ?? Number.MAX_SAFE_INTEGER))
        const activeIndex = ordered.findIndex((phase) =>
          (configuredId != null && String(phase.id) === String(configuredId))
          || (configuredName && phaseNameOf(phase).toLocaleLowerCase('hu-HU') === configuredName.toLocaleLowerCase('hu-HU')))
        if (activeIndex < 0 || activeIndex >= ordered.length - 1) return

        const activeEnd = todayAt(phaseEndOf(ordered[activeIndex]))
        if (!activeEnd || Date.now() < activeEnd.getTime()) return

        const nextName = phaseNameOf(ordered[activeIndex + 1])
        if (nextName) await modifySettings({ ...settings, competitionPhase: nextName })
      } catch (error) {
        console.warn('Az automatikus versenyszakasz-váltás nem sikerült:', error.message)
      } finally {
        checking = false
      }
    }

    checkPhase()
    const interval = window.setInterval(checkPhase, 15000)
    return () => {
      stopped = true
      window.clearInterval(interval)
    }
  }, [enabled])

  return null
}
