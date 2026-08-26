import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getAllCompetitionPhases, getAllSettings } from '../services/sumoScheduleConfigApi'

const API = 'https://legocompetition.runasp.net/api'
const SLIDE_SECONDS = 20
const SLIDE_OPTIONS = [
  { id: 'overview', label: 'Verseny állapota és menetrend', icon: 'bi-clock-history' },
  { id: 'overall', label: 'Összesített állás', icon: 'bi-trophy-fill' },
  { id: 'sports', label: 'A négy versenyszám élmezőnye', icon: 'bi-grid-fill' },
  { id: 'line', label: 'Vonalkövetés külön dia', icon: 'bi-sign-turn-right' },
  { id: 'hill', label: 'Hegymászás külön dia', icon: 'bi-graph-up-arrow' },
  { id: 'basketball', label: 'Kosárra dobás külön dia', icon: 'bi-bullseye' },
  { id: 'sumo', label: 'Szumó tabella külön dia', icon: 'bi-record-circle' },
  { id: 'matches', label: 'Szumómérkőzések', icon: 'bi-diagram-3-fill' }
]
const defaultSlideOrder = SLIDE_OPTIONS.map((option) => option.id)
const DETAIL_OPTIONS = {
  overview: [{ id: 'time', label: 'Szakasz időpontja' }, { id: 'next', label: 'Következő szakasz' }, { id: 'age', label: 'Korosztálybontás' }, { id: 'teams', label: 'Csapatlétszám' }],
  overall: [{ id: 'category', label: 'Korosztályjelölés' }, { id: 'line', label: 'Vonalkövetés pontja' }, { id: 'hill', label: 'Hegymászás pontja' }, { id: 'sumo', label: 'Szumó pontja' }, { id: 'basketball', label: 'Kosár pontja' }, { id: 'total', label: 'Összpontszám' }],
  sports: [{ id: 'line', label: 'Vonalkövetés' }, { id: 'hill', label: 'Hegymászás' }, { id: 'basketball', label: 'Kosárra dobás' }, { id: 'sumo', label: 'Szumó' }, { id: 'category', label: 'Korosztályjelölés' }, { id: 'value', label: 'Eredményértékek' }],
  line: [{ id: 'category', label: 'Korosztály' }, { id: 'time', label: 'Idő' }, { id: 'stage', label: 'Szakasz' }],
  hill: [{ id: 'category', label: 'Korosztály' }, { id: 'level', label: 'Teljesített szint' }, { id: 'time', label: 'Felhasznált idő' }],
  basketball: [{ id: 'category', label: 'Korosztály' }, { id: 'points', label: 'Pontszám' }, { id: 'time', label: 'Felhasznált idő' }],
  sumo: [{ id: 'category', label: 'Korosztály' }, { id: 'points', label: 'Pontszám' }, { id: 'wins', label: 'Győzelmek' }],
  matches: [{ id: 'table', label: 'Mérkőzés sorszáma' }, { id: 'status', label: 'Állapot' }, { id: 'results', label: 'Meneteredmények' }]
}
const defaultDetails = Object.fromEntries(Object.entries(DETAIL_OPTIONS).map(([id, options]) => [id, options.map((option) => option.id)]))
const storedDetails = () => {
  try {
    const stored = JSON.parse(window.localStorage.getItem('robotverseny_show_details') || '{}')
    return Object.fromEntries(Object.entries(defaultDetails).map(([slideId, defaults]) => {
      const valid = Array.isArray(stored[slideId]) ? stored[slideId].filter((id) => defaults.includes(id)) : defaults
      return [slideId, valid]
    }))
  } catch { return defaultDetails }
}
const storedSlideOrder = () => {
  try {
    const stored = JSON.parse(window.localStorage.getItem('robotverseny_show_slides') || '[]')
    const valid = stored.filter((id) => defaultSlideOrder.includes(id))
    return valid.length ? valid : defaultSlideOrder
  } catch { return defaultSlideOrder }
}

const json = async (path) => {
  const response = await fetch(`${API}${path}`, { headers: { accept: '*/*' }, cache: 'no-store' })
  if (!response.ok) throw new Error(`${path}: ${response.status}`)
  return response.json()
}

