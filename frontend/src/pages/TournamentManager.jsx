import React, { useEffect, useMemo, useState } from 'react';

const PHASES = {
  SETUP: 'SETUP',
  GROUPS: 'GROUPS',
  KNOCKOUT: 'KNOCKOUT'
};

export const MAX_TEAMS = 64;
export const MAX_GROUPS = 8;
export const MAX_TEAMS_PER_GROUP = 8;

export const getRequiredGroupCount = (teamCount, maxTeamsPerGroup = MAX_TEAMS_PER_GROUP, maxGroups = MAX_GROUPS) => {
  if (!teamCount || teamCount <= 0) {
    return 1;
  }

  return Math.min(maxGroups, Math.max(1, Math.ceil(Math.min(teamCount, MAX_TEAMS) / maxTeamsPerGroup)));
};

export const createInitialGroupSizes = (groupCount, teamCount, maxTeamsPerGroup = MAX_TEAMS_PER_GROUP, maxGroups = MAX_GROUPS) => {
  const sizes = {};
  const safeTeamCount = Math.min(Math.max(0, teamCount || 0), MAX_TEAMS);
  const requiredGroupCount = getRequiredGroupCount(safeTeamCount, maxTeamsPerGroup, maxGroups);
  const resolvedGroupCount = Math.min(maxGroups, Math.max(requiredGroupCount, Math.max(1, groupCount || 1)));
  const baseSize = Math.floor(safeTeamCount / resolvedGroupCount);
  const remainder = safeTeamCount % resolvedGroupCount;

  for (let index = 0; index < resolvedGroupCount; index += 1) {
    const size = baseSize + (index < remainder ? 1 : 0);
    sizes[index] = Math.min(maxTeamsPerGroup, Math.max(0, size));
  }

  return sizes;
};

const shuffleTeams = (teams) => {
  const shuffled = [...teams];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
};

