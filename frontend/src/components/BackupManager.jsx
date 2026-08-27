import React, { useEffect, useRef, useState } from 'react'
import ConfirmModal from './ConfirmModal'
import {
  AUTO_BACKUP_CONFIG_CHANGED_EVENT,
  AUTO_BACKUP_TRIGGERED_EVENT,
  exportScoresBackup,
  exportSettingsBackup,
  getAutoBackupConfig,
  readBackupFile,
  restoreScoresBackup,
  restoreSettingsBackup,
  saveAutoBackupConfig
} from '../services/backupApi'

export default function BackupManager({ onStatus, onSettingsRestored }) {
  const settingsInputRef = useRef(null)
  const scoresInputRef = useRef(null)
  const [pendingRestore, setPendingRestore] = useState(null)
  const [busy, setBusy] = useState(false)

  // Auto-backup states
  const [scoresConfig, setScoresConfig] = useState(() => getAutoBackupConfig('scores'))
  const [settingsConfig, setSettingsConfig] = useState(() => getAutoBackupConfig('settings'))
  const [, setTick] = useState(0)

  // Re-read configurations and listen to changes
  useEffect(() => {
    const handleConfigChange = () => {
      setScoresConfig(getAutoBackupConfig('scores'))
      setSettingsConfig(getAutoBackupConfig('settings'))
    }
    window.addEventListener(AUTO_BACKUP_CONFIG_CHANGED_EVENT, handleConfigChange)
    window.addEventListener(AUTO_BACKUP_TRIGGERED_EVENT, handleConfigChange)

    // Tick every 5 seconds to update countdowns
    const timer = setInterval(() => {
      setTick((t) => t + 1)
    }, 5000)

    return () => {
      window.removeEventListener(AUTO_BACKUP_CONFIG_CHANGED_EVENT, handleConfigChange)
      window.removeEventListener(AUTO_BACKUP_TRIGGERED_EVENT, handleConfigChange)
      clearInterval(timer)
    }
  }, [])

  const handleToggleAuto = (kind) => {
    if (kind === 'scores') {
      const updated = saveAutoBackupConfig('scores', { enabled: !scoresConfig.enabled })
      setScoresConfig(updated)
      onStatus?.({
        type: 'info',
        text: updated.enabled
          ? `Automatikus pontmentés bekapcsolva (${updated.intervalMinutes} percenként).`
          : 'Automatikus pontmentés kikapcsolva.'
      })
    } else {
      const updated = saveAutoBackupConfig('settings', { enabled: !settingsConfig.enabled })
      setSettingsConfig(updated)
      onStatus?.({
        type: 'info',
        text: updated.enabled
          ? `Automatikus beállításmentés bekapcsolva (${updated.intervalMinutes} percenként).`
          : 'Automatikus beállításmentés kikapcsolva.'
      })
    }
  }

  const handleIntervalChange = (kind, minutes) => {
    const val = Math.max(1, parseInt(minutes, 10) || 1)
    if (kind === 'scores') {
      const updated = saveAutoBackupConfig('scores', { intervalMinutes: val })
      setScoresConfig(updated)
    } else {
      const updated = saveAutoBackupConfig('settings', { intervalMinutes: val })
      setSettingsConfig(updated)
    }
  }

  const getNextRunText = (config) => {
    if (!config.enabled) return 'Nincs bekapcsolva'
    if (!config.lastRun) return 'Következő ciklusban (hamarosan)'

    const lastTime = new Date(config.lastRun).getTime()
    const nextTime = lastTime + config.intervalMinutes * 60 * 1000
    const remainingMs = nextTime - Date.now()

    if (remainingMs <= 0) return 'Hamarosan letöltődik…'

    const remainingMinutes = Math.ceil(remainingMs / 60000)
    const nextDate = new Date(nextTime)
    const timeFormatted = nextDate.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })
    return `${timeFormatted} (${remainingMinutes} perc múlva)`
  }

  const getLastRunText = (config) => {
    if (!config.lastRun) return 'Még nem volt mentés ebben a munkamenetben'
    return new Date(config.lastRun).toLocaleTimeString('hu-HU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const runExport = async (kind) => {
    try {
      setBusy(true)
      if (kind === 'settings') {
        await exportSettingsBackup()
        onStatus?.({ type: 'success', text: 'A beállítások biztonsági mentése letöltve.' })
      } else {
        await exportScoresBackup()
        onStatus?.({ type: 'success', text: 'A pontok és eredmények biztonsági mentése letöltve.' })
      }
    } catch (error) {
      onStatus?.({ type: 'danger', text: error.message })
    } finally {
      setBusy(false)
    }
  }

  const selectFile = async (kind, event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const backup = await readBackupFile(file)
      const expectedFormat = kind === 'settings' ? 'robotverseny-settings-backup' : 'robotverseny-scores-backup'
      if (backup.format !== expectedFormat) {
        throw new Error('Nem a kiválasztott mentéstípushoz tartozó fájlt adtad meg.')
      }
      setPendingRestore({ kind, backup, fileName: file.name })
    } catch (error) {
      onStatus?.({ type: 'danger', text: error.message })
    }
  }

  const restore = async () => {
    if (!pendingRestore) return
    try {
      setBusy(true)
      if (pendingRestore.kind === 'settings') {
        await restoreSettingsBackup(pendingRestore.backup)
        await onSettingsRestored?.()
      } else {
        await restoreScoresBackup(pendingRestore.backup)
      }
      onStatus?.({
        type: 'success',
        text: `${pendingRestore.kind === 'settings' ? 'A beállítások' : 'A pontok és eredmények'} visszaállítása befejeződött.`
      })
      setPendingRestore(null)
    } catch (error) {
      onStatus?.({ type: 'danger', text: error.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card shadow-sm team-card no-hover-card mb-4" aria-label="Biztonsági mentések kezelése">
      <div className="card-body p-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <h3 className="h5 mb-1 d-flex align-items-center gap-2">
              <i className="bi bi-shield-check text-primary" aria-hidden="true" />
              Biztonsági mentések és automatizálás
            </h3>
            <p className="text-muted small mb-0">
              Automatikus letöltések beállítása és manuális biztonsági mentések kezelése két külön kategóriában.
            </p>
          </div>
        </div>

        <div className="row g-4">
          {/* 1. Pontok és versenyeredmények */}
          <div className="col-lg-6">
            <div className="card h-100 border rounded-3 p-3 shadow-sm bg-light-subtle">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <h4 className="h6 fw-bold mb-1 d-flex align-items-center gap-2 text-primary">
                    <i className="bi bi-trophy-fill text-warning" />
                    Pontok és versenyeredmények
                  </h4>
                  <p className="text-muted small mb-0">
                    Összesített pontok, kosárlabda kísérletek, szumó meccsek, vonalkövetés, hegymászás, holtversenyek és csapatok adatai.
                  </p>
                </div>
              </div>

              <hr className="my-2" />

              {/* Automatikus mentés beállításai */}
              <div className="bg-white border rounded-3 p-3 mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-semibold small">Automatikus letöltés:</span>
                  <div className="form-check form-switch mb-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id="autoBackupScoresToggle"
                      checked={scoresConfig.enabled}
                      onChange={() => handleToggleAuto('scores')}
                    />
                    <label className="form-check-label small fw-bold" htmlFor="autoBackupScoresToggle">
                      {scoresConfig.enabled ? (
                        <span className="text-success">Bekapcsolva</span>
                      ) : (
                        <span className="text-muted">Kikapcsolva</span>
                      )}
                    </label>
                  </div>
                </div>

                <div className="mb-2">
                  <label className="form-label small text-muted mb-1" htmlFor="scoresIntervalInput">
                    Letöltési időköz (percben):
                  </label>
                  <div className="input-group input-group-sm">
                    <input
                      id="scoresIntervalInput"
                      type="number"
                      min="1"
                      max="1440"
                      className="form-control"
                      value={scoresConfig.intervalMinutes}
                      onChange={(e) => handleIntervalChange('scores', e.target.value)}
                    />
                    <span className="input-group-text">perc</span>
                  </div>

                  {/* Gyorsválasztó gombok */}
                  <div className="d-flex gap-1 mt-2">
                    {[3, 5, 10, 15, 30].map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`btn btn-xs btn-sm py-0 px-2 ${scoresConfig.intervalMinutes === m ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => handleIntervalChange('scores', m)}
                      >
                        {m}p
                      </button>
                    ))}
                  </div>
                </div>

                <div className="small text-muted border-top pt-2 mt-2">
                  <div>
                    <i className="bi bi-clock-history me-1" />
                    <strong>Utolsó letöltés:</strong> {getLastRunText(scoresConfig)}
                  </div>
                  <div>
                    <i className="bi bi-hourglass-split me-1" />
                    <strong>Következő:</strong> {getNextRunText(scoresConfig)}
                  </div>
                </div>
              </div>

              {/* Manuális gombok */}
              <div className="d-flex flex-wrap gap-2 mt-auto">
                <button
                  type="button"
                  className="btn btn-primary btn-sm fw-semibold"
                  disabled={busy}
                  onClick={() => runExport('scores')}
                >
                  <i className="bi bi-download me-1" />
                  Mentés letöltése most
                </button>
                <button
                  type="button"
                  className="btn btn-outline-success btn-sm"
                  disabled={busy}
                  onClick={() => scoresInputRef.current?.click()}
                >
                  <i className="bi bi-upload me-1" />
                  Feltöltés / Visszaállítás
                </button>
                <input
                  ref={scoresInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="d-none"
                  onChange={(event) => selectFile('scores', event)}
                />
              </div>
            </div>
          </div>

          {/* 2. Beállítások és menetrend */}
          <div className="col-lg-6">
            <div className="card h-100 border rounded-3 p-3 shadow-sm bg-light-subtle">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <h4 className="h6 fw-bold mb-1 d-flex align-items-center gap-2 text-primary">
                    <i className="bi bi-gear-fill text-primary" />
                    Beállítások és menetrend
                  </h4>
                  <p className="text-muted small mb-0">
                    Szabályok, korcsoportbontás, szumó meccsidők, versenyszakaszok/időrend, csoportbeosztások, hírek és kategóriák.
                  </p>
                </div>
              </div>

              <hr className="my-2" />

              {/* Automatikus mentés beállításai */}
              <div className="bg-white border rounded-3 p-3 mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-semibold small">Automatikus letöltés:</span>
                  <div className="form-check form-switch mb-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id="autoBackupSettingsToggle"
                      checked={settingsConfig.enabled}
                      onChange={() => handleToggleAuto('settings')}
                    />
                    <label className="form-check-label small fw-bold" htmlFor="autoBackupSettingsToggle">
                      {settingsConfig.enabled ? (
                        <span className="text-success">Bekapcsolva</span>
                      ) : (
                        <span className="text-muted">Kikapcsolva</span>
                      )}
                    </label>
                  </div>
                </div>

                <div className="mb-2">
                  <label className="form-label small text-muted mb-1" htmlFor="settingsIntervalInput">
                    Letöltési időköz (percben):
                  </label>
                  <div className="input-group input-group-sm">
                    <input
                      id="settingsIntervalInput"
                      type="number"
                      min="1"
                      max="1440"
                      className="form-control"
                      value={settingsConfig.intervalMinutes}
                      onChange={(e) => handleIntervalChange('settings', e.target.value)}
                    />
                    <span className="input-group-text">perc</span>
                  </div>

                  {/* Gyorsválasztó gombok */}
                  <div className="d-flex gap-1 mt-2">
                    {[5, 15, 30, 60, 120].map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`btn btn-xs btn-sm py-0 px-2 ${settingsConfig.intervalMinutes === m ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => handleIntervalChange('settings', m)}
                      >
                        {m}p
                      </button>
                    ))}
                  </div>
                </div>

                <div className="small text-muted border-top pt-2 mt-2">
                  <div>
                    <i className="bi bi-clock-history me-1" />
                    <strong>Utolsó letöltés:</strong> {getLastRunText(settingsConfig)}
                  </div>
                  <div>
                    <i className="bi bi-hourglass-split me-1" />
                    <strong>Következő:</strong> {getNextRunText(settingsConfig)}
                  </div>
                </div>
              </div>

              {/* Manuális gombok */}
              <div className="d-flex flex-wrap gap-2 mt-auto">
                <button
                  type="button"
                  className="btn btn-primary btn-sm fw-semibold"
                  disabled={busy}
                  onClick={() => runExport('settings')}
                >
                  <i className="bi bi-download me-1" />
                  Mentés letöltése most
                </button>
                <button
                  type="button"
                  className="btn btn-outline-success btn-sm"
                  disabled={busy}
                  onClick={() => settingsInputRef.current?.click()}
                >
                  <i className="bi bi-upload me-1" />
                  Feltöltés / Visszaállítás
                </button>
                <input
                  ref={settingsInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="d-none"
                  onChange={(event) => selectFile('settings', event)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="alert alert-info py-2 px-3 mt-4 mb-0 small">
          <i className="bi bi-info-circle me-2" />
          <strong>Megjegyzés:</strong> Az automatikus biztonsági mentés percenként ellenőrzi az eltelt időt, és közvetlenül JSON fájlként menti le az adatokat a böngészőből. Automatikus visszatöltés vagy felülírás nincs: az adatok visszaállítása mindig kizárólag kézi feltöltéssel történhet.
        </div>
      </div>

      <ConfirmModal
        open={Boolean(pendingRestore)}
        title="Biztonsági mentés visszaállítása"
        confirmLabel="Visszaállítás"
        confirmVariant="warning"
        busy={busy}
        onClose={() => setPendingRestore(null)}
        onConfirm={restore}
      >
        <p>Biztosan visszaállítod ezt a mentést?</p>
        <div className="border rounded p-2 bg-light">
          <strong>{pendingRestore?.fileName}</strong>
          <br />
          <small className="text-muted">
            Létrehozva: {pendingRestore?.backup?.createdAt ? new Date(pendingRestore.backup.createdAt).toLocaleString('hu-HU') : 'ismeretlen'}
          </small>
        </div>
      </ConfirmModal>
    </section>
  )
}