const teamName = (item) => item?.teamName || item?.team_name || item?.name || 'Ismeretlen csapat'
const categoryLabel = (category) => Number(category) === 1 ? 'K' : 'Á'
const phaseName = (phase) => phase?.phaseName || phase?.competitionPhaseName || phase?.name || ''
const phaseStart = (phase) => phase?.phaseStartTime ?? phase?.startTime ?? phase?.start
const phaseEnd = (phase) => phase?.phaseEndTime ?? phase?.endTime ?? phase?.end
const timeParts = (value) => String(value || '').match(/(?:T|\s|^)(\d{1,2}):(\d{2})(?::(\d{2}))?/)
const todayAt = (value, reference = new Date()) => {
  const parts = timeParts(value)
  if (!parts) return null
  const date = new Date(reference)
  date.setHours(Number(parts[1]), Number(parts[2]), Number(parts[3] || 0), 0)
  return date
}
const timeLabel = (value) => {
  const parts = timeParts(value)
  return parts ? `${String(parts[1]).padStart(2, '0')}:${parts[2]}` : '–'
}
const countdown = (milliseconds) => {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60
  return [hours, minutes, remainder].map((value) => String(value).padStart(2, '0')).join(':')
}
const number = (...values) => {
  const found = values.find((value) => value !== null && value !== undefined && value !== '')
  return Number(found || 0)
}

