import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getCurrentPushSubscription,
  requestNotificationPermission,
  subscribeTeamsToPush,
  unsubscribeFromPush
} from '../services/notificationApi'
import FloatingFeedback from '../components/FloatingFeedback'

const DISABLED_KEY = 'robotverseny_push_disabled'

const isIosDevice = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent || '') && !window.MSStream
}

const isStandaloneMode = () => {
  if (typeof window === 'undefined') return false
  return (
    window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  )
}

export default function VideosPage({ user }) {
  const [status, setStatus] = useState('loading')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [iosNotice, setIosNotice] = useState(false)

  const refreshStatus = useCallback(async () => {
    const isIos = isIosDevice()
    const isStandalone = isStandaloneMode()

    // On iOS Safari outside standalone PWA, Web Push is limited/unsupported
    if (isIos && !isStandalone && !('Notification' in window)) {
      setStatus('ios_install_needed')
      setIosNotice(true)
      return
    }

    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      if (isIos && !isStandalone) {
        setStatus('ios_install_needed')
        setIosNotice(true)
      } else {
        setStatus('unsupported')
      }
      return
    }

    if (Notification.permission === 'denied') {
      setStatus('denied')
      return
    }

    if (window.localStorage.getItem(DISABLED_KEY) === 'true') {
      setStatus('disabled')
      return
    }

    try {
      const subscription = await getCurrentPushSubscription()
      setStatus(subscription ? 'enabled' : 'disabled')
    } catch {
      setStatus('disabled')
    }
  }, [])

  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  const loadTeamIds = async () => {
    if (!user?.email) return []
    try {
      const response = await fetch(`https://legocompetition.runasp.net/api/Teams/teambyemail/${encodeURIComponent(user.email)}`, {
        headers: { accept: '*/*' }
      })
      if (!response.ok) return []
      const teams = await response.json()
      return Array.isArray(teams)
        ? [...new Set(teams
          .filter((team) => team && typeof team === 'object')
          .map((team) => team.id)
          .filter((id) => id !== null && id !== undefined))]
        : []
    } catch {
      return []
    }
  }

  const handleEnable = async () => {
    try {
      setBusy(true)

      // 1. Immediately request notification permission to preserve user gesture activation on mobile
      const permission = await requestNotificationPermission()
      if (permission === 'denied') {
        setStatus('denied')
        setFeedback({
          type: 'danger',
          text: 'Az értesítések le vannak tiltva a böngésződben. A böngésző beállításaiban tudod engedélyezni.'
        })
        return
      }

      if (permission !== 'granted') {
        setStatus('disabled')
        setFeedback({
          type: 'warning',
          text: 'Az értesítési engedély nem lett megadva.'
        })
        return
      }

      // 2. Fetch team IDs and register push subscription
      const teamIds = await loadTeamIds()
      await subscribeTeamsToPush(teamIds, user?.email)
      window.localStorage.removeItem(DISABLED_KEY)
      setStatus('enabled')
      setFeedback({
        type: 'success',
        text: 'Az értesítések sikeresen bekapcsolva ezen a készüléken!'
      })
    } catch (error) {
      await refreshStatus()
      setFeedback({
        type: 'danger',
        text: error.message || 'Nem sikerült engedélyezni az értesítéseket.'
      })
    } finally {
      setBusy(false)
    }
  }

  const handleDisable = async () => {
    try {
      setBusy(true)
      await unsubscribeFromPush()
      window.localStorage.setItem(DISABLED_KEY, 'true')
      setStatus('disabled')
      setFeedback({
        type: 'success',
        text: 'A push értesítések kikapcsolva ezen a készüléken.'
      })
    } catch (error) {
      setFeedback({
        type: 'danger',
        text: error.message || 'Nem sikerült kikapcsolni az értesítéseket.'
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="container py-5 my-4">
      <FloatingFeedback message={feedback} onClose={() => setFeedback(null)} />
      <div className="card border-0 bg-light p-4 p-md-5 rounded-4 text-center mx-auto shadow-sm" style={{ maxWidth: '580px' }}>
        <div className="mb-3">
          <i className="bi bi-camera-video text-primary" style={{ fontSize: '2.2rem' }} />
        </div>
        <h2 className="h4 fw-bold mb-2">Videók</h2>
        <p className="text-dark mb-2">
          A szabályok videói hamarosan itt lesznek elérhetőek.
        </p>
        <p className="small text-muted mb-4">
          A videók közzétételéről a regisztrált csapatoknak e-mailt küldünk, valamint közvetlen értesítést kaptok a telefonotokra is, ha engedélyezve vannak az értesítések.
        </p>

        {iosNotice && (
          <div className="alert alert-info text-start small mb-3 p-3 rounded-3">
            <div className="d-flex align-items-start gap-2">
              <i className="bi bi-apple fs-5 flex-shrink-0" />
              <div>
                <strong>iPhone / iPad felhasználóknak:</strong>
                <p className="mb-0 mt-1">
                  Az iOS rendszeren a push értesítésekhez koppints a Safariban a <strong>Megosztás</strong> gombra, majd válaszd a <strong>„Főképernyőhöz adás”</strong> lehetőséget. Az így hozzáadott ikonról megnyitva engedélyezhetők az értesítések.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="d-flex flex-wrap justify-content-center gap-2">
          {status === 'enabled' ? (
            <button
              type="button"
              className="btn btn-outline-success btn-sm px-3"
              onClick={handleDisable}
              disabled={busy}
              title="Kattints az értesítések kikapcsolásához"
            >
              <i className="bi bi-bell-fill me-2" />
              {busy ? 'Kikapcsolás...' : 'Értesítések bekapcsolva'}
            </button>
          ) : status === 'denied' ? (
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm px-3"
              disabled
              title="A böngésző beállításaiban engedélyezhető"
            >
              <i className="bi bi-bell-slash me-2" />
              Értesítések letiltva
            </button>
          ) : status === 'ios_install_needed' ? (
            <button
              type="button"
              className="btn btn-outline-primary btn-sm px-3"
              onClick={() => setIosNotice(true)}
            >
              <i className="bi bi-plus-square me-2" />
              Add a Főképernyőhöz (iOS)
            </button>
          ) : status === 'unsupported' ? (
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm px-3"
              disabled
            >
              <i className="bi bi-bell-slash me-2" />
              Nem támogatott böngésző
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm px-3"
              onClick={handleEnable}
              disabled={busy || status === 'loading'}
            >
              <i className="bi bi-bell me-2" />
              {busy ? 'Bekapcsolás...' : 'Értesítések engedélyezése'}
            </button>
          )}
          <Link className="btn btn-outline-primary btn-sm px-3" to="/szabalyzat">
            <i className="bi bi-file-earmark-text me-2" />
            Szabályzat megtekintése
          </Link>
        </div>
      </div>
    </main>
  )
}