export default function TournamentManager() {
  const [teams, setTeams] = useState([]);
  const [phase, setPhase] = useState(PHASES.SETUP);
  const [groupCount, setGroupCount] = useState(4);
  const [groupSizes, setGroupSizes] = useState({});
  const [groups, setGroups] = useState([]);
  const [qualifiedTeamIds, setQualifiedTeamIds] = useState([]);
  const [bracket, setBracket] = useState({ quarterFinals: [], semiFinals: [], finals: [], winner: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://legocompetition.runasp.net/api/Teams');
        if (!response.ok) {
          throw new Error('Nem sikerült betölteni a csapatokat.');
        }

        const data = await response.json();
        const normalizedTeams = Array.isArray(data)
          ? data.map((team, index) => ({
              id: team.id ?? `${team.teamName || 'team'}-${index}`,
              name: team.teamName || `Csapat ${index + 1}`
            }))
          : [];

        setTeams(normalizedTeams);
        setError('');
      } catch (err) {
        setError(err.message || 'Nem sikerült betölteni a csapatokat.');
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  useEffect(() => {
    if (!teams.length) {
      setGroupCount(1);
      setGroupSizes({});
      return;
    }

    const requiredGroupCount = getRequiredGroupCount(teams.length);
    setGroupCount((prev) => Math.max(requiredGroupCount, prev));
    setGroupSizes(createInitialGroupSizes(requiredGroupCount, teams.length));
  }, [teams.length]);

  const totalGroupSize = useMemo(() => Object.values(groupSizes).reduce((sum, value) => sum + (Number(value) || 0), 0), [groupSizes]);

  const handleGroupCountChange = (value) => {
    const parsed = Number.parseInt(value, 10);
    const nextGroupCount = Number.isNaN(parsed) ? 1 : Math.min(MAX_GROUPS, Math.max(1, parsed));
    const requiredGroupCount = getRequiredGroupCount(teams.length);
    const resolvedGroupCount = Math.max(requiredGroupCount, nextGroupCount);

    setGroupCount(resolvedGroupCount);
    setGroupSizes(createInitialGroupSizes(resolvedGroupCount, teams.length));
  };

  const handleSizeChange = (groupIndex, size) => {
    const parsed = Number.parseInt(size, 10);
    setGroupSizes((prev) => ({
      ...prev,
      [groupIndex]: Number.isNaN(parsed) ? 0 : Math.min(MAX_TEAMS_PER_GROUP, Math.max(0, parsed))
    }));
  };

  const handleRandomDraw = () => {
    if (!teams.length) {
      setError('Előbb töltsd be a nevezett csapatokat.');
      return;
    }

    if (teams.length > MAX_TEAMS) {
      setError(`Maximum ${MAX_TEAMS} csapat lehet a versenyen.`);
      return;
    }

    if (groupCount > MAX_GROUPS) {
      setError(`Maximum ${MAX_GROUPS} csoport lehet.`);
      return;
    }

    if (totalGroupSize !== teams.length) {
      setError(`A csoportméretek összege ${totalGroupSize}, de ${teams.length} csapatot kell kiosztani.`);
      return;
    }

    const hasTooLargeGroup = Object.values(groupSizes).some((value) => Number(value || 0) > MAX_TEAMS_PER_GROUP);
    if (hasTooLargeGroup) {
      setError(`Egy csoportban maximum ${MAX_TEAMS_PER_GROUP} csapat lehet.`);
      return;
    }

    const shuffled = shuffleTeams(teams);
    const generatedGroups = [];
    let teamIndex = 0;

    for (let index = 0; index < groupCount; index += 1) {
      const currentSize = Number(groupSizes[index] || 0);
      generatedGroups.push({
        id: `group-${index}`,
        name: `${String.fromCharCode(65 + index)} csoport`,
        teams: shuffled.slice(teamIndex, teamIndex + currentSize)
      });
      teamIndex += currentSize;
    }

    setGroups(generatedGroups);
    setQualifiedTeamIds([]);
    setBracket({ quarterFinals: [], semiFinals: [], finals: [], winner: null });
    setError('');
    setPhase(PHASES.GROUPS);
  };

  const toggleQualification = (teamId) => {
    setQualifiedTeamIds((prev) => (prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]));
  };

  const generateBracket = () => {
    const qualifiedTeams = teams.filter((team) => qualifiedTeamIds.includes(team.id));

    if (qualifiedTeams.length < 2) {
      setError('Legalább 2 továbbjutó csapatot kell kiválasztani.');
      return;
    }

    const quarterFinals = [];
    const semiFinals = [];
    const finals = [];

    if (qualifiedTeams.length >= 8) {
      for (let index = 0; index < 8; index += 2) {
        quarterFinals.push({
          id: `qf-${index / 2}`,
          team1: qualifiedTeams[index] || { id: `placeholder-${index}`, name: 'Üres hely' },
          team2: qualifiedTeams[index + 1] || { id: `placeholder-${index + 1}`, name: 'Üres hely' },
          winner: null
        });
      }

      for (let index = 0; index < 2; index += 1) {
        semiFinals.push({ id: `sf-${index}`, team1: null, team2: null, winner: null });
      }

      finals.push({ id: 'final-0', team1: null, team2: null, winner: null });
    } else if (qualifiedTeams.length >= 4) {
      for (let index = 0; index < 4; index += 2) {
        semiFinals.push({
          id: `sf-${index / 2}`,
          team1: qualifiedTeams[index] || { id: `placeholder-${index}`, name: 'Üres hely' },
          team2: qualifiedTeams[index + 1] || { id: `placeholder-${index + 1}`, name: 'Üres hely' },
          winner: null
        });
      }

      finals.push({ id: 'final-0', team1: null, team2: null, winner: null });
    } else {
      finals.push({
        id: 'final-0',
        team1: qualifiedTeams[0] || { id: 'placeholder-0', name: 'Üres hely' },
        team2: qualifiedTeams[1] || { id: 'placeholder-1', name: 'Üres hely' },
        winner: null
      });
    }

    setBracket({ quarterFinals, semiFinals, finals, winner: null });
    setError('');
    setPhase(PHASES.KNOCKOUT);
  };

  const selectMatchWinner = (round, matchIndex, winningTeam) => {
    if (!winningTeam || winningTeam.id.startsWith('placeholder')) {
      return;
    }

    setBracket((prev) => {
      const updated = { ...prev };

      if (round === 'quarterFinals') {
        updated.quarterFinals[matchIndex].winner = winningTeam;
        const semiIndex = Math.floor(matchIndex / 2);
        if (matchIndex % 2 === 0) {
          updated.semiFinals[semiIndex].team1 = winningTeam;
        } else {
          updated.semiFinals[semiIndex].team2 = winningTeam;
        }
      } else if (round === 'semiFinals') {
        updated.semiFinals[matchIndex].winner = winningTeam;
        updated.finals[0].team1 = matchIndex === 0 ? winningTeam : updated.finals[0].team1;
        updated.finals[0].team2 = matchIndex === 1 ? winningTeam : updated.finals[0].team2;
      } else if (round === 'finals') {
        updated.finals[0].winner = winningTeam;
        updated.winner = winningTeam;
      }

      return updated;
    });
  };

  return (
    <div className="container py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-4">
        <div>
          <h2 className="mb-1">Verseny szervezése</h2>
          <p className="text-muted mb-0">Csoportkör, továbbjutók és egyenes kiesés egy helyen.</p>
        </div>
        <div className="text-muted small">Fázis: {phase}</div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <div className="alert alert-info">Csapatok betöltése...</div>}

      {phase === PHASES.SETUP && (
        <div className="card shadow-sm border-0">
          <div className="card-body p-4">
            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <label className="form-label fw-semibold" htmlFor="group-count">Csoportok száma</label>
                <input
                  id="group-count"
                  type="number"
                  className="form-control"
                  min="1"
                  max={MAX_GROUPS}
                  value={groupCount}
                  onChange={(event) => handleGroupCountChange(event.target.value)}
                />
              </div>
              <div className="col-md-8">
                <div className="text-muted small">Összesen nevezett csapatok: {teams.length}</div>
                <div className="text-muted small">Javasolt csoportméret: {Math.max(1, Math.ceil(teams.length / Math.min(MAX_GROUPS, groupCount)))} fő / csoport</div>
              </div>
            </div>

            <h5 className="mb-3">Csapatok száma csoportonként</h5>
            <div className="row g-3 mb-4">
              {Array.from({ length: groupCount }).map((_, index) => (
                <div className="col-md-6 col-xl-4" key={`group-size-${index}`}>
                  <label className="form-label fw-semibold" htmlFor={`group-size-${index}`}>{String.fromCharCode(65 + index)} csoport</label>
                  <input
                    id={`group-size-${index}`}
                    type="number"
                    className="form-control"
                    min="0"
                    max={MAX_TEAMS_PER_GROUP}
                    value={groupSizes[index] || 0}
                    onChange={(event) => handleSizeChange(index, event.target.value)}
                  />
                </div>
              ))}
            </div>

            <div className="d-flex flex-wrap gap-2 align-items-center">
              <button type="button" className="btn btn-primary" onClick={handleRandomDraw} disabled={loading}>
                {loading ? 'Betöltés…' : 'Sorsolás'}
              </button>
              <div className="text-muted">Összesen: {totalGroupSize} / {teams.length} csapat beállítva</div>
            </div>
          </div>
        </div>
      )}

      {phase === PHASES.GROUPS && (
        <div>
          <div className="row g-3 mb-4">
            {groups.map((group) => (
              <div className="col-md-6 col-lg-4" key={group.id}>
                <div className="card shadow-sm border-0 h-100">
                  <div className="card-header bg-light fw-bold">{group.name}</div>
                  <div className="card-body p-2">
                    <div className="d-grid gap-2">
                      {group.teams.map((team) => {
                        const isQualified = qualifiedTeamIds.includes(team.id);
                        return (
                          <button
                            key={team.id}
                            type="button"
                            className={`btn btn-sm text-start ${isQualified ? 'btn-success' : 'btn-outline-success'}`}
                            onClick={() => toggleQualification(team.id)}
                          >
                            {team.name}
                            {isQualified ? ' • Továbbjutó' : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="d-flex flex-wrap gap-2">
            <button type="button" className="btn btn-success" onClick={generateBracket}>
              Ágrajz generálása ({qualifiedTeamIds.length} csapat)
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => setPhase(PHASES.SETUP)}>
              Vissza a beállításokhoz
            </button>
          </div>
        </div>
      )}

      {phase === PHASES.KNOCKOUT && (
        <div className="card shadow-sm border-0">
          <div className="card-body p-4">
            <h4 className="mb-3">Egyenes kieséses szakasz</h4>
            <p className="text-muted">Kattints a győztes csapat nevére, hogy továbbküldd a következő körbe.</p>

            <div className="d-flex flex-wrap align-items-start justify-content-between gap-4 bg-light rounded p-3">
              {bracket.quarterFinals.length > 0 && (
                <div className="flex-grow-1">
                  <h6 className="fw-bold mb-3">Negyeddöntő</h6>
                  <div className="d-grid gap-2">
                    {bracket.quarterFinals.map((match, index) => (
                      <div key={match.id} className="border rounded p-2 bg-white">
                        <button type="button" className={`btn btn-sm w-100 text-start ${match.winner?.id === match.team1?.id ? 'btn-success' : 'btn-outline-secondary'}`} onClick={() => selectMatchWinner('quarterFinals', index, match.team1)}>
                          {match.team1?.name || 'Üres hely'}
                        </button>
                        <button type="button" className={`btn btn-sm w-100 text-start mt-1 ${match.winner?.id === match.team2?.id ? 'btn-success' : 'btn-outline-secondary'}`} onClick={() => selectMatchWinner('quarterFinals', index, match.team2)}>
                          {match.team2?.name || 'Üres hely'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {bracket.semiFinals.length > 0 && (
                <div className="flex-grow-1">
                  <h6 className="fw-bold mb-3">Elődöntő</h6>
                  <div className="d-grid gap-2">
                    {bracket.semiFinals.map((match, index) => (
                      <div key={match.id} className="border rounded p-2 bg-white">
                        <button type="button" className={`btn btn-sm w-100 text-start ${match.winner?.id === match.team1?.id ? 'btn-success' : 'btn-outline-secondary'}`} onClick={() => selectMatchWinner('semiFinals', index, match.team1)}>
                          {match.team1?.name || 'Várakozás'}
                        </button>
                        <button type="button" className={`btn btn-sm w-100 text-start mt-1 ${match.winner?.id === match.team2?.id ? 'btn-success' : 'btn-outline-secondary'}`} onClick={() => selectMatchWinner('semiFinals', index, match.team2)}>
                          {match.team2?.name || 'Várakozás'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex-grow-1">
                <h6 className="fw-bold mb-3">Döntő</h6>
                <div className="border rounded p-2 bg-white">
                  <button type="button" className={`btn btn-sm w-100 text-start ${bracket.finals[0]?.winner?.id === bracket.finals[0]?.team1?.id ? 'btn-success' : 'btn-outline-secondary'}`} onClick={() => selectMatchWinner('finals', 0, bracket.finals[0]?.team1)}>
                    {bracket.finals[0]?.team1?.name || 'Döntős 1'}
                  </button>
                  <button type="button" className={`btn btn-sm w-100 text-start mt-1 ${bracket.finals[0]?.winner?.id === bracket.finals[0]?.team2?.id ? 'btn-success' : 'btn-outline-secondary'}`} onClick={() => selectMatchWinner('finals', 0, bracket.finals[0]?.team2)}>
                    {bracket.finals[0]?.team2?.name || 'Döntős 2'}
                  </button>
                </div>
                <div className="mt-3 border rounded p-3 bg-warning-subtle">
                  <div className="fw-bold">Bajnok</div>
                  <div>{bracket.winner ? bracket.winner.name : 'Még nincs győztes'}</div>
                </div>
              </div>
            </div>

            <div className="mt-4 d-flex flex-wrap gap-2">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setPhase(PHASES.GROUPS)}>
                Vissza a csoportkörhöz
              </button>
              <button type="button" className="btn btn-outline-danger" onClick={() => setPhase(PHASES.SETUP)}>
                Új verseny indítása
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
