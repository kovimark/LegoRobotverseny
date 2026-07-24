import React, { useCallback, useEffect, useState } from 'react'
import FloatingFeedback from './FloatingFeedback'
import { getCurrentPushSubscription, subscribeTeamsToPush, unsubscribeFromPush } from '../services/notificationApi'

const DISABLED_KEY = 'robotverseny_push_disabled'

export default function ProfileNotificationStatus({ user }) {
  const [status, setStatus] = useState('loading')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const refreshStatus = useCallback(async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }
    if (Notification.permission === 'denied') {
      setStatus('denied')
      return
    }
    try {
      const subscription = await getCurrentPushSubscription()
      setStatus(subscription ? 'enabled' : 'disabled')
    } catch {
      setStatus('disabled')
    }
  }, [])

  useEffect(() => { refreshStatus() }, [refreshStatus])

  const loadTeamIds = async () => {
    if (!user?.email) return []
    const response = await fetch(`https://legocompetition.runasp.net/api/Teams/teambyemail/${encodeURIComponent(user.email)}`, {
      headers: { accept: '*/*' }
    })
    if (!response.ok) throw new Error('Nem sikerült betölteni a felhasználó csapatait.')
    const teams = await response.json()
    return Array.isArray(teams)
      ? [...new Set(teams.map((team) => team.id).filter((id) => id !== null && id !== undefined))]
      : []
  }

  const enable = async () => {
    try {
      setBusy(true)
      const teamIds = await loadTeamIds()
      await subscribeTeamsToPush(teamIds)
      window.localStorage.removeItem(DISABLED_KEY)
      setStatus('enabled')
      setFeedback({
        type: 'success',
        text: teamIds.length > 0
          ? 'Az értesítések bekapcsolva és a csapataidhoz rendelve.'
          : 'A böngészős értesítések bekapcsolva.'
      })
    } catch (error) {
      await refreshStatus()
      setFeedback({ type: 'danger', text: error.message })
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    try {
      setBusy(true)
      await unsubscribeFromPush()
      window.localStorage.setItem(DISABLED_KEY, 'true')
      setStatus('disabled')
      setFeedback({ type: 'success', text: 'A push értesítések kikapcsolva ezen az eszközön.' })
    } catch (error) {
      setFeedback({ type: 'danger', text: error.message || 'Nem sikerült kikapcsolni az értesítéseket.' })
    } finally {
      setBusy(false)
    }
  }

  const statusData = {
    loading: ['Ellenőrzés…', 'text-bg-secondary'],
    enabled: ['Engedélyezve', 'text-bg-success'],
    disabled: ['Kikapcsolva', 'text-bg-secondary'],
    denied: ['Letiltva a böngészőben', 'text-bg-danger'],
    unsupported: ['Nem támogatott', 'text-bg-warning']
  }[status]

  return (
    <section className="profile-notification-status">
      <FloatingFeedback message={feedback} onClose={() => setFeedback(null)} />
      <div className="d-flex justify-content-between align-items-center gap-2">
        <strong><i className="bi bi-bell-fill me-2" aria-hidden="true" />Értesítések állapota</strong>
        <span className={`badge ${statusData[1]}`}>{statusData[0]}</span>
      </div>
      {status === 'denied' && <small>A webhely értesítéseit a böngésző beállításaiban tudod újra engedélyezni.</small>}
      {status === 'unsupported' && <small>Ez a böngésző vagy eszköz nem támogatja a webes push értesítéseket.</small>}
      {status === 'enabled' ? (
        <button type="button" className="btn btn-outline-danger btn-sm w-100" disabled={busy} onClick={disable}>
          <i className="bi bi-bell-slash-fill me-2" aria-hidden="true" />{busy ? 'Kikapcsolás…' : 'Értesítések kikapcsolása'}
        </button>
      ) : (
        <button type="button" className="btn btn-primary btn-sm w-100" disabled={busy || status === 'loading' || status === 'denied' || status === 'unsupported'} onClick={enable}>
          <i className="bi bi-bell-fill me-2" aria-hidden="true" />{busy ? 'Bekapcsolás…' : 'Értesítések bekapcsolása'}
        </button>
      )}
    </section>
  )
}