function ProjectionTable({ rows, columns, empty = 'Még nincs megjeleníthető eredmény.' }) {
  if (!rows.length) return <div className="show-empty"><i className="bi bi-hourglass-split" /><span>{empty}</span></div>
  return <div className="show-table-wrap"><table><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.key || row.name || index}-${index}`}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row, index) : row[column.key]}</td>)}</tr>)}</tbody></table></div>
}

const CombinedStandingsNotice = () => <div className="show-combined-notice"><i className="bi bi-info-circle-fill" /><span>A megjelenített sorrend a korosztályok <strong>összevont állása</strong>, nem korosztályonként bontott rangsor.</span></div>

const SUMO_STAGE_LABELS = {
  1: 'Alapszakasz',
  2: 'Legjobb 16',
  3: 'Negyeddöntő',
  4: 'Elődöntő',
  5: 'Bronzmérkőzés',
  6: 'Döntő',
  GS: 'Alapszakasz',
  RO16: 'Legjobb 16',
  QF: 'Negyeddöntő',
  SF: 'Elődöntő',
  BM: 'Bronzmérkőzés',
  F: 'Döntő'
}

const getMatchStageName = (stage) => SUMO_STAGE_LABELS[stage] || SUMO_STAGE_LABELS[String(stage).toUpperCase()] || 'Alapszakasz'

const getSumoScore = (resultsStr) => {
  if (!resultsStr) return 0
  const parts = String(resultsStr).split(',')
  return parts.reduce((acc, curr) => {
    const trimmed = curr.trim().toUpperCase()
    if (trimmed === 'W') return acc + 3
    if (trimmed === 'D') return acc + 1
    return acc
  }, 0)
}

const renderResultChips = (resultsStr, alignRight = false) => {
  if (!resultsStr) return null
  const list = String(resultsStr).split(',').map((r) => r.trim().toUpperCase()).filter(Boolean)
  if (!list.length) return null
  return (
    <div className={`d-flex flex-wrap gap-1 align-items-center mt-1 ${alignRight ? 'justify-content-end' : 'justify-content-start'}`}>
      {list.map((r, idx) => (
        <span
          key={idx}
          className={`sumo-history-chip ${r === 'W' ? 'sumo-history-chip--win' : r === 'L' ? 'sumo-history-chip--loss' : 'sumo-history-chip--draw'}`}
        >
          {r}
        </span>
      ))}
    </div>
  )
}

function easeInOutQuad(x) {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2
}

const getStageOrder = (stage) => {
  const s = String(stage || '').toUpperCase()
  if (s === '6' || s === 'F') return 6
  if (s === '5' || s === 'BM') return 5
  if (s === '4' || s === 'SF') return 4
  if (s === '3' || s === 'QF') return 3
  if (s === '2' || s === 'RO16') return 2
  return 1
}

function SumoMatchesSlide({
  activeSumoStageName,
  matches,
  hasDetail
}) {
  const gridRef = useRef(null)
  const matchesKey = useMemo(() => {
    return matches.map((m) => `${m.table}-${m.result1}-${m.result2}`).join('|')
  }, [matches])

  useEffect(() => {
    const el = gridRef.current
    if (!el) return

    let animationFrameId
    const startTime = performance.now()
    const topPause = 3000
    const scrollDownDuration = 6000
    const bottomPause = 3000
    const scrollUpDuration = 6000
    const cycleDuration = topPause + scrollDownDuration + bottomPause + scrollUpDuration

    const t1 = topPause
    const t2 = t1 + scrollDownDuration
    const t3 = t2 + bottomPause
    const t4 = cycleDuration

    const tick = (now) => {
      if (!el) return
      const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight)
      if (maxScroll > 15) {
        const elapsed = (now - startTime) % cycleDuration

        if (elapsed < t1) {
          el.scrollTop = 0
        } else if (elapsed < t2) {
          const progress = Math.min(1, Math.max(0, (elapsed - t1) / scrollDownDuration))
          el.scrollTop = easeInOutQuad(progress) * maxScroll
        } else if (elapsed < t3) {
          el.scrollTop = maxScroll
        } else if (elapsed < t4) {
          const progress = Math.min(1, Math.max(0, (elapsed - t3) / scrollUpDuration))
          el.scrollTop = (1 - easeInOutQuad(progress)) * maxScroll
        } else {
          el.scrollTop = 0
        }
      } else {
        el.scrollTop = 0
      }

      animationFrameId = requestAnimationFrame(tick)
    }

    animationFrameId = requestAnimationFrame(tick)

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
    }
  }, [matchesKey])

  return (
    <section className="show-slide" key="matches">
      <div className="show-slide-title">
        <span>Szumó · {activeSumoStageName}</span>
        <h2>Mérkőzések — {activeSumoStageName}</h2>
      </div>
      <div className="show-match-grid" ref={gridRef}>
        {matches.length ? (
          matches.map((match, index) => {
            const score1 = getSumoScore(match.result1)
            const score2 = getSumoScore(match.result2)
            const hasPlayed = Boolean(match.result1 || match.result2)
            const isTeam1Winning = hasPlayed && score1 > score2
            const isTeam2Winning = hasPlayed && score2 > score1
            const stageName = getMatchStageName(match.stage)
            const matchGradientClass = isTeam1Winning
              ? 'gradient-team1-win'
              : isTeam2Winning
                ? 'gradient-team2-win'
                : ''

            return (
              <article className={`${match.result1 ? 'finished' : 'upcoming'} ${matchGradientClass}`} key={`${match.team1}-${match.team2}-${index}`}>
                <div className="show-match-card-header">
                  <div className="show-match-header-left">
                    {hasDetail('matches', 'status') && <span>{match.result1 ? 'Lejátszva' : 'Következik'}</span>}
                    <span className="show-match-stage-tag">{stageName}</span>
                  </div>
                  {hasDetail('matches', 'table') && <strong>{match.table ? `#${match.table}. mérkőzés` : 'Mérkőzés'}</strong>}
                </div>
                <div className="show-match-card-body">
                  <div className="show-match-side show-match-left">
                    <b title={match.team1}>
                      {match.team1}
                      {isTeam1Winning && <i className="bi bi-trophy-fill ms-2 show-winner-icon" />}
                    </b>
                    {hasDetail('matches', 'results') && renderResultChips(match.result1, false)}
                  </div>
                  <span className="show-match-vs">VS</span>
                  <div className="show-match-side show-match-right">
                    <b title={match.team2}>
                      {isTeam2Winning && <i className="bi bi-trophy-fill me-2 show-winner-icon" />}
                      {match.team2}
                    </b>
                    {hasDetail('matches', 'results') && renderResultChips(match.result2, true)}
                  </div>
                </div>
              </article>
            )
          })
        ) : (
          <div className="show-empty">
            <i className="bi bi-calendar2-event" />
            <span>Még nincs kisorsolt szumómérkőzés.</span>
          </div>
        )}
      </div>
    </section>
  )
}

