import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// -------- GOOGLE DRIVE ÉS KÉP TÁMOGATÁS --------
export function getGoogleDriveImageUrl(url) {
  if (!url || typeof url !== 'string') return url;
  const trimmed = url.trim();
  const match = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                trimmed.match(/id=([a-zA-Z0-9_-]+)/) ||
                trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1600`;
  }
  return trimmed;
}

// -------- RANGSOROLÓ FÜGGVÉNYEK --------

const getLineRanking = (teams, results) => {
  const teamMap = new Map();
  results.forEach((item) => {
    const name = item.team_name || item.teamName;
    if (!name) return;
    const time = parseFloat(item.time);
    if (isNaN(time)) return;
    if (!teamMap.has(name) || time < teamMap.get(name)) {
      teamMap.set(name, time);
    }
  });
  return Array.from(teamMap.entries())
    .map(([teamName, value]) => ({ teamName, value: `${value.toFixed(3)}s` }))
    .sort((a, b) => parseFloat(a.value) - parseFloat(b.value));
};

const getHillRanking = (teams, results) => {
  const teamMap = new Map();
  results.forEach((item) => {
    const name = item.team_name || item.teamName;
    if (!name) return;
    const level = parseInt(item.completed_level) || 0;
    const time = parseFloat(item.time_spent_on_level) || 0;
    const eliminated = parseInt(item.eliminated) || 0;
    if (!teamMap.has(name) || level > teamMap.get(name).level ||
        (level === teamMap.get(name).level && time < teamMap.get(name).time)) {
      teamMap.set(name, { level, time, eliminated });
    }
  });
  return Array.from(teamMap.entries())
    .map(([teamName, data]) => ({ teamName, value: `${data.level}. szint (${data.time}s)`, level: data.level, time: data.time, eliminated: data.eliminated }))
    .sort((a, b) => {
      if (a.eliminated !== b.eliminated) return a.eliminated - b.eliminated;
      if (a.level !== b.level) return b.level - a.level;
      return a.time - b.time;
    });
};

const getSumoRanking = (teams, matches) => {
  const teamPoints = new Map();
  matches.forEach((match) => {
    const t1 = match.team1Name || match.team1_name;
    const t2 = match.team2Name || match.team2_name;
    const p1 = parseInt(match.team1Point || match.team1_point) || 0;
    const p2 = parseInt(match.team2Point || match.team2_point) || 0;
    if (t1) teamPoints.set(t1, (teamPoints.get(t1) || 0) + p1);
    if (t2) teamPoints.set(t2, (teamPoints.get(t2) || 0) + p2);
  });
  return Array.from(teamPoints.entries())
    .map(([teamName, value]) => ({ teamName, value: `${value} pont` }))
    .sort((a, b) => parseInt(b.value) - parseInt(a.value));
};

const getBasketRanking = (teams, results) => {
  const teamMap = new Map();
  results.forEach((item) => {
    const name = item.team_name || item.teamName;
    if (!name) return;
    const hits = (parseInt(item.hoop1) || 0) + (parseInt(item.hoop2) || 0) +
                 (parseInt(item.hoop3) || 0) + (parseInt(item.hoop4) || 0) +
                 (parseInt(item.hoop5) || 0);
    const time = parseFloat(item.time) || Infinity;
    if (!teamMap.has(name) || hits > teamMap.get(name).hits ||
        (hits === teamMap.get(name).hits && time < teamMap.get(name).time)) {
      teamMap.set(name, { hits, time });
    }
  });
  return Array.from(teamMap.entries())
    .map(([teamName, data]) => ({ teamName, value: `${data.hits} találat (${data.time}s)` }))
    .sort((a, b) => parseInt(b.value) - parseInt(a.value) || parseFloat(a.value.split('(')[1]) - parseFloat(b.value.split('(')[1]));
};

// -------- ALAP BEÁLLÍTÁSOK --------

const competitions = [
  { id: 'line', label: 'Vonalkövetés', api: 'api/LineFollowing/bestattempts', rankFn: getLineRanking },
  { id: 'hill', label: 'Hegymászás', api: 'api/HillClimbing/bestattempts', rankFn: getHillRanking },
  { id: 'basket', label: 'Kosárra dobás', api: 'api/Basketball/bestattempts', rankFn: getBasketRanking },
  { id: 'sumo', label: 'Szumó', api: 'api/Sumo/matches', rankFn: getSumoRanking },
];

const DEFAULT_SLIDE_SEQUENCE = [
  { id: 'seq-1', compId: 'line', label: 'Vonalkövetés' },
  { id: 'seq-2', compId: 'hill', label: 'Hegymászás' },
  { id: 'seq-3', compId: 'basket', label: 'Kosárra dobás' },
  { id: 'seq-4', compId: 'sumo', label: 'Szumó' },
  { id: 'seq-5', compId: 'combined', label: 'Összetett díjátadó' },
];

// -------- FŐKOMPONENS --------

export default function TopThrees({ userPrivilege }) {
  const navigate = useNavigate();

  // Jogosultság ellenőrzés
  useEffect(() => {
    if (userPrivilege !== 1) {
      navigate('/');
    }
  }, [userPrivilege, navigate]);

  // Fullscreen belépéskor
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        // Fullscreen kérés elutasítva vagy nem támogatott
      }
    };
    enterFullscreen();

    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  // Állapotok
  const [selectedCompetition, setSelectedCompetition] = useState('line');
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [allTeams, setAllTeams] = useState([]);
  // Megjelenítési lépés:
  // Versenyszámoknál: 0 = rejtett (?), 1 = 1. hely felfedve
  // Összetettnél: 0 = rejtett (?), 1 = 3. hely, 2 = 2. hely, 3 = 1. hely
  const [revealStep, setRevealStep] = useState(0);

  const [slideSequence, setSlideSequence] = useState(() => {
    try {
      const saved = localStorage.getItem('brickathlon_top3_sequence');
      if (!saved) return DEFAULT_SLIDE_SEQUENCE;
      const parsed = JSON.parse(saved);
      // Ha a mentett sorrend még a régi (pl. több elem vagy kategóriás felirat/cat kulcs)
      if (Array.isArray(parsed) && parsed.some(item => item.label?.includes('iskola') || item.cat !== undefined)) {
        localStorage.removeItem('brickathlon_top3_sequence');
        return DEFAULT_SLIDE_SEQUENCE;
      }
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_SLIDE_SEQUENCE;
    } catch {
      return DEFAULT_SLIDE_SEQUENCE;
    }
  });

  const [currentSeqIndex, setCurrentSeqIndex] = useState(0);
  const [isSequenceMode, setIsSequenceMode] = useState(false);
  const [showSeqManager, setShowSeqManager] = useState(false);

  // Adatok lekérése
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    setRevealStep(0);

    try {
      const teamsRes = await fetch('https://brickathlon.runasp.net/api/Teams');
      if (!teamsRes.ok) throw new Error('Nem sikerült betölteni a csapatokat.');
      const teamsData = await teamsRes.json();
      setAllTeams(teamsData);
      const teamNames = new Set(teamsData.map(t => t.teamName));

      if (selectedCompetition === 'combined') {
        // Összetett pontverseny adatai az api/Points végpontról
        const pointsRes = await fetch('https://brickathlon.runasp.net/api/Points');
        if (!pointsRes.ok) throw new Error('Nem sikerült betölteni az összetett pontokat.');
        const pointsData = await pointsRes.json();

        const ranking = (Array.isArray(pointsData) ? pointsData : [])
          .filter(item => teamNames.has(item.teamName))
          .sort((a, b) => Number(b.allPoint || 0) - Number(a.allPoint || 0) || (a.teamName || '').localeCompare(b.teamName || '', 'hu'))
          .map(item => ({
            teamName: item.teamName,
            value: `${Number(item.allPoint || 0)} pont`
          }));

        // Összetettben a TOP 3 jelenik meg
        setRankings(ranking.slice(0, 3));
      } else {
        const comp = competitions.find(c => c.id === selectedCompetition);
        if (!comp) throw new Error('Ismeretlen versenyszám.');
        const endpoint = comp.api.replace(/^\/+/, '');
        const res = await fetch(`https://brickathlon.runasp.net/${endpoint}`);
        if (!res.ok) throw new Error(`Nem sikerült betölteni a(z) ${comp.label} adatokat.`);
        const data = await res.json();

        let results = Array.isArray(data) ? data : [];
        const ranking = comp.rankFn(teamsData, results);
        const filteredRanking = ranking.filter(item => teamNames.has(item.teamName));

        // A 4 versenyszámban CSAK az 1. helyezett jelenik meg
        setRankings(filteredRanking.slice(0, 1));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedCompetition]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Léptetés előre
  const nextStep = useCallback(() => {
    const isCombined = selectedCompetition === 'combined';
    const maxStep = isCombined ? Math.min(3, rankings.length) : Math.min(1, rankings.length);

    if (revealStep < maxStep) {
      setRevealStep(prev => prev + 1);
    } else if (isSequenceMode) {
      // Ha már lelepleződött minden a jelenlegi dián, továbblép a következő diára
      if (currentSeqIndex < slideSequence.length - 1) {
        const nextIdx = currentSeqIndex + 1;
        setCurrentSeqIndex(nextIdx);
        const nextSlide = slideSequence[nextIdx];
        setSelectedCompetition(nextSlide.compId);
        setRevealStep(0);
      } else {
        setIsSequenceMode(false);
      }
    }
  }, [selectedCompetition, rankings.length, revealStep, isSequenceMode, currentSeqIndex, slideSequence]);

  // Visszaléptetés
  const prevStep = useCallback(() => {
    if (revealStep > 0) {
      setRevealStep(prev => prev - 1);
    } else if (isSequenceMode && currentSeqIndex > 0) {
      const prevIdx = currentSeqIndex - 1;
      setCurrentSeqIndex(prevIdx);
      const prevSlide = slideSequence[prevIdx];
      setSelectedCompetition(prevSlide.compId);
      setRevealStep(0);
    }
  }, [revealStep, isSequenceMode, currentSeqIndex, slideSequence]);

  // Billentyűzet kezelés (Space / Jobbra nyíl előre, Balra nyíl vissza)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevStep();
      } else if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextStep, prevStep]);

  if (userPrivilege !== 1) return null;

  const getTeamDetails = (teamName) => {
    return allTeams.find(t => t.teamName === teamName);
  };

  const currentTitle = selectedCompetition === 'combined'
    ? 'Összetett díjátadó'
    : competitions.find(c => c.id === selectedCompetition)?.label || '';

  const isCombined = selectedCompetition === 'combined';
  const maxStep = isCombined ? Math.min(3, rankings.length) : Math.min(1, rankings.length);
  const isSlideFullyRevealed = revealStep >= maxStep;

  return (
    <div style={fullscreenStyle}>
      <div style={controlsStyle}>
        <div style={controlGroupStyle}>
          <button
            onClick={() => setShowSeqManager(true)}
            style={{
              ...controlButtonStyle,
              background: isSequenceMode ? '#4cc9f0' : 'rgba(255,255,255,0.1)',
              color: isSequenceMode ? '#0a1a2b' : '#fff',
              border: '2px solid ' + (isSequenceMode ? '#4cc9f0' : 'rgba(255,255,255,0.3)'),
            }}
          >
            <i className="bi bi-list-ol me-1"></i>
            {isSequenceMode ? `Vetítés (${currentSeqIndex + 1}/${slideSequence.length})` : 'Sorrend testreszabása'}
          </button>

          {isSequenceMode && (
            <>
              {currentSeqIndex > 0 && (
                <button
                  onClick={() => {
                    const prevIdx = currentSeqIndex - 1;
                    setCurrentSeqIndex(prevIdx);
                    setSelectedCompetition(slideSequence[prevIdx].compId);
                    setRevealStep(0);
                  }}
                  style={{
                    ...controlButtonStyle,
                    background: 'rgba(255,255,255,0.15)',
                    color: '#fff',
                    border: '2px solid rgba(255,255,255,0.3)',
                  }}
                >
                  <i className="bi bi-chevron-left me-1"></i> Előző dia
                </button>
              )}
              <button
                onClick={() => {
                  if (currentSeqIndex < slideSequence.length - 1) {
                    const nextIdx = currentSeqIndex + 1;
                    setCurrentSeqIndex(nextIdx);
                    setSelectedCompetition(slideSequence[nextIdx].compId);
                    setRevealStep(0);
                  } else {
                    setIsSequenceMode(false);
                  }
                }}
                style={{
                  ...controlButtonStyle,
                  background: '#80ed99',
                  color: '#0a1a2b',
                  border: '2px solid #80ed99',
                }}
              >
                {currentSeqIndex < slideSequence.length - 1 ? (
                  <>Következő dia <i className="bi bi-chevron-right ms-1"></i></>
                ) : (
                  'Vetítés befejezése'
                )}
              </button>
            </>
          )}

          <button
            onClick={nextStep}
            style={{
              ...controlButtonStyle,
              background: '#fde74c',
              color: '#0a1a2b',
              border: '2px solid #fde74c',
            }}
            title="Space vagy Jobbra nyíl billentyűvel is léptethető"
          >
            {isSlideFullyRevealed && isSequenceMode ? (
              <>Következő dia <i className="bi bi-arrow-right ms-1"></i></>
            ) : (
              <>Léptetés <i className="bi bi-play-fill ms-1"></i></>
            )}
          </button>
        </div>

        <div style={controlGroupStyle}>
          {[...competitions, { id: 'combined', label: 'Összetett' }].map(comp => (
            <button
              key={comp.id}
              onClick={() => {
                setSelectedCompetition(comp.id);
                setRevealStep(0);
              }}
              style={{
                ...controlButtonStyle,
                background: selectedCompetition === comp.id ? '#fde74c' : 'transparent',
                color: selectedCompetition === comp.id ? '#0a1a2b' : '#fff',
                border: selectedCompetition === comp.id ? '2px solid #fde74c' : '2px solid rgba(255,255,255,0.3)',
              }}
            >
              {comp.label}
            </button>
          ))}
        </div>

        <div style={controlGroupStyle}>
          <button
            onClick={() => navigate('/')}
            title="Kilépés"
            style={{
              ...controlButtonStyle,
              background: 'rgba(255,255,255,0.1)',
              border: '2px solid rgba(255,255,255,0.3)',
              color: '#fff',
              opacity: 0.6,
            }}
          >
            <i className="bi bi-arrow-bar-left"></i>
          </button>
        </div>
      </div>

      <div style={contentStyle}>
        {loading && (
          <div style={{ fontSize: '1.8rem', fontWeight: '300' }}>Betöltés...</div>
        )}
        {error && (
          <div style={{ color: '#e55934', fontSize: '1.4rem' }}>{error}</div>
        )}

        {!loading && !error && (
          <div style={{ width: '100%', textAlign: 'center' }}>
            <h2 style={{
              fontSize: '3rem',
              fontWeight: '800',
              color: '#fde74c',
              marginBottom: '2.5rem',
              letterSpacing: '1px',
              textShadow: '0 4px 15px rgba(0,0,0,0.5)'
            }}>
              {currentTitle}
            </h2>

            {rankings.length === 0 ? (
              <div style={{ fontSize: '1.8rem', fontWeight: '300', color: '#ccc' }}>
                Még nincs rögzített eredmény ebben a kategóriában.
              </div>
            ) : isCombined ? (
              <CombinedPodium
                rankings={rankings}
                revealStep={revealStep}
                getTeamDetails={getTeamDetails}
              />
            ) : (
              <SinglePodium
                winner={rankings[0]}
                revealStep={revealStep}
                getTeamDetails={getTeamDetails}
              />
            )}
          </div>
        )}
      </div>

      {showSeqManager && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
        }}>
          <div style={{
            background: '#0d2238',
            borderRadius: '1rem',
            padding: '2rem',
            maxWidth: '650px',
            width: '100%',
            color: '#fff',
            border: '2px solid #fde74c',
            boxShadow: '0 10px 40px rgba(0,0,0,0.7)',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: '#fde74c', fontSize: '1.5rem' }}>
                <i className="bi bi-sliders me-2"></i>Eredményhirdetés Sorrend
              </h3>
              <button
                onClick={() => setShowSeqManager(false)}
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>
            <p style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Állítsd be a vetítés sorrendjét a gombokkal. A vetítés módban a Space vagy a Jobbra nyíl fokozatosan fedi fel a helyezetteket, majd automatikusan a következő diára lép!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {slideSequence.map((item, idx) => (
                <div
                  key={item.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 1rem',
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(255,255,255,0.15)',
                  }}
                >
                  <span style={{ fontWeight: 'bold' }}>
                    <span style={{ color: '#fde74c', marginRight: '0.75rem' }}>{idx + 1}.</span>
                    {item.label}
                  </span>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      disabled={idx === 0}
                      onClick={() => {
                        const copy = [...slideSequence];
                        const temp = copy[idx - 1];
                        copy[idx - 1] = copy[idx];
                        copy[idx] = temp;
                        setSlideSequence(copy);
                        localStorage.setItem('brickathlon_top3_sequence', JSON.stringify(copy));
                      }}
                      style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer' }}
                    >
                      &uarr;
                    </button>
                    <button
                      disabled={idx === slideSequence.length - 1}
                      onClick={() => {
                        const copy = [...slideSequence];
                        const temp = copy[idx + 1];
                        copy[idx + 1] = copy[idx];
                        copy[idx] = temp;
                        setSlideSequence(copy);
                        localStorage.setItem('brickathlon_top3_sequence', JSON.stringify(copy));
                      }}
                      style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer' }}
                    >
                      &darr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setSlideSequence(DEFAULT_SLIDE_SEQUENCE);
                  localStorage.removeItem('brickathlon_top3_sequence');
                }}
                style={{ padding: '0.6rem 1.2rem', borderRadius: '2rem', background: 'transparent', border: '1px solid #aaa', color: '#fff', cursor: 'pointer' }}
              >
                Alaphelyzet
              </button>
              <button
                onClick={() => {
                  setShowSeqManager(false);
                  setIsSequenceMode(true);
                  setCurrentSeqIndex(0);
                  const firstSlide = slideSequence[0];
                  setSelectedCompetition(firstSlide.compId);
                  setRevealStep(0);
                }}
                style={{ padding: '0.6rem 1.4rem', borderRadius: '2rem', background: '#fde74c', border: 'none', color: '#0a1a2b', fontWeight: 'bold', cursor: 'pointer' }}
              >
                <i className="bi bi-play-fill me-1"></i>Vetítés indítása innen
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={footerStyle}>
        Brickathlon • Eredményhirdetés (Space / ➔ Léptetés)
      </div>
    </div>
  );
}

