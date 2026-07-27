import React, { useState } from 'react'
import { DATA_REFRESH_EVENT } from '../config/dataRefresh'

export default function FloatingRefreshButton() {
  const [refreshing, setRefreshing] = useState(false)

  const refreshData = () => {
    if (refreshing) return
    setRefreshing(true)
    window.dispatchEvent(new Event(DATA_REFRESH_EVENT))
    window.setTimeout(() => setRefreshing(false), 800)
  }

  return (
    <button
      type="button"
      className={`floating-refresh-button ${refreshing ? 'refreshing' : ''}`}
      aria-label={refreshing ? 'Adatok frissítése folyamatban' : 'Adatok frissítése'}
      title="Adatok frissítése"
      disabled={refreshing}
      onClick={refreshData}
    >
      <i className="bi bi-arrow-clockwise" aria-hidden="true" />
    </button>
  )
}