export default function ShowPage() {
  const [now, setNow] = useState(new Date())
  const [data, setData] = useState({ settings: null, phases: [], teams: [], points: [], line: [], hill: [], basketball: [], sumo: [], matches: [] })
  const [slide, setSlide] = useState(0)
  const [selectedSlideIds, setSelectedSlideIds] = useState(storedSlideOrder)
  const [selectedDetails, setSelectedDetails] = useState(storedDetails)
  const [started, setStarted] = useState(false)
  const [fullscreenOnStart, setFullscreenOnStart] = useState(true)
  const [paused, setPaused] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [connectionError, setConnectionError] = useState(false)
  const [configMessage, setConfigMessage] = useState(null)
  const configFileInputRef = useRef(null)

  const load = useCallback(async () => {
    const requests = await Promise.allSettled([
      getAllSettings(), getAllCompetitionPhases(), json('/Teams'), json('/Points'),
      json('/LineFollowing'), json('/HillClimbing'), json('/Basketball'), json('/Sumo/group'), json('/Sumo/matches')
    ])
    const value = (index, fallback) => requests[index].status === 'fulfilled' ? requests[index].value : fallback
    setData({ settings: value(0, null), phases: value(1, []), teams: value(2, []), points: value(3, []), line: value(4, []), hill: value(5, []), basketball: value(6, []), sumo: value(7, []), matches: value(8, []) })
    setConnectionError(requests.some((request) => request.status === 'rejected'))
    setLastUpdated(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const refresh = window.setInterval(load, 10000)
    const clock = window.setInterval(() => setNow(new Date()), 1000)
    return () => { window.clearInterval(refresh); window.clearInterval(clock) }
  }, [load])

  useEffect(() => {
    if (paused || !started || selectedSlideIds.length < 2) return undefined
    const rotation = window.setInterval(() => setSlide((current) => (current + 1) % selectedSlideIds.length), SLIDE_SECONDS * 1000)
    return () => window.clearInterval(rotation)
  }, [paused, selectedSlideIds.length, started])

  useEffect(() => {
    if (started) load()
  }, [slide, started, load])

  useEffect(() => {
    const keyHandler = (event) => {
      if (!started) return
      if (event.key === 'ArrowRight') setSlide((current) => (current + 1) % selectedSlideIds.length)
      if (event.key === 'ArrowLeft') setSlide((current) => (current - 1 + selectedSlideIds.length) % selectedSlideIds.length)
      if (event.key === ' ') { event.preventDefault(); setPaused((value) => !value) }
      if (event.key.toLowerCase() === 'f') document.documentElement.requestFullscreen?.()
      if (event.key === 'Escape' && !document.fullscreenElement) setStarted(false)
    }
    window.addEventListener('keydown', keyHandler)
    return () => window.removeEventListener('keydown', keyHandler)
  }, [selectedSlideIds.length, started])

  const categoryByTeam = useMemo(() => new Map(data.teams.map((team) => [teamName(team).toLocaleLowerCase('hu-HU'), Number(team.category) || 0])), [data.teams])
  const withCategory = useCallback((name) => categoryByTeam.get(String(name).toLocaleLowerCase('hu-HU')) ?? 0, [categoryByTeam])

  const schedule = useMemo(() => {
    const ordered = [...data.phases].sort((a, b) => (todayAt(phaseStart(a), now)?.getTime() ?? Infinity) - (todayAt(phaseStart(b), now)?.getTime() ?? Infinity))
    const timedActive = ordered.find((phase) => {
      const start = todayAt(phaseStart(phase), now); const end = todayAt(phaseEnd(phase), now)
      return start && end && now >= start && now < end
    })
    const configured = data.settings?.competitionPhase
    const configuredName = typeof configured === 'string' ? configured : phaseName(configured)
    const configuredId = data.settings?.competitionPhaseId ?? configured?.id
    const selected = timedActive || ordered.find((phase) => String(phase.id) === String(configuredId) || phaseName(phase).toLocaleLowerCase('hu-HU') === configuredName?.toLocaleLowerCase('hu-HU')) || null
    const index = selected ? ordered.indexOf(selected) : -1
    const start = selected ? todayAt(phaseStart(selected), now) : null
    const end = selected ? todayAt(phaseEnd(selected), now) : null
    const remaining = end ? end - now : null
    const progress = start && end && end > start ? Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100)) : 0
    return { selected, next: index >= 0 ? ordered[index + 1] || null : ordered[0] || null, remaining, progress }
  }, [data.phases, data.settings, now])

  const overall = useMemo(() => [...data.points].map((item) => ({ ...item, name: teamName(item), category: withCategory(teamName(item)), total: number(item.allPoint, item.point, item.points) })).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'hu')).slice(0, 10), [data.points, withCategory])
  const line = useMemo(() => [...data.line].map((item) => ({ name: teamName(item), category: withCategory(teamName(item)), value: number(item.time), stage: number(item.stage) })).sort((a, b) => a.value - b.value).slice(0, 6), [data.line, withCategory])
  const hill = useMemo(() => [...data.hill].map((item) => ({ name: teamName(item), category: withCategory(teamName(item)), level: number(item.completed_level, item.completedLevel), time: number(item.time_spent_on_level, item.timeSpentOnLevel, item.time) })).sort((a, b) => b.level - a.level || a.time - b.time).slice(0, 6), [data.hill, withCategory])
  const basketball = useMemo(() => [...data.basketball].map((item) => ({ name: teamName(item), category: withCategory(teamName(item)), points: number(item.points, item.point), time: number(item.time) })).sort((a, b) => b.points - a.points || a.time - b.time).slice(0, 6), [data.basketball, withCategory])
  const sumo = useMemo(() => [...data.sumo].map((item) => ({ name: teamName(item), category: withCategory(teamName(item)), points: number(item.points, item.point, item.team_point, item.teamPoint), wins: number(item.wins, item.win) })).sort((a, b) => b.points - a.points || b.wins - a.wins).slice(0, 8), [data.sumo, withCategory])
  const activeSumoStageOrder = useMemo(() => {
    if (!data.matches || !data.matches.length) return 1
    return Math.max(...data.matches.map((m) => getStageOrder(m.tournamentStage || m.tournament_stage || m.stage)))
  }, [data.matches])

  const activeSumoStageName = useMemo(() => {
    return SUMO_STAGE_LABELS[activeSumoStageOrder] || 'Alapszakasz'
  }, [activeSumoStageOrder])

  const matches = useMemo(() => {
    if (!data.matches || !data.matches.length) return []
    const all = [...data.matches].map((item) => ({
      team1: item.team1_name || item.team1Name,
      team2: item.team2_name || item.team2Name,
      table: Number(item.table || 0),
      result1: item.team1result || item.team1Result || '',
      result2: item.team2result || item.team2Result || '',
      stage: item.tournamentStage || item.tournament_stage || item.stage
    })).sort((a, b) => (Number(a.table) || 0) - (Number(b.table) || 0))

    if (activeSumoStageOrder > 1) {
      return all.filter((m) => getStageOrder(m.stage) === activeSumoStageOrder)
    }

    const teamCount = data.teams.length || 16
    const halfCount = Math.max(1, Math.ceil(teamCount / 2))
    return all.filter((m) => getStageOrder(m.stage) === 1).slice(-halfCount)
  }, [data.matches, data.teams.length, activeSumoStageOrder])
  const activeName = phaseName(schedule.selected) || 'Nincs aktív szakasz'
  const hasDetail = (slideId, detailId) => selectedDetails[slideId]?.includes(detailId)
  const ageBadge = (row, slideId) => hasDetail(slideId, 'category') ? <b className={`show-age age-${row.category}`}>{categoryLabel(row.category)}</b> : null
  const teamColumn = (slideId) => ({ key: 'team', label: 'Csapat', render: (row) => <>{ageBadge(row, slideId)}{row.name}</> })
  const resultSlide = (id, eyebrow, title, rows, extraColumns) => <section className="show-slide" key={id}><div className="show-slide-title"><span>{eyebrow}</span><h2>{title}</h2></div><CombinedStandingsNotice /><ProjectionTable rows={rows} columns={[{ key: 'rank', label: 'Hely', render: (_, index) => <strong>{index + 1}.</strong> }, teamColumn(id), ...extraColumns.filter(Boolean)]} /></section>
  const leaderboardPanel = (id, title, icon, rows, valueRenderer) => {
    if (!hasDetail('sports', id)) return null
    return <div key={id}><h3><i className={`bi ${icon}`} /> {title}</h3>{rows.slice(0, 6).map((row, index) => <p key={row.name}><b>{index + 1}.</b><span>{hasDetail('sports', 'category') && <em className={`show-age age-${row.category}`}>{categoryLabel(row.category)}</em>}{row.name}</span>{hasDetail('sports', 'value') && <strong>{valueRenderer(row)}</strong>}</p>)}</div>
  }

  const slideMap = {
    overview: <section className="show-slide show-overview" key="overview"><div className="show-eyebrow">Verseny állapota</div><h1>{activeName}</h1><div className="show-countdown"><span>{schedule.remaining > 0 ? 'Hátralévő idő' : 'Aktuális idő'}</span><strong>{schedule.remaining > 0 ? countdown(schedule.remaining) : now.toLocaleTimeString('hu-HU')}</strong></div><div className="show-progress"><span style={{ width: `${schedule.progress}%` }} /></div><div className="show-overview-grid">{hasDetail('overview', 'time') && <div><span>Időpont</span><strong>{schedule.selected ? `${timeLabel(phaseStart(schedule.selected))}–${timeLabel(phaseEnd(schedule.selected))}` : '–'}</strong></div>}{hasDetail('overview', 'next') && <div><span>Következő</span><strong>{schedule.next ? `${phaseName(schedule.next)} · ${timeLabel(phaseStart(schedule.next))}` : 'Nincs további szakasz'}</strong></div>}{hasDetail('overview', 'age') && <div><span>Korosztálybontás</span><strong>{Number(data.settings?.ageGroupBreakdown) === 1 ? 'Bekapcsolva' : 'Kikapcsolva'}</strong></div>}{hasDetail('overview', 'teams') && <div><span>Nevezett csapatok</span><strong>{data.teams.length}</strong></div>}</div></section>,
    overall: <section className="show-slide" key="overall"><div className="show-slide-title"><span>Élő eredmények</span><h2>Összesített állás</h2></div><CombinedStandingsNotice /><ProjectionTable rows={overall} columns={[{ key: 'rank', label: 'Hely', render: (_, index) => <strong>{index + 1}.</strong> }, teamColumn('overall'), hasDetail('overall', 'line') && { key: 'line', label: 'Vonal', render: (row) => number(row.lineFollowPoint) }, hasDetail('overall', 'hill') && { key: 'hill', label: 'Hegy', render: (row) => number(row.hillClimbPoint) }, hasDetail('overall', 'sumo') && { key: 'sumo', label: 'Szumó', render: (row) => number(row.sumoPoint) }, hasDetail('overall', 'basketball') && { key: 'basket', label: 'Kosár', render: (row) => number(row.basketballPoint) }, hasDetail('overall', 'total') && { key: 'total', label: 'Összesen', render: (row) => <strong>{row.total}</strong> }].filter(Boolean)} /></section>,
    sports: <section className="show-slide" key="sports"><div className="show-slide-title"><span>Versenyszámok</span><h2>Aktuális élmezőny</h2></div><CombinedStandingsNotice /><div className="show-leaderboards">{leaderboardPanel('line', 'Vonalkövetés', 'bi-sign-turn-right', line, (row) => `${row.value.toFixed(3)} s`)}{leaderboardPanel('hill', 'Hegymászás', 'bi-graph-up-arrow', hill, (row) => `${row.level}. szint`)}{leaderboardPanel('basketball', 'Kosárra dobás', 'bi-bullseye', basketball, (row) => `${row.points} pont`)}{leaderboardPanel('sumo', 'Szumó', 'bi-record-circle', sumo, (row) => `${row.points} pont`)}</div></section>,
    line: resultSlide('line', 'Versenyszám', 'Vonalkövetés', line, [hasDetail('line', 'time') && { key: 'time', label: 'Idő', render: (row) => `${row.value.toFixed(3)} s` }, hasDetail('line', 'stage') && { key: 'stage', label: 'Szakasz', render: (row) => row.stage }]),
    hill: resultSlide('hill', 'Versenyszám', 'Hegymászás', hill, [hasDetail('hill', 'level') && { key: 'level', label: 'Szint', render: (row) => row.level }, hasDetail('hill', 'time') && { key: 'time', label: 'Idő', render: (row) => `${row.time.toFixed(3)} s` }]),
    basketball: resultSlide('basketball', 'Versenyszám', 'Kosárra dobás', basketball, [hasDetail('basketball', 'points') && { key: 'points', label: 'Pont', render: (row) => row.points }, hasDetail('basketball', 'time') && { key: 'time', label: 'Idő', render: (row) => `${row.time.toFixed(3)} s` }]),
    sumo: resultSlide('sumo', 'Versenyszám', 'Szumó tabella', sumo, [hasDetail('sumo', 'points') && { key: 'points', label: 'Pont', render: (row) => row.points }, hasDetail('sumo', 'wins') && { key: 'wins', label: 'Győzelem', render: (row) => row.wins }]),
    matches: (
      <SumoMatchesSlide
        key="matches"
        activeSumoStageName={activeSumoStageName}
        matches={matches}
        hasDetail={hasDetail}
      />
    )
  }
  const slides = selectedSlideIds.map((id) => slideMap[id]).filter(Boolean)

  const toggleSlide = (id) => setSelectedSlideIds((current) => current.includes(id) ? (current.length > 1 ? current.filter((item) => item !== id) : current) : [...current, id])
  const moveSlide = (index, direction) => setSelectedSlideIds((current) => {
    const target = index + direction
    if (target < 0 || target >= current.length) return current
    const next = [...current]
    ;[next[index], next[target]] = [next[target], next[index]]
    return next
  })
  const toggleDetail = (slideId, detailId) => setSelectedDetails((current) => {
    const details = current[slideId] || []
    return { ...current, [slideId]: details.includes(detailId) ? details.filter((id) => id !== detailId) : [...details, detailId] }
  })
  const startProjection = () => {
    window.localStorage.setItem('robotverseny_show_slides', JSON.stringify(selectedSlideIds))
    window.localStorage.setItem('robotverseny_show_details', JSON.stringify(selectedDetails))
    setSlide(0)
    setPaused(false)
    setStarted(true)
    if (fullscreenOnStart) document.documentElement.requestFullscreen?.().catch(() => {})
    load()
  }
  const exitProjection = async () => {
    if (document.fullscreenElement) await document.exitFullscreen?.().catch(() => {})
    setPaused(false)
    setStarted(false)
  }
  const exportProjectionConfig = () => {
    const config = {
      type: 'robotverseny-show-config',
      version: 1,
      exportedAt: new Date().toISOString(),
      slides: selectedSlideIds,
      details: selectedDetails,
      fullscreenOnStart
    }
    const url = window.URL.createObjectURL(new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `kivetito-beallitas-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    setConfigMessage({ type: 'success', text: 'A kivetítő beállításai letöltve.' })
  }
  const importProjectionConfig = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const config = JSON.parse(await file.text())
      if (config?.type !== 'robotverseny-show-config' || !Array.isArray(config.slides)) throw new Error('Ez nem érvényes kivetítő-beállítási fájl.')
      const validSlides = [...new Set(config.slides.filter((id) => defaultSlideOrder.includes(id)))]
      if (!validSlides.length) throw new Error('A fájl nem tartalmaz használható diát.')
      const validDetails = Object.fromEntries(Object.entries(defaultDetails).map(([slideId, defaults]) => [slideId, Array.isArray(config.details?.[slideId]) ? config.details[slideId].filter((id) => defaults.includes(id)) : defaults]))
      setSelectedSlideIds(validSlides)
      setSelectedDetails(validDetails)
      setFullscreenOnStart(config.fullscreenOnStart !== false)
      window.localStorage.setItem('robotverseny_show_slides', JSON.stringify(validSlides))
      window.localStorage.setItem('robotverseny_show_details', JSON.stringify(validDetails))
      setConfigMessage({ type: 'success', text: `A(z) ${file.name} beállításai betöltve.` })
    } catch (error) {
      setConfigMessage({ type: 'danger', text: error.message || 'A beállítási fájl nem tölthető be.' })
    } finally {
      event.target.value = ''
    }
  }
  const configuredOptions = [...selectedSlideIds.map((id) => SLIDE_OPTIONS.find((option) => option.id === id)).filter(Boolean), ...SLIDE_OPTIONS.filter((option) => !selectedSlideIds.includes(option.id))]

  if (!started) return <main className="show-setup-page"><div className="show-setup-shell">
    <header className="show-setup-header"><div><img src="/Images/Logokicsi.png" alt="Brickathlon" className="show-logo-img" /><div><span>Brickathlon · Kivetítő beállítása</span><h1>Mit szeretnétek megjeleníteni?</h1><p>Válaszd ki a diákat, állítsd be a sorrendjüket és az eredménytáblák részleteit.</p></div></div><button type="button" className="btn btn-outline-light" onClick={() => { window.location.href = '/' }}><i className="bi bi-arrow-left me-2" />Vissza a főoldalra</button></header>
    <section className="show-config-transfer"><div><h2>Beállítások mentése</h2><p>A kiválasztott diák, sorrend és részletek másik gépre is átvihetők.</p></div><div><button type="button" className="btn btn-outline-light" onClick={exportProjectionConfig}><i className="bi bi-download me-2" />Exportálás</button><button type="button" className="btn btn-outline-light" onClick={() => configFileInputRef.current?.click()}><i className="bi bi-upload me-2" />Feltöltés</button><input ref={configFileInputRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={importProjectionConfig} /></div>{configMessage && <div className={`show-config-message ${configMessage.type}`} role="status"><i className={`bi bi-${configMessage.type === 'success' ? 'check-circle-fill' : 'exclamation-triangle-fill'}`} />{configMessage.text}<button type="button" className="btn-close btn-close-white" aria-label="Bezárás" onClick={() => setConfigMessage(null)} /></div>}</section>
    <section className="show-setup-list">{configuredOptions.map((option) => { const enabled = selectedSlideIds.includes(option.id); const selectedIndex = selectedSlideIds.indexOf(option.id); return <article className={`show-setup-item ${enabled ? 'enabled' : ''}`} key={option.id}><div className="show-setup-main-row"><label className="show-setup-check"><input type="checkbox" checked={enabled} onChange={() => toggleSlide(option.id)} /><i className={`bi ${option.icon}`} /><span>{option.label}</span></label>{enabled && <div className="show-order-controls"><span>{selectedIndex + 1}. dia</span><button type="button" disabled={selectedIndex === 0} onClick={() => moveSlide(selectedIndex, -1)} aria-label="Feljebb"><i className="bi bi-arrow-up" /></button><button type="button" disabled={selectedIndex === selectedSlideIds.length - 1} onClick={() => moveSlide(selectedIndex, 1)} aria-label="Lejjebb"><i className="bi bi-arrow-down" /></button></div>}</div>{enabled && DETAIL_OPTIONS[option.id]?.length > 0 && <details className="show-detail-options"><summary><i className="bi bi-sliders me-2" />Megjelenített részletek</summary><div>{DETAIL_OPTIONS[option.id].map((detail) => <label key={detail.id}><input type="checkbox" checked={hasDetail(option.id, detail.id)} onChange={() => toggleDetail(option.id, detail.id)} />{detail.label}</label>)}</div></details>}</article> })}</section>
    <footer className="show-setup-actions"><label><input type="checkbox" checked={fullscreenOnStart} onChange={(event) => setFullscreenOnStart(event.target.checked)} />Indítás teljes képernyőn</label><div><span>{selectedSlideIds.length} dia kiválasztva</span><button type="button" className="btn btn-warning btn-lg" onClick={startProjection}><i className="bi bi-play-fill me-2" />Vetítés indítása</button></div></footer>
  </div></main>

  if (loading) return <main className="show-page show-loading"><img src="/Images/Logokicsi.png" alt="Brickathlon" className="show-logo-img show-loading-logo" /><h1>Kivetítő betöltése</h1><div className="spinner-border text-warning" /></main>

  return <main className="show-page">
    <header className="show-header"><div className="show-brand"><img src="/Images/Logokicsi.png" alt="Brickathlon" className="show-logo-img" /><div><strong>Brickathlon</strong><small>Élő kivetítő</small></div></div><div className="show-header-phase"><span>Most zajlik</span><strong>{activeName}</strong></div><time><strong>{now.toLocaleTimeString('hu-HU')}</strong><small>{now.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</small></time></header>
    <div className="show-stage">{slides[slide]}</div>
    <footer className="show-footer"><div key={`${slide}-${paused}`} className={`show-auto-progress ${paused ? 'paused' : ''}`} style={{ animationDuration: `${SLIDE_SECONDS}s` }} /><div className="show-dots">{slides.map((_, index) => <button key={index} className={slide === index ? 'active' : ''} aria-label={`${index + 1}. nézet`} onClick={() => setSlide(index)} />)}</div><div className="show-live-status"><span className={connectionError ? 'warning' : 'online'} />{connectionError ? 'Részleges adatkapcsolat' : 'Élő adatok'} · frissítve: {lastUpdated?.toLocaleTimeString('hu-HU') || '–'}</div><div className="show-controls"><button onClick={() => setPaused((value) => !value)} title={paused ? 'Automatikus váltás folytatása' : 'Automatikus váltás szüneteltetése'}><i className={`bi bi-${paused ? 'play-fill' : 'pause-fill'}`} /></button><button onClick={() => setSlide((current) => (current + 1) % slides.length)} title="Következő nézet"><i className="bi bi-skip-forward-fill" /></button><button onClick={() => document.documentElement.requestFullscreen?.()} title="Teljes képernyő"><i className="bi bi-fullscreen" /></button><button className="show-exit-control" onClick={exitProjection} title="Kilépés a vetítésből"><i className="bi bi-x-lg" /><span>Vissza</span></button></div></footer>
  </main>
}
