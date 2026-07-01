export const competitionTypes = [
  { slug: 'hegymaszas', label: 'Hegymászás', apiPath: 'HillClimbing' },
  { slug: 'vonalkovetes', label: 'Vonalkövetés', apiPath: 'LineFollowing' },
  { slug: 'kosarra-dobas', label: 'Kosárra dobás', apiPath: 'Basketball' },
  { slug: 'szumo', label: 'Szumó', apiPath: 'Sumo' }
]

export const getCompetitionConfig = (slug) => competitionTypes.find((item) => item.slug === slug) || null

export const isTeamEliminated = (team) => {
  const value = team?.is_in_race
  return value === false || value === 0
}
