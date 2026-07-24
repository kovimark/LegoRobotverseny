import React, { useCallback, useEffect, useState } from 'react'

const API_URL = 'https://legocompetition.runasp.net/api/Statistics/getAllStats'

const TeamList = ({ teams, emptyText }) => {
  const values = Array.isArray(teams) ? teams : []
  return (
    <div className="mt-3">
      <div className="small text-muted mb-2">Még nem próbálkozott ({values.length})</div>
      {values.length > 0
        ? <div className="d-flex flex-wrap gap-1">{values.map((team, index) => <span className="badge text-bg-light border text-dark" key={`${team}-${index}`}>{typeof team === 'string' ? team : team?.teamName || team?.team_name || '-'}</span>)}</div>
        : <div className="small text-success"><i className="bi bi-check-circle me-1" />{emptyText}</div>}
    </div>
  )
}

export default function CompetitionStatistics({ onStatus }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadStats = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(API_URL, { headers: { accept: '*/*' } })
      if (!response.ok) throw new Error((await response.text()) || 'A statisztikák betöltése sikertelen.')
      setStats(await response.json())
    } catch (error) {
      onStatus?.({ type: 'danger', text: error.message })
    } finally {
      setLoading(false)
    }
  }, [onStatus])

  useEffect(() => { loadStats() }, [loadStats])

  const cards = stats ? [
    {
      key: 'basketball',
      icon: 'bi-basket2',
      title: 'Kosárra dobás',
      values: [['Próbálkozott csapatok', stats.basketballTeamsTriedNum ?? 0]],
      teams: stats.basketballTeamsNotTried
    },
    {
      key: 'line',
      icon: 'bi-sign-turn-right',
      title: 'Vonalkövetés',
      values: [
        ['Próbálkozott csapatok', stats.lineFollowTeamsTriedNum ?? 0],
        ['Összes próbálkozás', stats.lineFollowTriesNum ?? 0],
        ['Hátralévő csapatok', stats.lineFollowTeamsRemaining ?? 0]
      ]
    },
    {
      key: 'sumo',
      icon: 'bi-diagram-3',
      title: 'Szumó',
      values: [
        ['Aktuális forduló', stats.sumoRound ?? 0],
        ['Szükséges bónuszforduló', stats.sumoNeedBonusRound ?? '-']
      ]
    },
    {
      key: 'hill',
      icon: 'bi-graph-up-arrow',
      title: 'Hegymászás',
      values: [['Próbálkozott csapatok', stats.hillClimbingTeamsTriedNum ?? 0]],
      teams: stats.hillClimbingTeamsNotTried
    }
  ] : []

  return (
    <section className="card shadow-sm team-card no-hover-card mb-4">
      <div className="card-body p-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <h3 className="h5 mb-1"><i className="bi bi-bar-chart-line me-2" />Versenystatisztikák</h3>
            <p className="text-muted mb-0">A versenyszámok aktuális teljesítési állapota.</p>
          </div>
          <button type="button" className="btn btn-outline-primary btn-sm" onClick={loadStats} disabled={loading}>
            <i className={`bi bi-arrow-clockwise me-2${loading ? ' spin' : ''}`} />Frissítés
          </button>
        </div>
        {loading && !stats
          ? <div className="text-muted py-3">Statisztikák betöltése...</div>
          : <div className="row g-3">{cards.map((card) => (
              <div className="col-12 col-md-6" key={card.key}>
                <div className="border rounded-3 h-100 p-3 bg-light">
                  <h4 className="h6 mb-3"><i className={`bi ${card.icon} me-2`} />{card.title}</h4>
                  <div className="d-grid gap-2">
                    {card.values.map(([label, value]) => (
                      <div className="d-flex justify-content-between gap-3" key={label}>
                        <span className="text-muted">{label}</span><strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                  {card.teams && <TeamList teams={card.teams} emptyText="Minden csapat próbálkozott." />}
                </div>
              </div>
            ))}</div>}
      </div>
    </section>
  )
}