// -------- EGYEDI VERSENYSZÁM NÉZET (CSAK AZ 1. HELYEZETT) --------

function SinglePodium({ winner, revealStep, getTeamDetails }) {
  const showWinner = revealStep >= 1;

  return (
    <>
      {showWinner && <Confetti />}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        {winner && (
          <PodiumPlace
            rank={1}
            team={winner}
            details={getTeamDetails(winner.teamName)}
            show={showWinner}
            single
          />
        )}
      </div>
    </>
  );
}

// -------- ÖSSZETETT NÉZET (TOP 3 HELYEZETT) --------

function CombinedPodium({ rankings, revealStep, getTeamDetails }) {
  const showThird = revealStep >= 1;
  const showSecond = revealStep >= 2;
  const showFirst = revealStep >= 3;

  return (
    <>
      {showFirst && <Confetti />}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: '3rem',
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        {rankings[1] && (
          <PodiumPlace
            rank={2}
            team={rankings[1]}
            details={getTeamDetails(rankings[1].teamName)}
            show={showSecond}
          />
        )}
        {rankings[0] && (
          <PodiumPlace
            rank={1}
            team={rankings[0]}
            details={getTeamDetails(rankings[0].teamName)}
            show={showFirst}
          />
        )}
        {rankings[2] && (
          <PodiumPlace
            rank={3}
            team={rankings[2]}
            details={getTeamDetails(rankings[2].teamName)}
            show={showThird}
          />
        )}
      </div>
    </>
  );
}

