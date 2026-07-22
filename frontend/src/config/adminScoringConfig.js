export const competitionTypes = [
  { slug: 'hegymaszas', label: 'Hegymászás', apiPath: 'HillClimbing', tieBreakerCompetitionId: 3, tieBreakerMode: 'weight' },
  { slug: 'vonalkovetes', label: 'Vonalkövetés', apiPath: 'LineFollowing', tieBreakerCompetitionId: 2, tieBreakerMode: 'ranking' },
  { slug: 'kosarra-dobas', label: 'Kosárra dobás', apiPath: 'Basketball', tieBreakerCompetitionId: 4, tieBreakerMode: 'ranking' },
  { slug: 'szumo', label: 'Szumó', apiPath: 'Sumo', tieBreakerCompetitionId: 1, tieBreakerMode: 'weight' },
  { slug: 'osszesitett', label: 'Összesített ponttáblázat' }
]

export const getCompetitionConfig = (slug) => competitionTypes.find((item) => item.slug === slug) || null

export const isTeamEliminated = (team) => {
  const value = team?.is_in_race
  return value === false || value === 0
}
