import React from 'react'
import OverallStandings from '../components/OverallStandings'

export default function StandingsPage() {
  return (
    <div className="container py-4 py-md-5">
      <div className="mb-4">
        <h2 className="mb-1">Összesített állás</h2>
        <p className="text-muted mb-0">A csapatok pontjai és helyezései minden versenyszámban.</p>
      </div>
      <OverallStandings />
    </div>
  )
}
