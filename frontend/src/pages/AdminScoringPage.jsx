import React from 'react'
import { Link, useParams } from 'react-router-dom'
import BasketThrowScoring from '../components/BasketThrowScoring'
import LineFollowingScoring from '../components/LineFollowingScoring'
import SumoScoring from '../components/SumoScoring'
import HillClimbingScoring from '../components/HillClimbingScoring'
import OverallStandings from '../components/OverallStandings'
import { competitionTypes } from '../config/adminScoringConfig'
import { judgeCompetitionByPrivilege } from '../config/privilegeConfig'

export default function AdminScoringPage({ userPrivilege }) {
  const { competitionType } = useParams()
  const allowedJudgeCompetition = judgeCompetitionByPrivilege[Number(userPrivilege)] || null
  const isAdmin = Number(userPrivilege) === 1
  const visibleCompetitions = competitionTypes.filter((item) => (
    item.slug !== 'osszesitett' && (isAdmin || item.slug === allowedJudgeCompetition)
  ))

  const activeCompetition = competitionTypes.find((item) => item.slug === competitionType) || null
  const canAccessActiveCompetition = !activeCompetition || isAdmin || activeCompetition.slug === allowedJudgeCompetition

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
        {isAdmin && <div className="col-12">
          <Link to="/admin/pontozas/osszesitett" className={`btn w-100 py-3 admin-competition-btn ${competitionType === 'osszesitett' ? 'active' : ''}`}>
            Összesített ponttáblázat
          </Link>
        </div>}
      </div>

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
