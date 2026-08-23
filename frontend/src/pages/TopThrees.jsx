import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// -------- RANGSOROLÓ FÜGGVÉNYEK (változatlan) --------

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
    const name = item.teamName;
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

// -------- KOMPONENS --------

const competitions = [
  { id: 'line', label: 'Vonalkövetés', api: '/api/LineFollowing', rankFn: getLineRanking },
  { id: 'hill', label: 'Hegymászás', api: '/api/HillClimbing', rankFn: getHillRanking },
  { id: 'sumo', label: 'Szumó', api: '/api/Sumo/matches', rankFn: getSumoRanking },
  { id: 'basket', label: 'Kosárra dobás', api: '/api/Basketball', rankFn: getBasketRanking },
];

const categoryLabels = ['Általános iskola', 'Középiskola'];

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
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [allTeams, setAllTeams] = useState([]);
  const [isCombined, setIsCombined] = useState(false);
  const [combinedData, setCombinedData] = useState(null);
  // Megjelenítési lépés: 0 = nincs, 1 = 3. hely, 2 = 2. hely, 3 = 1. hely
  const [revealStep, setRevealStep] = useState(0);
  // Összesített nézetben az aktuális dia indexe
  const [currentSlide, setCurrentSlide] = useState(0);
  // Összesített nézetben az egyes versenyszámokhoz tartozó lépések
  const [combinedSteps, setCombinedSteps] = useState({});

  // Adatok lekérése
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    setRevealStep(0);
    setCurrentSlide(0);
    setCombinedSteps({});

    try {
      const teamsRes = await fetch('https://legocompetition.runasp.net/api/Teams');
      if (!teamsRes.ok) throw new Error('Nem sikerült betölteni a csapatokat.');
      const teamsData = await teamsRes.json();
      setAllTeams(teamsData);

      if (selectedCompetition === 'combined') {
        setIsCombined(true);
        const allResults = {};
        // Összesített nézetben NEM szűrünk korcsoport szerint – mindkettőt mutatjuk
        const filteredTeams = teamsData; // az összes csapat
        const teamNames = new Set(filteredTeams.map(t => t.teamName));
        for (const comp of competitions) {
          try {
            const res = await fetch(`https://legocompetition.runasp.net${comp.api}`);
            if (res.ok) {
              const data = await res.json();
              let results = Array.isArray(data) ? data : [];
              const ranking = comp.rankFn(filteredTeams, results);
              const filteredRanking = ranking.filter(item => teamNames.has(item.teamName));
              allResults[comp.id] = filteredRanking.slice(0, 3);
            }
          } catch (err) {
            allResults[comp.id] = [];
          }
        }
        setCombinedData(allResults);
        const initialSteps = {};
        Object.keys(allResults).forEach(key => { initialSteps[key] = 0; });
        setCombinedSteps(initialSteps);
        setRankings([]);
      } else {
        setIsCombined(false);
        const comp = competitions.find(c => c.id === selectedCompetition);
        if (!comp) throw new Error('Ismeretlen versenyszám.');
        const res = await fetch(`https://legocompetition.runasp.net${comp.api}`);
        if (!res.ok) throw new Error(`Nem sikerült betölteni a(z) ${comp.label} adatokat.`);
        const data = await res.json();

        const filteredTeams = teamsData.filter(team => Number(team.category) === selectedCategory);
        const teamNames = new Set(filteredTeams.map(t => t.teamName));
        let results = Array.isArray(data) ? data : [];
        const ranking = comp.rankFn(filteredTeams, results);
        const filteredRanking = ranking.filter(item => teamNames.has(item.teamName));
        const top3 = filteredRanking.slice(0, 3);
        setRankings(top3);
        setCombinedData(null);
        setRevealStep(0);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedCompetition, selectedCategory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Léptetés előre
  const nextStep = () => {
    if (isCombined) {
      if (!combinedData) return;
      const keys = Object.keys(combinedData);
      if (keys.length === 0) return;
      const currentKey = keys[currentSlide];
      const currentRankings = combinedData[currentKey] || [];
      const maxStep = currentRankings.length;
      setCombinedSteps(prev => {
        const newStep = (prev[currentKey] || 0) + 1;
        const nextStepValue = Math.min(newStep, maxStep);
        return { ...prev, [currentKey]: nextStepValue };
      });
    } else {
      const maxStep = rankings.length;
      setRevealStep(prev => Math.min(prev + 1, maxStep));
    }
  };

  // Visszaléptetés
  const prevStep = () => {
    if (isCombined) {
      if (!combinedData) return;
      const keys = Object.keys(combinedData);
      if (keys.length === 0) return;
      const currentKey = keys[currentSlide];
      setCombinedSteps(prev => {
        const newStep = Math.max((prev[currentKey] || 0) - 1, 0);
        return { ...prev, [currentKey]: newStep };
      });
    } else {
      setRevealStep(prev => Math.max(prev - 1, 0));
    }
  };

  // Dia váltás összesített nézetben
  const goToSlide = (index) => {
    if (index < 0 || index >= Object.keys(combinedData || {}).length) return;
    setCurrentSlide(index);
  };

  // Billentyűzet kezelés
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

  const combinedKeys = combinedData ? Object.keys(combinedData) : [];
  const combinedLabels = {
    line: 'Vonalkövetés',
    hill: 'Hegymászás',
    sumo: 'Szumó',
    basket: 'Kosárra dobás'
  };

  return (
    <div style={fullscreenStyle}>
      <div style={controlsStyle}>
        <div style={controlGroupStyle}>
          {[...competitions, { id: 'combined', label: 'Összesített' }].map(comp => (
            <button
              key={comp.id}
              onClick={() => {
                setSelectedCompetition(comp.id);
                setCurrentSlide(0);
                setRevealStep(0);
                setCombinedSteps({});
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
          {[0, 1].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                ...controlButtonStyle,
                background: selectedCategory === cat ? '#fde74c' : 'transparent',
                color: selectedCategory === cat ? '#0a1a2b' : '#fff',
                border: selectedCategory === cat ? '2px solid #fde74c' : '2px solid rgba(255,255,255,0.3)',
              }}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>
        <div style={controlGroupStyle}>
          <button
            onClick={() => navigate('/')}
            style={{
              ...controlButtonStyle,
              background: 'rgba(255,255,255,0.1)',
              border: '2px solid rgba(255,255,255,0.3)',
              color: '#fff',
              opacity: 0.2,
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

        {!loading && !error && isCombined && combinedData && (
          <CombinedView
            data={combinedData}
            keys={combinedKeys}
            currentSlide={currentSlide}
            labels={combinedLabels}
            getTeamDetails={getTeamDetails}
            steps={combinedSteps}
            onSlideChange={goToSlide}
          />
        )}

        {!loading && !error && !isCombined && rankings.length === 0 && (
          <div style={{ fontSize: '1.8rem', fontWeight: '300' }}>
            Nincs adat a kiválasztott kategóriában.
          </div>
        )}

        {!loading && !error && !isCombined && rankings.length > 0 && (
          <SingleView
            rankings={rankings}
            revealStep={revealStep}
            getTeamDetails={getTeamDetails}
          />
        )}
      </div>

      <div style={footerStyle}>
        Brickathlon • Eredményhirdetés        
      </div>
    </div>
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

// -------- EGYEDI VERSENYSZÁM NÉZET --------

function SingleView({ rankings, revealStep, getTeamDetails }) {
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
        maxWidth: '100%',
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

// -------- ÖSSZESÍTETT NÉZET --------

function CombinedView({ data, keys, currentSlide, labels, getTeamDetails, steps, onSlideChange }) {
  if (keys.length === 0) return null;
  const currentKey = keys[currentSlide];
  const rankings = data[currentKey] || [];
  const currentStep = steps[currentKey] || 0;
  const showThird = currentStep >= 1;
  const showSecond = currentStep >= 2;
  const showFirst = currentStep >= 3;

  return (
    <div style={{ textAlign: 'center', width: '100%' }}>
      {showFirst && <Confetti key={currentKey} />}
      <h2 style={{ fontSize: '2.8rem', fontWeight: '700', color: '#fde74c', marginBottom: '1.5rem' }}>
        {labels[currentKey] || currentKey}
      </h2>
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
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '1rem',
        marginTop: '2rem',
      }}>
        {keys.map((key, index) => (
          <button
            key={key}
            onClick={() => onSlideChange(index)}
            style={{
              padding: '0.5rem 1.2rem',
              borderRadius: '2rem',
              background: index === currentSlide ? '#fde74c' : 'rgba(255,255,255,0.1)',
              color: index === currentSlide ? '#0a1a2b' : '#fff',
              border: '2px solid ' + (index === currentSlide ? '#fde74c' : 'rgba(255,255,255,0.3)'),
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {labels[key] || key}
          </button>
        ))}
      </div>
    </div>
  );
}

// -------- DOBOGÓ KOMPONENS --------

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
        {Array.from({ length: 42 }, (_, index) => (
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

function PodiumPlace({ rank, team, details, show }) {
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
      transform: show ? `translateY(0)` : `translateY(60px)`,
      width: '220px',
    }}>
      <div style={{
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: '1rem',
        padding: '1.5rem 1rem 2rem',
        textAlign: 'center',
        width: '100%',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        border: `2px solid ${color}`,
        backdropFilter: 'blur(4px)',
        minHeight: isFirst ? '250px' : '230px',
        boxSizing: 'border-box',
      }}>
        <div style={{ fontSize: isFirst ? '3.2rem' : '2.8rem', fontWeight: '900', color, lineHeight: 1 }}>
          #{rank}
        </div>
        {show ? (
          <>
            <div style={{ fontSize: isFirst ? '1.8rem' : '1.6rem', fontWeight: '700', marginTop: '0.3rem', color: '#fff' }}>
              {team.teamName || 'Ismeretlen'}
            </div>
            {details && (
              <>
                <div style={{ 
                  fontSize: schoolFontSize,
                  color: '#ccc', 
                  marginTop: '0.2rem',
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
              marginTop: '0.8rem',
              fontSize: '1.2rem',
              fontWeight: '600',
              background: 'rgba(255,255,255,0.1)',
              padding: '0.4rem 0.8rem',
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