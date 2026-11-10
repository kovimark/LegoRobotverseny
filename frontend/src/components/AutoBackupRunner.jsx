import { useEffect, useRef } from 'react'
import {
  AUTO_BACKUP_CONFIG_CHANGED_EVENT,
  exportScoresBackup,
  exportSettingsBackup,
  exportTeamsBackup,
  exportStaffBackup,
  getAutoBackupConfig
} from '../services/backupApi'

export default function AutoBackupRunner({ enabled = false }) {
  const isRunningRef = useRef({ scores: false, settings: false, teams: false, staff: false })

  useEffect(() => {
    if (!enabled) return undefined

    const checkAndRunBackups = async () => {
      const now = Date.now()

      // 1. Check scores backup
      const scoresConfig = getAutoBackupConfig('scores')
      if (scoresConfig.enabled && !isRunningRef.current.scores) {
        const intervalMs = Math.max(1, scoresConfig.intervalMinutes) * 60 * 1000
        const lastRunTime = scoresConfig.lastRun ? new Date(scoresConfig.lastRun).getTime() : 0
        const isOverdue = !lastRunTime || (now - lastRunTime >= intervalMs)

        if (isOverdue) {
          isRunningRef.current.scores = true
          try {
            await exportScoresBackup({ isAuto: true })
          } catch (err) {
            console.warn('Automatikus pontmentési hiba:', err)
          } finally {
            isRunningRef.current.scores = false
          }
        }
      }

      // 2. Check settings backup
      const settingsConfig = getAutoBackupConfig('settings')
      if (settingsConfig.enabled && !isRunningRef.current.settings) {
        const intervalMs = Math.max(1, settingsConfig.intervalMinutes) * 60 * 1000
        const lastRunTime = settingsConfig.lastRun ? new Date(settingsConfig.lastRun).getTime() : 0
        const isOverdue = !lastRunTime || (now - lastRunTime >= intervalMs)

        if (isOverdue) {
          isRunningRef.current.settings = true
          try {
            await exportSettingsBackup({ isAuto: true })
          } catch (err) {
            console.warn('Automatikus beállításmentési hiba:', err)
          } finally {
            isRunningRef.current.settings = false
          }
        }
      }

      // 3. Check teams backup
      const teamsConfig = getAutoBackupConfig('teams')
      if (teamsConfig.enabled && !isRunningRef.current.teams) {
        const intervalMs = Math.max(1, teamsConfig.intervalMinutes) * 60 * 1000
        const lastRunTime = teamsConfig.lastRun ? new Date(teamsConfig.lastRun).getTime() : 0
        const isOverdue = !lastRunTime || (now - lastRunTime >= intervalMs)

        if (isOverdue) {
          isRunningRef.current.teams = true
          try {
            await exportTeamsBackup({ isAuto: true })
          } catch (err) {
            console.warn('Automatikus csapatmentési hiba:', err)
          } finally {
            isRunningRef.current.teams = false
          }
        }
      }

      // 4. Check staff backup
      const staffConfig = getAutoBackupConfig('staff')
      if (staffConfig.enabled && !isRunningRef.current.staff) {
        const intervalMs = Math.max(1, staffConfig.intervalMinutes) * 60 * 1000
        const lastRunTime = staffConfig.lastRun ? new Date(staffConfig.lastRun).getTime() : 0
        const isOverdue = !lastRunTime || (now - lastRunTime >= intervalMs)

        if (isOverdue) {
          isRunningRef.current.staff = true
          try {
            await exportStaffBackup({ isAuto: true })
          } catch (err) {
            console.warn('Automatikus stábmentési hiba:', err)
          } finally {
            isRunningRef.current.staff = false
          }
        }
      }
    }

    // Check on startup after 5 seconds, then every 15 seconds
    const startupTimer = setTimeout(checkAndRunBackups, 5000)
    const intervalTimer = setInterval(checkAndRunBackups, 15000)

    const handleConfigChange = () => {
      checkAndRunBackups()
    }
    window.addEventListener(AUTO_BACKUP_CONFIG_CHANGED_EVENT, handleConfigChange)

    return () => {
      clearTimeout(startupTimer)
      clearInterval(intervalTimer)
      window.removeEventListener(AUTO_BACKUP_CONFIG_CHANGED_EVENT, handleConfigChange)
    }
  }, [enabled])

  return null
}
