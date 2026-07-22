import React, { useState } from 'react'
import FloatingFeedback from '../components/FloatingFeedback'
import { Link, useParams } from 'react-router-dom'
import BasketThrowScoring from '../components/BasketThrowScoring'
import LineFollowingScoring from '../components/LineFollowingScoring'
import SumoScoring from '../components/SumoScoring'
import HillClimbingScoring from '../components/HillClimbingScoring'
import OverallStandings from '../components/OverallStandings'
import TieBreakerManager from '../components/TieBreakerManager'
import { competitionTypes } from '../config/adminScoringConfig'
import { judgeCompetitionByPrivilege } from '../config/privilegeConfig'

export default function AdminScoringPage({ userPrivilege }) {
  const { competitionType } = useParams()
  const allowedJudgeCompetition = judgeCompetitionByPrivilege[Number(userPrivilege)] || null
  const isAdmin = Number(userPrivilege) === 1
  const [checkingTies, setCheckingTies] = useState(false)
  const [tieReloadKey, setTieReloadKey] = useState(0)
  const [tieCheckMessage, setTieCheckMessage] = useState(null)
  const visibleCompetitions = competitionTypes.filter((item) => (
    item.slug !== 'osszesitett' && (isAdmin || item.slug === allowedJudgeCompetition)
  ))

  const activeCompetition = competitionTypes.find((item) => item.slug === competitionType) || null
  const canAccessActiveCompetition = !activeCompetition || isAdmin || activeCompetition.slug === allowedJudgeCompetition || activeCompetition.slug === 'osszesitett'

  const checkAllTies = async () => {
    try {
      setCheckingTies(true)
      setTieCheckMessage(null)
      const response = await fetch('https://legocompetition.runasp.net/api/TieBreaker/check-all-ties', {
        method: 'POST',
        headers: { accept: '*/*' }
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'A döntetlenek ellenőrzése nem sikerült.')
      }
      setTieReloadKey((current) => current + 1)
      window.dispatchEvent(new Event('tieBreakersChanged'))
      setTieCheckMessage({ type: 'success', text: 'A döntetlenek ellenőrzése megtörtént, a listák frissültek.' })
    } catch (error) {
      setTieCheckMessage({ type: 'danger', text: error.message })
    } finally {
      setCheckingTies(false)
    }
  }

  return (
    <div className="container py-4">
      <div className="card shadow-sm team-card mb-4">
        <div className="card-body">
          <h2 className="mb-3">Pontozás kezelése</h2>
          <p className="text-muted mb-0">Válassz egy versenyszámot a pontozás kezeléséhez.</p>
        </div>
      </div>

      <div className="row g-3 mb-4">
        {visibleCompetitions.map((item) => (
          <div className="col-md-6 col-xl-3" key={item.slug}>
            <Link to={`/admin/pontozas/${item.slug}`} className={`btn w-100 py-3 admin-competition-btn ${competitionType === item.slug ? 'active' : ''}`}>
              {item.label}
            </Link>
          </div>
        ))}
        <div className="col-12">
          <Link to="/admin/pontozas/osszesitett" className={`btn w-100 py-3 admin-competition-btn ${competitionType === 'osszesitett' ? 'active' : ''}`}>
            Összesített ponttáblázat
          </Link>
        </div>
      </div>

      {isAdmin && (
        <div className="card shadow-sm team-card no-hover-card mb-4">
          <div className="card-body d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <h3 className="h5 mb-1">Döntetlenek ellenőrzése</h3>
              <p className="text-muted small mb-0">Bármikor újraellenőrizheted mind a négy versenyszám aktuális eredményeit.</p>
            </div>
            <button type="button" className="btn btn-primary" onClick={checkAllTies} disabled={checkingTies}>
              {checkingTies ? 'Ellenőrzés...' : 'Döntetlenek ellenőrzése'}
            </button>
          </div>
        </div>
      )}
      <FloatingFeedback message={tieCheckMessage} onClose={() => setTieCheckMessage(null)} />

      {canAccessActiveCompetition && activeCompetition?.tieBreakerCompetitionId && (
        <TieBreakerManager
          competitionId={activeCompetition.tieBreakerCompetitionId}
          competitionLabel={activeCompetition.label}
          mode={activeCompetition.tieBreakerMode}
          reloadKey={tieReloadKey}
        />
      )}

      {!canAccessActiveCompetition ? (
        <div className="alert alert-danger">Ehhez a versenyszámhoz nincs pontozási jogosultságod.</div>
      ) : !activeCompetition ? (
        <div className="alert alert-info">Válassz egy versenyszámot a kezdéshez.</div>
      ) : activeCompetition.slug === 'kosarra-dobas' ? (
        <BasketThrowScoring />
      ) : activeCompetition.slug === 'vonalkovetes' ? (
        <LineFollowingScoring />
      ) : activeCompetition.slug === 'szumo' ? (
        <SumoScoring />
      ) : activeCompetition.slug === 'hegymaszas' ? (
        <HillClimbingScoring />
      ) : activeCompetition.slug === 'osszesitett' ? (
        <OverallStandings />
      ) : (
        <div className="alert alert-info">
          A(z) <strong>{activeCompetition.label}</strong> versenyszámhoz még nincs megvalósított pontozási logika.
        </div>
      )}
    </div>
  )
}