// -------- DOBOGÓ HELYEZÉS KOMPONENS --------

function PodiumPlace({ rank, team, details, show, single }) {
  const height = rank === 1 ? '180px' : rank === 2 ? '140px' : '100px';
  const color = rank === 1 ? '#fde74c' : rank === 2 ? '#c0c0c0' : '#cd7f32';
  const isFirst = rank === 1;

  // Dinamikus betűméret az iskola nevének hossza alapján
  const schoolName = details?.schoolName || 'Nincs iskola';
  const schoolFontSize = schoolName.length > 28 ? '0.75rem' 
                       : schoolName.length > 20 ? '0.85rem' 
                       : '1rem';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
      opacity: 1,
      transform: show ? 'translateY(0)' : 'translateY(60px)',
      width: single ? '280px' : '230px',
    }}>
      <div style={{
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: '1rem',
        padding: single ? '2rem 1.2rem 2.2rem' : '1.5rem 1rem 2rem',
        textAlign: 'center',
        width: '100%',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        border: `2px solid ${color}`,
        backdropFilter: 'blur(4px)',
        minHeight: isFirst ? '250px' : '230px',
        boxSizing: 'border-box',
      }}>
        <div style={{ fontSize: isFirst ? '3.5rem' : '2.8rem', fontWeight: '900', color, lineHeight: 1 }}>
          #{rank}
        </div>
        {show ? (
          <>
            <div style={{ fontSize: isFirst ? '2rem' : '1.6rem', fontWeight: '700', marginTop: '0.4rem', color: '#fff' }}>
              {team.teamName || 'Ismeretlen'}
            </div>
            {details && (
              <>
                <div style={{ 
                  fontSize: schoolFontSize, 
                  color: '#ccc', 
                  marginTop: '0.3rem',
                  wordBreak: 'break-word',
                }}>
                  {schoolName}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#aaa', marginTop: '0.2rem' }}>
                  {details.teamMember1Name || ''}{details.teamMember2Name ? `, ${details.teamMember2Name}` : ''}
                </div>
              </>
            )}
            <div style={{
              marginTop: '0.9rem',
              fontSize: '1.25rem',
              fontWeight: '600',
              background: 'rgba(255,255,255,0.1)',
              padding: '0.4rem 0.9rem',
              borderRadius: '2rem',
              display: 'inline-block',
              color: color,
            }}>
              {team.value ?? ''}
            </div>
          </>
        ) : (
          <div style={{
            minHeight: '6.2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '4.5rem',
            fontWeight: '900',
            color,
            lineHeight: 1,
          }}>
            ?
          </div>
        )}
      </div>
      <div style={{
        width: '60%',
        height,
        background: `linear-gradient(180deg, ${color}88, ${color}22)`,
        borderTop: `4px solid ${color}`,
        borderRadius: '0 0 8px 8px',
        marginTop: '-1px',
        transition: 'height 0.6s ease',
      }} />
    </div>
  );
}

