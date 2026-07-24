import React, { useRef, useState } from 'react'
import ConfirmModal from './ConfirmModal'
import {
  exportScoresBackup,
  exportSettingsBackup,
  readBackupFile,
  restoreScoresBackup,
  restoreSettingsBackup
} from '../services/backupApi'

export default function BackupManager({ onStatus, onSettingsRestored }) {
  const settingsInputRef = useRef(null)
  const scoresInputRef = useRef(null)
  const [pendingRestore, setPendingRestore] = useState(null)
  const [busy, setBusy] = useState(false)

  const runExport = async (kind) => {
    try {
      setBusy(true)
      if (kind === 'settings') await exportSettingsBackup()
      else await exportScoresBackup()
      onStatus({ type: 'success', text: `${kind === 'settings' ? 'A beállítások' : 'A pontok és eredmények'} biztonsági mentése letöltve.` })
    } catch (error) { onStatus({ type: 'danger', text: error.message }) }
    finally { setBusy(false) }
  }

  const selectFile = async (kind, event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const backup = await readBackupFile(file)
      const expectedFormat = kind === 'settings' ? 'robotverseny-settings-backup' : 'robotverseny-scores-backup'
      if (backup.format !== expectedFormat) throw new Error('Nem a kiválasztott mentéstípushoz tartozó fájlt adtad meg.')
      setPendingRestore({ kind, backup, fileName: file.name })
    } catch (error) { onStatus({ type: 'danger', text: error.message }) }
  }

  const restore = async () => {
    if (!pendingRestore) return
    try {
      setBusy(true)
      if (pendingRestore.kind === 'settings') {
        await restoreSettingsBackup(pendingRestore.backup)
        await onSettingsRestored?.()
      } else await restoreScoresBackup(pendingRestore.backup)
      onStatus({ type: 'success', text: `${pendingRestore.kind === 'settings' ? 'A beállítások' : 'A pontok és eredmények'} visszaállítása befejeződött.` })
      setPendingRestore(null)
    } catch (error) { onStatus({ type: 'danger', text: error.message }) }
    finally { setBusy(false) }
  }

  return (
    <section className="card shadow-sm team-card no-hover-card mb-4">
      <div className="card-body p-4">
        <h3 className="h5 mb-1"><i className="bi bi-shield-check me-2" />Biztonsági mentések</h3>
        <p className="text-muted">Törlés vagy nagyobb módosítás előtt tölts le egy JSON-mentést. A feltöltés nem törli automatikusan a meglévő adatokat.</p>
        <div className="row g-3">
          <div className="col-lg-6"><div className="backup-box"><h4 className="h6">Beállítások és menetrend</h4><div className="d-flex flex-wrap gap-2"><button type="button" className="btn btn-outline-primary" disabled={busy} onClick={() => runExport('settings')}><i className="bi bi-download me-2" />Letöltés</button><button type="button" className="btn btn-outline-success" disabled={busy} onClick={() => settingsInputRef.current?.click()}><i className="bi bi-upload me-2" />Feltöltés</button></div><input ref={settingsInputRef} type="file" accept=".json,application/json" className="d-none" onChange={(event) => selectFile('settings', event)} /></div></div>
          <div className="col-lg-6"><div className="backup-box"><h4 className="h6">Pontok és versenyeredmények</h4><div className="d-flex flex-wrap gap-2"><button type="button" className="btn btn-outline-primary" disabled={busy} onClick={() => runExport('scores')}><i className="bi bi-download me-2" />Letöltés</button><button type="button" className="btn btn-outline-success" disabled={busy} onClick={() => scoresInputRef.current?.click()}><i className="bi bi-upload me-2" />Feltöltés</button></div><input ref={scoresInputRef} type="file" accept=".json,application/json" className="d-none" onChange={(event) => selectFile('scores', event)} /></div></div>
        </div>
      </div>
      <ConfirmModal open={Boolean(pendingRestore)} title="Biztonsági mentés visszaállítása" confirmLabel="Visszaállítás" confirmVariant="warning" busy={busy} onClose={() => setPendingRestore(null)} onConfirm={restore}><p>Biztosan visszaállítod ezt a mentést?</p><div className="border rounded p-2"><strong>{pendingRestore?.fileName}</strong><br /><small>Létrehozva: {pendingRestore?.backup?.createdAt ? new Date(pendingRestore.backup.createdAt).toLocaleString('hu-HU') : 'ismeretlen'}</small></div></ConfirmModal>
    </section>
  )
}
