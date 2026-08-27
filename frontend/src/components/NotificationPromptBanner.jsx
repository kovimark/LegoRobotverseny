import React, { useEffect, useState } from 'react'
import { subscribeTeamsToPush } from '../services/notificationApi'
import './NotificationPromptBanner.css'

const DISMISSED_KEY = 'robotverseny_prompt_dismissed'

export default function NotificationPromptBanner({ user }) {
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState('ask') // 'ask' | 'info' | 'success'

  useEffect(() => {
    // Check if notifications are supported and in default state
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return
    }

    if (Notification.permission !== 'default') {
      return
    }

    if (sessionStorage.getItem(DISMISSED_KEY) === 'true') {
      return
    }

    // Delay so it doesn't jarringly appear on initial page mount
    const timer = setTimeout(() => {
      setVisible(true)
    }, 1200)

    return () => clearTimeout(timer)
  }, [])

  const loadTeamIdsAndPrivilege = async () => {
    if (!user?.email) return { teamIds: [], privilegeId: null }
    let teamIds = []
    let privilegeId = null
    try {
      const response = await fetch(`https://legocompetition.runasp.net/api/Teams/teambyemail/${encodeURIComponent(user.email)}`, {
        headers: { accept: '*/*' }
      })
      if (response.ok) {
        const teams = await response.json()
        if (Array.isArray(teams)) {
          teamIds = [...new Set(teams.filter((t) => t && typeof t === 'object').map((t) => t.id).filter((id) => id !== null))]
        }
      }
    } catch {
      // ignore
    }

    try {
      const privRes = await fetch(`https://legocompetition.runasp.net/api/Privilege/${encodeURIComponent(user.email)}`)
      if (privRes.ok) {
        const priv = await privRes.json()
        if (priv && priv.id) privilegeId = priv.id
      }
    } catch {
      // ignore
    }

    return { teamIds, privilegeId }
  }

  const handleAllow = async () => {
    try {
      setBusy(true)
      const { teamIds, privilegeId } = await loadTeamIdsAndPrivilege()
      await subscribeTeamsToPush(teamIds, privilegeId)
      window.localStorage.removeItem('robotverseny_push_disabled')
      setStep('success')
      setTimeout(() => {
        setVisible(false)
      }, 2500)
    } catch (err) {
      if (Notification.permission === 'denied') {
        setVisible(false)
      } else {
        setStep('info')
      }
    } finally {
      setBusy(false)
    }
  }

  const handleDeny = () => {
    sessionStorage.setItem(DISMISSED_KEY, 'true')
    setStep('info')
  }

  const handleClose = () => {
    setVisible(false)
  }

  if (!visible) return null

  return (
    <aside className="notification-prompt-banner shadow-lg animate-slide-up" aria-label="Értesítések engedélyezése">
      <div className="notification-prompt-content">
        <div className="notification-prompt-icon">
          <i className="bi bi-bell-fill" aria-hidden="true" />
        </div>

        <div className="notification-prompt-text">
          {step === 'ask' && (
            <>
              <strong>Szeretnél értesítéseket kapni?</strong>
              <p className="mb-0 text-muted small">
                Engedélyezd az értesítéseket, hogy azonnal értesülj a meccsek állásáról, a sorsolásról és a legújabb hírekről!
              </p>
            </>
          )}

          {step === 'info' && (
            <>
              <strong>Semmi gond!</strong>
              <p className="mb-0 text-muted small">
                Később bármikor engedélyezheted vagy bekapcsolhatod az értesítéseket a jobb felső sarokban található <strong>Profil</strong> fülön.
              </p>
            </>
          )}

          {step === 'success' && (
            <>
              <strong className="text-success">Értesítések sikeresen bekapcsolva!</strong>
              <p className="mb-0 text-muted small">
                Mostantól azonnal megkapod a fontos versenyértesítéseket.
              </p>
            </>
          )}
        </div>

        <div className="notification-prompt-actions">
          {step === 'ask' ? (
            <>
              <button
                type="button"
                className="btn btn-primary btn-sm px-3 fw-bold"
                disabled={busy}
                onClick={handleAllow}
              >
                {busy ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                    Bekapcsolás…
                  </>
                ) : (
                  'Engedélyezés'
                )}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm px-3"
                disabled={busy}
                onClick={handleDeny}
              >
                Nem
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-outline-primary btn-sm px-3"
              onClick={handleClose}
            >
              Rendben
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