// -------- KONFETTI ANIMÁCIÓ --------

function Confetti() {
  const colors = ['#fde74c', '#e55934', '#4cc9f0', '#80ed99', '#f72585', '#ffffff'];

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translate3d(0, -10vh, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate3d(var(--drift), 110vh, 0) rotate(720deg); opacity: 0; }
        }
      `}</style>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 20, overflow: 'hidden' }}>
        {Array.from({ length: 45 }, (_, index) => (
          <span
            key={index}
            style={{
              position: 'absolute',
              top: '-1rem',
              left: `${(index * 37) % 101}%`,
              width: index % 3 === 0 ? '0.7rem' : '0.45rem',
              height: index % 2 === 0 ? '1rem' : '0.55rem',
              backgroundColor: colors[index % colors.length],
              transform: `rotate(${index * 29}deg)`,
              '--drift': `${(index % 2 === 0 ? 1 : -1) * (80 + (index % 5) * 25)}px`,
              animation: `confetti-fall ${2.2 + (index % 6) * 0.18}s linear ${index * 0.035}s forwards`,
            }}
          />
        ))}
      </div>
    </>
  );
}

// -------- STÍLUSOK --------

const fullscreenStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: '#0a1a2b',
  color: '#fff',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'Inter, system-ui, sans-serif',
  zIndex: 9999,
  overflow: 'hidden',
  padding: '2rem',
};

const controlsStyle = {
  position: 'absolute',
  top: '1.5rem',
  left: '1.5rem',
  right: '1.5rem',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.8rem',
  justifyContent: 'center',
  zIndex: 10,
  background: 'rgba(0,0,0,0.4)',
  padding: '0.8rem 1.2rem',
  borderRadius: '0.75rem',
  backdropFilter: 'blur(6px)',
};

const controlGroupStyle = {
  display: 'flex',
  gap: '0.5rem',
  flexWrap: 'wrap',
};

const controlButtonStyle = {
  padding: '0.5rem 1.2rem',
  borderRadius: '2rem',
  fontWeight: 'bold',
  cursor: 'pointer',
  transition: 'all 0.2s',
  fontSize: '0.95rem',
  background: 'transparent',
  color: '#fff',
};

const contentStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  maxWidth: '1400px',
  marginTop: '4rem',
};

const footerStyle = {
  position: 'absolute',
  bottom: '1.5rem',
  fontSize: '0.9rem',
  opacity: 0.5,
  color: '#aaa',
};
