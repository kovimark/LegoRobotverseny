import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AgeGroupBadge from '../components/AgeGroupBadge'
import FloatingFeedback from '../components/FloatingFeedback'
import PrecisionStopwatch from '../components/PrecisionStopwatch'
import { competitionTypes } from '../config/adminScoringConfig'
import { judgeCompetitionByPrivilege } from '../config/privilegeConfig'
import './GameScoringPage.css'

const API_BASE = 'https://legocompetition.runasp.net/api'
const MAX_TIME_SECONDS = 120
const MAX_BASKET_ATTEMPTS = 10
const MAX_BASKET_HITS = 5
const LINE_STAGES = [
  { value: 1, label: 'Csoportkör' },
  { value: 2, label: 'Legjobb 16' },
  { value: 3, label: 'Negyeddöntő' },
  { value: 4, label: 'Legjobb 4' }
]

const STAGE_API_VALUES = {
  GS: 1,
  RO16: 2,
  QF: 3,
  SF: 4,
  BM: 5,
  F: 6
}

const STAGE_LABELS = {
  GS: 'Alapszakasz',
  RO16: 'Legjobb 16',
  QF: 'Negyeddöntő',
  SF: 'Elődöntő',
  BM: 'Bronzmeccs',
  F: 'Döntő'
}

const SUMO_TIMER_PRESETS = {
  match: 45,
  timeout: 30,
  break: 30
}

const JUDGE_SCENARIOS = {
  sumo: {
    intro: 'A szumóban két robot küzd meg egymással egy körpályán. A cél, hogy az ellenfelet letolják a pályáról, miközben a saját robotjuk talpon marad. Most nézzük meg, milyen helyzetekkel találkozhatunk egy mérkőzés során, és ezekre milyen szabályok vonatkoznak.',
    items: [
      {
        id: 'sumo-no-white-line',
        label: 'Nem megy el a fehér vonalig',
        action: 'A rajt után a robotnak a pálya szélét jelző fehér vonalig kell eljutnia. Ha ezt nem teszi meg, az szabálytalanságnak számít, és ismétlődés esetén a menet elvesztésével jár.'
      },
      {
        id: 'sumo-no-start',
        label: 'Nem indul el a robot',
        action: 'A rajt után a robotnak öt másodpercen belül el kell indulnia. Ha nem indul el, vagy rossz irányba indul, az első alkalommal figyelmeztetés jár. Ismétlődés esetén a robot elveszíti a menetet.'
      },
      {
        id: 'sumo-win',
        label: 'Győztes menet',
        action: 'A menet akkor ér véget, amikor az egyik robot letolja ellenfelét a pályáról, és az eléri a földet. Ebben az esetben a pályán maradó robot nyeri a menetet. A robot, amelyik leesett vagy le lett tolva, elveszíti azt.'
      },
      {
        id: 'sumo-fall',
        label: 'Leesik a robot',
        action: 'Ha egy robot leesik a pályáról és eléri a földet, elveszíti az adott menetet. A mérkőzés ezzel véget ér.'
      },
      {
        id: 'sumo-draw',
        label: 'Döntetlen',
        action: 'Ha lejár a rendelkezésre álló idő, és egyik robot sem esik le a pályáról, a menet döntetlennel zárul. Ilyenkor mindkét csapat egy pontot kap. Ha a jelzés után esne le bármelyik robot, az már nem érvényes.'
      },
      {
        id: 'sumo-ref-end',
        label: 'Bírói jelzés utáni leesés',
        action: 'A bíró a menet végét kézjelzéssel és szóban is jelzi. Ettől a pillanattól kezdve az események már nem számítanak bele az eredménybe. Ha a robot ezután esik le, az már nem változtatja meg a menet eredményét.'
      },
      {
        id: 'sumo-overturn',
        label: 'Felborul a robot',
        action: 'Ha a robot felborul, de továbbra is a pályán marad, a menet tovább zajlik. A felborulás önmagában nem jelent vereséget.'
      },
      {
        id: 'sumo-touch',
        label: 'Hozzányúlnak a robothoz',
        action: 'A robot indítása után a versenyzőknek a kijelölt helyükre kell ülniük. A menet közben a robothoz hozzányúlni tilos. A szabályba való beavatkozás az adott menet elvesztését eredményezheti.'
      },
      {
        id: 'sumo-part-fall',
        label: 'Leesik egy alkatrész',
        action: 'Ha a robotról egy alkatrész leesik, de a robot továbbra is működőképes és versenyképes marad, a menet folytatható. A következő menet előtt azonban a robotot ismét szabályos állapotba kell hozni.'
      },
      {
        id: 'sumo-timeout',
        label: 'Időkérés',
        action: 'Minden fordulóban egy alkalommal lehet időt kérni. Ez legfeljebb harminc másodpercig tarthat, és a két menet közötti szünetben használható fel.'
      }
    ]
  },
  line: {
    intro: 'A vonalkövetésben a robotnak egy előre kijelölt pályán kell végighaladnia, és önállóan követnie a fekete vonalat. A cél, hogy minél gyorsabban teljesítse a teljes kört, miközben a robot végig a pályán marad. Most nézzük meg, milyen helyzetekkel találkozhatunk egy próbálkozás során, és ezekre milyen szabályok vonatkoznak.',
    items: [
      {
        id: 'line-normal',
        label: 'Rendes vonalkövetés',
        action: 'A robotnak önállóan kell követnie a kijelölt vonalat, és egy teljes kört kell megtennie a pályán. A próbálkozás idejét a fotocellás kapu méri, és a csoportkörben a két próbálkozás közül a jobb idő számít.'
      },
      {
        id: 'line-straight-mode',
        label: 'Straight Mode',
        action: 'A pálya egyenes szakaszainak elején és végén piros jelzések találhatók. Ezek segítségével a robot felismerheti, hogy egyenes szakasz következik, és ennek megfelelően gyorsíthat. A piros jelzések használata nem kötelező.'
      },
      {
        id: 'line-leave-replace',
        label: 'Elhagyja a vonalat, visszatenni',
        action: 'Ha a robot elhagyja a vonalat, és a versenyző úgy ítéli meg, hogy nem fog visszatalálni, a robot visszahelyezhető arra a pontra, ahol elvesztette a vonalat. Ezért nem jár büntetés, de az időbe beleszámít.'
      },
      {
        id: 'line-leave-cannot-find',
        label: 'Elhagyja a vonalat, visszatenni, és nem találja',
        action: 'Ha a robotot visszahelyeztük a megfelelő pontra, de továbbra sem találja a vonalat, a versenyző ismét hozzáérhet és segíthet a robotnak.'
      },
      {
        id: 'line-wrong-replace',
        label: 'Elhagyja a vonalat, rossz helyre visszatenni',
        action: 'A robotot arra a pontra kell visszahelyezni, ahol még szabályosan követte a vonalat. Ha a bíró úgy ítéli meg, hogy a robot rossz helyre került, kérheti a versenyzőt a helyes pozícióba történő visszaállításra.'
      },
      {
        id: 'line-cut-corner',
        label: 'Levágja a kanyart',
        action: 'Ha a robot elhagyja a pályát, és ezzel levág egy kanyart, nem folytathatja a versenyt onnan, ahová eljutott, hanem kötelező visszahelyezni arra a pontra, ahol még szabályosan követte a vonalat. Ha ez nem történik meg, a próbálkozás nem értékelhető, és a maximális kétperces idő kerül rögzítésre.'
      },
      {
        id: 'line-stop',
        label: 'Megáll a robot',
        action: 'Ha a robot a pályán megáll vagy mozgásképtelenné válik, és nem tudja folytatni a kört, a próbálkozás véget ér. Ilyenkor a teljesítés nem értékelhető, és a maximális kétperces idő kerül rögzítésre.'
      }
    ]
  },
  basket: {
    intro: 'A kosárra dobásban a robotoknak különböző távolságra elhelyezett kosarakba kell ping-pong labdát dobniuk. A csapatnak három perc és legfeljebb tíz dobás áll rendelkezésére, a cél pedig minél több érvényes pontszerzés. Most nézzük meg, milyen helyzetekkel találkozhatunk egy próbálkozás során, és ezekre milyen szabályok vonatkoznak.',
    items: [
      {
        id: 'basket-no-move',
        label: 'Nem mozdul meg a robot dobás előtt vagy után',
        action: 'Minden dobás előtt és után a robotnak egyértelműen meghatározható helyváltoztató mozgást kell végeznie. Ha a robot a dobás előtt vagy után nem mozdul meg, az adott dobás nem lesz érvényes.'
      },
      {
        id: 'basket-time-expire-in-motion',
        label: 'Lejár az idő, de megy a robot',
        action: 'Ha a három perc lejár, de a robot már elvégezte a dobás előtti szükséges mozgást, a megkezdett dobás még befejezhető és értékelhető.'
      },
      {
        id: 'basket-time-expire-after',
        label: 'Lejár az idő és utána indul el a robot',
        action: 'Ha a robot csak az idő lejárta után kezdi meg a dobás előtti mozgást, az már nem számít érvényes dobásnak, és ami ezután történik, nem értékelhető.'
      },
      {
        id: 'basket-outside-area',
        label: 'Kilóg a robot vagy a kar a dobásnál',
        action: 'A dobás teljes ideje alatt a robot minden részének a kijelölt dobóterületen belül kell maradnia. Ha akár a robot teste, akár egy kinyúló kar elhagyja a területet, a dobás nem lesz érvényes.'
      },
      {
        id: 'basket-ball-drop-inside',
        label: 'Kiesik a robot karjából a labda, de nem hagyja el a dobóterületet',
        action: 'Ha a labda mozgás közben kiesik a robotból, de a dobóterületen belül marad, a csapat újrakezdheti a dobást. Ilyenkor a dobás még nem számít befejezettnek.'
      },
      {
        id: 'basket-ball-drop-outside',
        label: 'Kiesik a robot karjából a labda és elhagyja a dobóterületet',
        action: 'Ha a labda elhagyja a dobóterületet, a dobás befejezettnek számít. Innentől már nem lehet ugyanazt a dobást újrakezdeni, a dobás pedig a szabályok szerint értékelhető vagy érvényteleníthető.'
      }
    ]
  },
  hill: {
    intro: 'A hegymászásban a robotnak négy, egyre nehezebb emelkedőt kell önállóan teljesítenie. A szinteket sorrendben kell megmásznia, és mindig csak akkor léphet tovább a következőre, ha az előzőt sikeresen teljesítette. Most nézzük meg, milyen helyzetekkel találkozhatunk egy próbálkozás során, és ezekre milyen szabályok vonatkoznak.',
    items: [
      {
        id: 'hill-complete',
        label: 'Végig felmegy az emelkedőn',
        action: 'Egy emelkedő akkor számít sikeresen teljesítettnek, ha a robot eléri a tetején található célvonalat. Ezután a robotot a következő nehézségi szint rajtvonalára lehet helyezni, és folytathatja a mászást. A végső eredményt elsősorban a teljesített szintek száma, azonos eredmény esetén pedig az utolsó teljesített szint ideje határozza meg.'
      },
      {
        id: 'hill-cannot-climb',
        label: 'A robot nem megy fel',
        action: 'A rajtjelzés után a robotnak önállóan kell megkezdenie az emelkedő megmászását. Ha nem indul el, az emelkedőn megáll, visszagurul, vagy letér az emelkedőről és emiatt nem tud továbbhaladni, a próbálkozás véget ér. Ilyenkor a robotot nem lehet visszahelyezni a pályára, és csak az addig sikeresen teljesített szintek kerülnek értékelésre.'
      },
      {
        id: 'hill-touch',
        label: 'Hozzányúl valaki a robothoz',
        action: 'A próbálkozás során a robotnak teljesen önállóan kell működnie. Ha a csapat versenyzője bármely ponton hozzáér a robothoz, a próbálkozás befejezettnek tekintendő. Ha viszont egy csapattól független külső személy ér hozzá, a próbálkozás megismételhető.'
      }
    ]
  }
}

const parseResultHistory = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value !== 'string') return []
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

const normalizeTournamentStage = (stage) => {
  if (typeof stage === 'string' && stage.trim()) return stage.trim().toUpperCase()
  const numericValue = Number(stage)
  const entry = Object.entries(STAGE_API_VALUES).find(([, value]) => value === numericValue)
  return entry?.[0] || 'GS'
}

const calculateSumoPoints = (history) => history.reduce((sum, result) => {
  if (result === 'W') return sum + 2
  if (result === 'D') return sum + 1
  return sum
}, 0)

const createBasketDraft = () => ({
  hoop1: 0,
  hoop2: 0,
  hoop3: 0,
  hoop4: 0,
  hoop5: 0,
  time: '',
  throwNumber: 1
})

function StepperInput({ value, onChange, min = 0, max = undefined, step = 1, inputMode = 'numeric', integer = false, disabled = false }) {
  const normalize = (nextValue) => {
    if (nextValue === '') return ''
    const parsed = integer ? Number.parseInt(nextValue, 10) : Number(nextValue)
    if (!Number.isFinite(parsed)) return min
    const minLimited = min !== undefined ? Math.max(min, parsed) : parsed
    const limited = max !== undefined ? Math.min(max, minLimited) : minLimited
    return integer ? Math.round(limited) : Number(limited.toFixed(3))
  }

  const currentNumber = Number(value)
  const canDecrease = !disabled && value !== '' && Number.isFinite(currentNumber) && (min === undefined || currentNumber > min)
  const canIncrease = !disabled && (value === '' || !Number.isFinite(currentNumber) || max === undefined || currentNumber < max)

  const changeBy = (direction) => {
    const base = Number.isFinite(currentNumber) ? currentNumber : Number(min || 0)
    onChange(normalize(base + direction * Number(step || 1)))
  }

  return (
    <div className="stepper-input">
      <button type="button" onClick={() => changeBy(-1)} disabled={!canDecrease} aria-label="Csökkentés">
        <i className="bi bi-dash-lg" aria-hidden="true" />
      </button>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        inputMode={inputMode}
        className="form-control"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(normalize(event.target.value))}
      />
      <button type="button" onClick={() => changeBy(1)} disabled={!canIncrease} aria-label="Növelés">
        <i className="bi bi-plus-lg" aria-hidden="true" />
      </button>
    </div>
  )
}

function SearchPicker({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  getOptionValue = (item) => item,
  getOptionLabel = (item) => item,
  renderOption = null,
  noResultsText = 'Nincs találat',
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false)

  const filteredOptions = useMemo(() => {
    const normalizedQuery = String(value || '').trim().toLocaleLowerCase('hu-HU')
    const source = Array.isArray(options) ? options : []

    if (!normalizedQuery) {
      return source.slice(0, 8)
    }

    return source
      .filter((item) => getOptionLabel(item).toLocaleLowerCase('hu-HU').includes(normalizedQuery))
      .slice(0, 8)
  }, [getOptionLabel, options, value])

  return (
    <div className="search-picker position-relative">
      <label className="form-label" htmlFor={id}>{label}</label>
      <input
        id={id}
        type="search"
        className="form-control"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
        onFocus={() => setIsOpen(true)}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
        onChange={(event) => onChange(event.target.value)}
      />

      {isOpen && (
        <div className="list-group search-picker-results shadow bg-white border rounded">
          {filteredOptions.length > 0 ? filteredOptions.map((item) => {
            const optionValue = getOptionValue(item)
            return (
              <button
                key={optionValue}
                type="button"
                className="list-group-item list-group-item-action"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(optionValue)
                  setIsOpen(false)
                }}
              >
                {renderOption ? renderOption(item) : getOptionLabel(item)}
              </button>
            )
          }) : <div className="list-group-item text-muted small">{noResultsText}</div>}
        </div>
      )}
    </div>
  )
}

function JudgeScenarioHelper({ title = 'Bírói szituációk', intro = '', scenarios = [] }) {
  const [activeScenarioId, setActiveScenarioId] = useState(scenarios[0]?.id || '')

  useEffect(() => {
    setActiveScenarioId(scenarios[0]?.id || '')
  }, [scenarios])

  if (!Array.isArray(scenarios) || scenarios.length === 0) {
    return null
  }

  return (
    <section className="judge-scenarios mb-3">
      <div className="judge-scenarios__shell">
        <div className="judge-scenarios__head">
          <h5 className="mb-2">{title}</h5>
          <p className="text-muted small mb-2">Gyors segédlet a szabályzat alapján. Kattints a helyzetre, és látod a javasolt bírói lépést.</p>
          {intro && <p className="small mb-0">{intro}</p>}
        </div>

        <div className="judge-scenarios__body">
          <div className="judge-scenarios__list">
            {scenarios.map((scenario) => (
              <div key={scenario.id} className="judge-scenarios__item">
                <button
                  type="button"
                  className={`judge-scenarios__trigger ${activeScenarioId === scenario.id ? 'is-open' : ''}`}
                  onClick={() => setActiveScenarioId((current) => (current === scenario.id ? '' : scenario.id))}
                  aria-expanded={activeScenarioId === scenario.id}
                >
                  <span>{scenario.label}</span>
                  <i className={`bi ${activeScenarioId === scenario.id ? 'bi-chevron-up' : 'bi-chevron-down'}`} aria-hidden="true" />
                </button>
                <div className={`judge-scenarios__content ${activeScenarioId === scenario.id ? 'is-open' : ''}`}>
                  <div className="judge-scenarios__result mt-2">
                    <div className="small fw-semibold mb-1">Mi a teendő?</div>
                    <div>{scenario.action}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function GameBasketScoring() {
  const [teamNames, setTeamNames] = useState([])
  const [allTeams, setAllTeams] = useState([])
  const [selectedTeamName, setSelectedTeamName] = useState('')
  const [draft, setDraft] = useState(createBasketDraft)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionMessage, setActionMessage] = useState(null)
  const [teamSearch, setTeamSearch] = useState('')

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [namesResponse, teamsResponse] = await Promise.all([
          fetch(`${API_BASE}/Teams/teamnames`),
          fetch(`${API_BASE}/Teams`)
        ])

        if (!namesResponse.ok) {
          throw new Error('Nem sikerült betölteni a csapatneveket.')
        }

        const namesData = await namesResponse.json()
        const teamsData = teamsResponse.ok ? await teamsResponse.json() : []
        const normalizedNames = Array.isArray(namesData)
          ? namesData.map((item) => (typeof item === 'string' ? item : item?.teamName || item?.team_name || '')).filter(Boolean)
          : []

        setTeamNames(Array.from(new Set(normalizedNames)))
        setAllTeams(Array.isArray(teamsData) ? teamsData : [])
      } catch (error) {
        setActionMessage({ type: 'danger', text: error.message })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  useEffect(() => {
    if (!actionMessage) return undefined
    const timeoutId = window.setTimeout(() => setActionMessage(null), 5000)
    return () => window.clearTimeout(timeoutId)
  }, [actionMessage])

  const totalHits = Number(draft.hoop1) + Number(draft.hoop2) + Number(draft.hoop3) + Number(draft.hoop4) + Number(draft.hoop5)

  const handleSave = async () => {
    const time = Number(draft.time)
    const throwNumber = Number.parseInt(draft.throwNumber, 10)

    if (!selectedTeamName) {
      setActionMessage({ type: 'danger', text: 'Válassz csapatot.' })
      return
    }

    if (totalHits <= 0 || totalHits > MAX_BASKET_HITS) {
      setActionMessage({ type: 'danger', text: 'Összesen 1-5 találat adható meg. 5 találat után nem lehet további dobást rögzíteni.' })
      return
    }

    if (!Number.isFinite(time) || time <= 0 || time > MAX_TIME_SECONDS) {
      setActionMessage({ type: 'danger', text: 'Adj meg érvényes időt (0-120 mp).' })
      return
    }

    if (!Number.isInteger(throwNumber) || throwNumber < 1 || throwNumber > MAX_BASKET_ATTEMPTS) {
      setActionMessage({ type: 'danger', text: 'A próbálkozás sorszáma 1-10 közötti egész lehet.' })
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`${API_BASE}/Basketball`, {
        method: 'PUT',
        headers: { accept: '*/*', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamName: selectedTeamName,
          hoop1: Number(draft.hoop1),
          hoop2: Number(draft.hoop2),
          hoop3: Number(draft.hoop3),
          hoop4: Number(draft.hoop4),
          hoop5: Number(draft.hoop5),
          time,
          throwNumber
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'A mentés sikertelen volt.')
      }

      setDraft(createBasketDraft())
      setSelectedTeamName('')
      setTeamSearch('')
      setActionMessage({ type: 'success', text: 'Kosárra dobás eredmény rögzítve.' })
    } catch (error) {
      setActionMessage({ type: 'danger', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  const categoryByName = new Map(
    allTeams.map((team) => [team.teamName || team.team_name, Number(team.category) === 1 ? 1 : 0])
  )

  return (
    <section className="game-scoring-panel">
      <FloatingFeedback message={actionMessage} onClose={() => setActionMessage(null)} />
      <header className="game-scoring-panel__header">
        <h3>Kosárra dobás</h3>
        <p>Gyors felvitel, hangsúly az időn és a célzott dobásokon.</p>
      </header>

      {loading ? <div className="alert alert-secondary">Csapatok betöltése...</div> : (
        <>
          <div className="row g-3">
            <div className="col-12 col-lg-6">
              <SearchPicker
                id="basket-team-search"
                label="Csapat keresése"
                value={teamSearch}
                onChange={(nextValue) => {
                  setTeamSearch(nextValue)
                  const exactMatch = teamNames.find((name) => name === nextValue)
                  setSelectedTeamName(exactMatch || '')
                }}
                options={teamNames}
                placeholder="Kezdd el írni a csapat nevét..."
                renderOption={(teamName) => (
                  <><AgeGroupBadge category={categoryByName.get(teamName)} className="me-2" />{teamName}</>
                )}
              />
              {selectedTeamName && (
                <div className="small mt-2 text-muted"><AgeGroupBadge category={categoryByName.get(selectedTeamName)} className="me-2" />Aktív csapat: {selectedTeamName}</div>
              )}
            </div>
            <div className="col-12 col-lg-3">
              <label className="form-label">Próbálkozás sorszáma</label>
              <StepperInput
                value={draft.throwNumber}
                min={1}
                max={MAX_BASKET_ATTEMPTS}
                step={1}
                integer
                onChange={(value) => setDraft((prev) => ({ ...prev, throwNumber: value }))}
              />
            </div>
            <div className="col-12 col-lg-3">
              <label className="form-label">Összes találat</label>
              <div className="game-scoring-counter">{totalHits} / {MAX_BASKET_HITS}</div>
            </div>
          </div>

          <div className="row g-3 mt-1">
            {[1, 2, 3, 4, 5].map((hoop) => (
              <div className="col-6 col-md" key={hoop}>
                <label className="form-label">{hoop}. kosár</label>
                <StepperInput
                  value={draft[`hoop${hoop}`]}
                  min={0}
                  max={MAX_BASKET_HITS}
                  step={1}
                  integer
                  onChange={(value) => {
                    const nextDraft = { ...draft, [`hoop${hoop}`]: value }
                    const nextTotal = Number(nextDraft.hoop1) + Number(nextDraft.hoop2) + Number(nextDraft.hoop3) + Number(nextDraft.hoop4) + Number(nextDraft.hoop5)
                    if (nextTotal > MAX_BASKET_HITS) {
                      setActionMessage({ type: 'danger', text: 'Maximum 5 találat adható meg összesen.' })
                      return
                    }
                    setDraft(nextDraft)
                  }}
                />
              </div>
            ))}
          </div>

          <div className="row g-3 mt-1 align-items-end">
            <div className="col-12 col-lg-4">
              <label className="form-label">Idő (mp)</label>
              <StepperInput
                value={draft.time}
                min={0}
                max={MAX_TIME_SECONDS}
                step={0.001}
                inputMode="decimal"
                onChange={(value) => setDraft((prev) => ({ ...prev, time: value }))}
              />
              <div className="form-text">Kézzel bármikor felülírható.</div>
            </div>
            <div className="col-12 col-lg-8">
              <PrecisionStopwatch onCapture={(value) => setDraft((prev) => ({ ...prev, time: value }))} />
            </div>
          </div>

          <div className="d-flex justify-content-end mt-4">
            <button type="button" className="btn btn-lg btn-warning game-scoring-save-btn" onClick={handleSave} disabled={saving}>
              {saving ? 'Mentés...' : 'Eredmény rögzítése'}
            </button>
          </div>
        </>
      )}
<br /><br />
      <JudgeScenarioHelper title="Kosárra dobás: bírói szituációk" intro={JUDGE_SCENARIOS.basket.intro} scenarios={JUDGE_SCENARIOS.basket.items} />
    </section>
  )
}

function GameLineFollowingScoring() {
  const [teamNames, setTeamNames] = useState([])
  const [allTeams, setAllTeams] = useState([])
  const [selectedTeamName, setSelectedTeamName] = useState('')
  const [selectedTeamCategory, setSelectedTeamCategory] = useState(null)
  const [time, setTime] = useState('')
  const [stage, setStage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionMessage, setActionMessage] = useState(null)
  const [teamSearch, setTeamSearch] = useState('')

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [lineResultsResponse, lineTeamNamesResponse, teamNamesResponse, allTeamsResponse] = await Promise.all([
          fetch(`${API_BASE}/LineFollowing`),
          fetch(`${API_BASE}/LineFollowing/teamnames`),
          fetch(`${API_BASE}/Teams/teamnames`),
          fetch(`${API_BASE}/Teams`)
        ])

        const lineResultsData = lineResultsResponse.ok ? await lineResultsResponse.json() : []
        const lineTeamNamesData = lineTeamNamesResponse.ok ? await lineTeamNamesResponse.json() : []
        const teamNamesData = teamNamesResponse.ok ? await teamNamesResponse.json() : []
        const allTeamsData = allTeamsResponse.ok ? await allTeamsResponse.json() : []

        const namesFromResults = Array.isArray(lineResultsData)
          ? Array.from(new Set(lineResultsData
            .map((item) => item?.team_name || item?.teamName || '')
            .filter(Boolean)))
          : []

        const activeLineFollowingTeamNames = Array.isArray(lineTeamNamesData)
          ? lineTeamNamesData.map((item) => (typeof item === 'string' ? item : item?.teamName || item?.team_name || '')).filter(Boolean)
          : []

        const fallbackTeamNames = Array.isArray(teamNamesData)
          ? teamNamesData.map((item) => (typeof item === 'string' ? item : item?.teamName || item?.team_name || '')).filter(Boolean)
          : []

        const finalTeamNames = activeLineFollowingTeamNames.length > 0
          ? activeLineFollowingTeamNames
          : fallbackTeamNames.length > 0
            ? fallbackTeamNames
            : namesFromResults

        setTeamNames(Array.from(new Set(finalTeamNames)))
        setAllTeams(Array.isArray(allTeamsData) ? allTeamsData : [])
      } catch (error) {
        setActionMessage({ type: 'danger', text: error.message })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  useEffect(() => {
    if (!selectedTeamName) {
      setSelectedTeamCategory(null)
      return
    }

    const foundTeam = allTeams.find((team) => (team.teamName || team.team_name) === selectedTeamName)
    setSelectedTeamCategory(foundTeam ? (Number(foundTeam.category) === 1 ? 1 : 0) : null)
  }, [allTeams, selectedTeamName])

  useEffect(() => {
    if (!actionMessage) return undefined
    const timeoutId = window.setTimeout(() => setActionMessage(null), 5000)
    return () => window.clearTimeout(timeoutId)
  }, [actionMessage])

  const handleSave = async () => {
    const parsedTime = Number(time)

    if (!selectedTeamName) {
      setActionMessage({ type: 'danger', text: 'Válassz csapatot.' })
      return
    }

    if (!teamNames.includes(selectedTeamName)) {
      setActionMessage({ type: 'danger', text: 'A csapatot kereséssel válaszd ki a listából.' })
      return
    }

    if (!Number.isFinite(parsedTime) || parsedTime <= 0 || parsedTime > MAX_TIME_SECONDS) {
      setActionMessage({ type: 'danger', text: 'Adj meg érvényes időt (0-120 mp).' })
      return
    }

    setSaving(true)

    try {
      const response = await fetch(`${API_BASE}/LineFollowing`, {
        method: 'POST',
        headers: { accept: '*/*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamName: selectedTeamName, time: parsedTime, tournamentStage: Number(stage) })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'A mentés sikertelen volt.')
      }

      setTime('')
      setSelectedTeamName('')
      setTeamSearch('')
      setActionMessage({ type: 'success', text: 'Vonalkövetés eredmény rögzítve.' })
    } catch (error) {
      setActionMessage({ type: 'danger', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="game-scoring-panel">
      <FloatingFeedback message={actionMessage} onClose={() => setActionMessage(null)} />
      <header className="game-scoring-panel__header">
        <h3>Vonalkövetés</h3>
        <p>Stopperrel mérd az időt, majd azonnal mentsd az adott szakaszba.</p>
      </header>

      {loading ? <div className="alert alert-secondary">Csapatok betöltése...</div> : (
        <>
          <div className="row g-3">
            <div className="col-12 col-lg-6">
              <SearchPicker
                id="line-team-search"
                label="Csapat keresése"
                value={teamSearch}
                onChange={(nextValue) => {
                  setTeamSearch(nextValue)
                  const exactMatch = teamNames.find((name) => name === nextValue)
                  setSelectedTeamName(exactMatch || '')
                }}
                options={teamNames}
                placeholder="Kezdd el írni a csapat nevét..."
                renderOption={(teamName) => {
                  const team = allTeams.find((item) => (item.teamName || item.team_name) === teamName)
                  const category = team ? (Number(team.category) === 1 ? 1 : 0) : null
                  return <><AgeGroupBadge category={category} className="me-2" />{teamName}</>
                }}
              />
              {selectedTeamName && (
                <div className="small mt-2 text-muted"><AgeGroupBadge category={selectedTeamCategory} className="me-2" />Aktív csapat: {selectedTeamName}</div>
              )}
            </div>
            <div className="col-12 col-lg-6">
              <label className="form-label">Szakasz</label>
              <select className="form-select" value={stage} onChange={(event) => setStage(Number(event.target.value))}>
                {LINE_STAGES.map((item) => (
                  <option value={item.value} key={item.value}>{item.value}. {item.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="row g-3 mt-1 align-items-end">
            <div className="col-12 col-lg-4">
              <label className="form-label">Idő (mp)</label>
              <StepperInput
                value={time}
                min={0}
                max={MAX_TIME_SECONDS}
                step={0.001}
                inputMode="decimal"
                onChange={(value) => setTime(value)}
              />
              <div className="form-text">Kézzel is szerkeszthető.</div>
            </div>
            <div className="col-12 col-lg-8">
              <PrecisionStopwatch onCapture={(value) => setTime(value)} />
            </div>
          </div>

          <div className="d-flex justify-content-end mt-4">
            <button type="button" className="btn btn-lg btn-warning game-scoring-save-btn" onClick={handleSave} disabled={saving}>
              {saving ? 'Mentés...' : 'Eredmény rögzítése'}
            </button>
          </div>
        </>
      )}
<br /><br />
      <JudgeScenarioHelper title="Vonalkövetés: bírói szituációk" intro={JUDGE_SCENARIOS.line.intro} scenarios={JUDGE_SCENARIOS.line.items} />
    </section>
  )
}

function GameHillClimbingScoring() {
  const [teams, setTeams] = useState([])
  const [allTeams, setAllTeams] = useState([])
  const [selectedTeamName, setSelectedTeamName] = useState('')
  const [selectedTeamCategory, setSelectedTeamCategory] = useState(null)
  const [completedLevel, setCompletedLevel] = useState(0)
  const [timeSpent, setTimeSpent] = useState('')
  const [eliminated, setEliminated] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionMessage, setActionMessage] = useState(null)
  const [teamSearch, setTeamSearch] = useState('')

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [response, allTeamsResponse] = await Promise.all([
          fetch(`${API_BASE}/HillClimbing`),
          fetch(`${API_BASE}/Teams`)
        ])

        if (!response.ok) {
          throw new Error('Nem sikerült betölteni a hegymászás adatokat.')
        }

        const data = await response.json()
        const allTeamsData = allTeamsResponse.ok ? await allTeamsResponse.json() : []
        setTeams(Array.isArray(data) ? data : [])
        setAllTeams(Array.isArray(allTeamsData) ? allTeamsData : [])
      } catch (error) {
        setActionMessage({ type: 'danger', text: error.message })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  useEffect(() => {
    if (!actionMessage) return undefined
    const timeoutId = window.setTimeout(() => setActionMessage(null), 5000)
    return () => window.clearTimeout(timeoutId)
  }, [actionMessage])

  useEffect(() => {
    if (!selectedTeamName) return
    const selected = teams.find((team) => (team.team_name || team.teamName) === selectedTeamName)
    if (!selected) return
    setCompletedLevel(Number(selected.completed_level || 0))
    setTimeSpent(Number(selected.time_spent_on_level || 0))
    setEliminated(Number(selected.eliminated || 0))
  }, [selectedTeamName, teams])

  useEffect(() => {
    if (!selectedTeamName) {
      setSelectedTeamCategory(null)
      return
    }

    const foundTeam = allTeams.find((team) => (team.teamName || team.team_name) === selectedTeamName)
    setSelectedTeamCategory(foundTeam ? (Number(foundTeam.category) === 1 ? 1 : 0) : null)
  }, [allTeams, selectedTeamName])

  const handleSave = async () => {
    const parsedLevel = Number.parseInt(completedLevel, 10)
    const parsedTime = Number(timeSpent)
    const apiTime = Math.round(parsedTime)
    const parsedEliminated = Number(eliminated) === 1 ? 1 : 0

    if (!selectedTeamName) {
      setActionMessage({ type: 'danger', text: 'Válassz csapatot.' })
      return
    }

    if (!teams.some((team) => (team.team_name || team.teamName) === selectedTeamName)) {
      setActionMessage({ type: 'danger', text: 'A csapatot kereséssel válaszd ki a listából.' })
      return
    }

    if (!Number.isInteger(parsedLevel) || parsedLevel < 0 || parsedLevel > 4) {
      setActionMessage({ type: 'danger', text: 'A teljesített szint 0-4 közötti egész lehet.' })
      return
    }

    if (!Number.isFinite(parsedTime) || parsedTime < 0) {
      setActionMessage({ type: 'danger', text: 'Az idő nem lehet negatív.' })
      return
    }

    setSaving(true)

    try {
      const levelResponse = await fetch(`${API_BASE}/HillClimbing/${encodeURIComponent(selectedTeamName)}/${parsedLevel}/${apiTime}`, {
        method: 'PATCH'
      })

      if (!levelResponse.ok) {
        const errorText = await levelResponse.text()
        throw new Error(errorText || 'A szint/idő mentés sikertelen volt.')
      }

      const statusResponse = await fetch(`${API_BASE}/HillClimbing/${encodeURIComponent(selectedTeamName)}/${parsedEliminated}`, {
        method: 'PATCH'
      })

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text()
        throw new Error(errorText || 'A versenyállapot mentése sikertelen volt.')
      }

      setTeams((prev) => prev.map((team) => (
        (team.team_name || team.teamName) === selectedTeamName
          ? { ...team, completed_level: parsedLevel, time_spent_on_level: apiTime, eliminated: parsedEliminated }
          : team
      )))
      setTimeSpent(apiTime)
      setActionMessage({
        type: Math.abs(apiTime - parsedTime) > 0.0005 ? 'info' : 'success',
        text: Math.abs(apiTime - parsedTime) > 0.0005
          ? `A hegymászás backend egész másodpercet fogad, ezért ${parsedTime.toFixed(3)} mp helyett ${apiTime} mp lett mentve.`
          : 'Hegymászás eredmény frissítve.'
      })
    } catch (error) {
      setActionMessage({ type: 'danger', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="game-scoring-panel">
      <FloatingFeedback message={actionMessage} onClose={() => setActionMessage(null)} />
      <header className="game-scoring-panel__header">
        <h3>Hegymászás</h3>
        <p>Frissítsd egyetlen blokkból a szintet, az időt és a versenyállapotot.</p>
      </header>

      {loading ? <div className="alert alert-secondary">Csapatok betöltése...</div> : (
        <>
          <div className="row g-3">
            <div className="col-12 col-lg-4">
              <SearchPicker
                id="hill-team-search"
                label="Csapat keresése"
                value={teamSearch}
                onChange={(nextValue) => {
                  setTeamSearch(nextValue)
                  const exactMatch = teams.find((team) => (team.team_name || team.teamName) === nextValue)
                  setSelectedTeamName(exactMatch ? (exactMatch.team_name || exactMatch.teamName) : '')
                }}
                options={teams.map((team, index) => team.team_name || team.teamName || `Csapat ${index + 1}`)}
                placeholder="Kezdd el írni a csapat nevét..."
                renderOption={(teamName) => {
                  const team = allTeams.find((item) => (item.teamName || item.team_name) === teamName)
                  const category = team ? (Number(team.category) === 1 ? 1 : 0) : null
                  return <><AgeGroupBadge category={category} className="me-2" />{teamName}</>
                }}
              />
              {selectedTeamName && (
                <div className="small mt-2 text-muted"><AgeGroupBadge category={selectedTeamCategory} className="me-2" />Aktív csapat: {selectedTeamName}</div>
              )}
            </div>
            <div className="col-6 col-lg-2">
              <label className="form-label">Teljesített szint</label>
              <StepperInput
                value={completedLevel}
                min={0}
                max={4}
                step={1}
                integer
                onChange={setCompletedLevel}
              />
            </div>
            <div className="col-6 col-lg-3">
              <label className="form-label">Idő a szinten (mp)</label>
              <StepperInput
                value={timeSpent}
                min={0}
                max={MAX_TIME_SECONDS}
                step={0.001}
                inputMode="decimal"
                onChange={setTimeSpent}
              />
            </div>
            <div className="col-12 col-lg-3">
              <label className="form-label">Állapot</label>
              <select className="form-select" value={eliminated} onChange={(event) => setEliminated(Number(event.target.value))}>
                <option value="0">Versenyben</option>
                <option value="1">Kiesett</option>
              </select>
            </div>
          </div>

          <div className="row g-3 mt-1 align-items-end">
            <div className="col-12">
              <PrecisionStopwatch onCapture={(value) => setTimeSpent(value)} />
            </div>
          </div>

          <div className="d-flex justify-content-end mt-4">
            <button type="button" className="btn btn-lg btn-warning game-scoring-save-btn" onClick={handleSave} disabled={saving}>
              {saving ? 'Mentés...' : 'Eredmény frissítése'}
            </button>
          </div>
        </>
      )}
<br /><br />
      <JudgeScenarioHelper title="Hegymászás: bírói szituációk" intro={JUDGE_SCENARIOS.hill.intro} scenarios={JUDGE_SCENARIOS.hill.items} />
    </section>
  )
}

function GameSumoScoring() {
  const [matches, setMatches] = useState([])
  const [allTeams, setAllTeams] = useState([])
  const [selectedMatchId, setSelectedMatchId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionMessage, setActionMessage] = useState(null)
  const [matchSearch, setMatchSearch] = useState('')
  const [timerMode, setTimerMode] = useState('match')

  useEffect(() => {
    const loadMatches = async () => {
      setLoading(true)
      try {
        const [response, allTeamsResponse] = await Promise.all([
          fetch(`${API_BASE}/Sumo/matches`),
          fetch(`${API_BASE}/Teams`)
        ])
        if (!response.ok) {
          throw new Error('Nem sikerült betölteni a szumó meccseket.')
        }

        const data = await response.json()
        const allTeamsData = allTeamsResponse.ok ? await allTeamsResponse.json() : []
        const normalized = (Array.isArray(data) ? data : [data]).filter(Boolean).map((match, index) => {
          const stage = normalizeTournamentStage(match.tournamentStage || match.tournament_stage || 'GS')
          const team1Name = match.team1Name || match.team1_name || ''
          const team2Name = match.team2Name || match.team2_name || ''
          const table = Number(match.table || 1)
          return {
            id: `${stage}:${table}:${team1Name}:${team2Name}:${index}`,
            stage,
            table,
            team1Name,
            team2Name,
            team1History: parseResultHistory(match.team1Result || match.team1result),
            team2History: parseResultHistory(match.team2Result || match.team2result),
            team1Point: Number(match.team1Point || match.team1_point || 0),
            team2Point: Number(match.team2Point || match.team2_point || 0)
          }
        }).filter((match) => match.team1Name && match.team2Name)

        setMatches(normalized)
  setAllTeams(Array.isArray(allTeamsData) ? allTeamsData : [])
        setSelectedMatchId((current) => current || normalized[0]?.id || '')
        if (normalized[0]) {
          setMatchSearch(`${normalized[0].team1Name} vs ${normalized[0].team2Name} | ${STAGE_LABELS[normalized[0].stage] || normalized[0].stage} | ${normalized[0].table}. tábla`)
        }
      } catch (error) {
        setActionMessage({ type: 'danger', text: error.message })
      } finally {
        setLoading(false)
      }
    }

    loadMatches()
  }, [])

  useEffect(() => {
    if (!actionMessage) return undefined
    const timeoutId = window.setTimeout(() => setActionMessage(null), 5000)
    return () => window.clearTimeout(timeoutId)
  }, [actionMessage])

  const selectedMatch = useMemo(
    () => matches.find((match) => match.id === selectedMatchId) || null,
    [matches, selectedMatchId]
  )

  const categoryByTeamName = useMemo(() => new Map(
    allTeams.map((team) => [team.teamName || team.team_name, Number(team.category) === 1 ? 1 : 0])
  ), [allTeams])

  const getMatchLabel = (match) => `${match.team1Name} vs ${match.team2Name} | ${STAGE_LABELS[match.stage] || match.stage} | ${match.table}. tábla`

  const timerLabel = timerMode === 'match'
    ? 'Meccs (45 mp)'
    : timerMode === 'timeout'
      ? 'Időkérés (30 mp)'
      : 'Szünet (30 mp)'

  const handleAddResult = async (outcome) => {
    if (!selectedMatch) return

    if (selectedMatch.team1Point >= 6 || selectedMatch.team2Point >= 6) {
      setActionMessage({ type: 'info', text: 'A kieséses meccs már lezárult (6 pont elérve).' })
      return
    }

    const nextTeam1Result = outcome === 'team1' ? 'W' : outcome === 'team2' ? 'L' : 'D'
    const nextTeam2Result = outcome === 'team1' ? 'L' : outcome === 'team2' ? 'W' : 'D'
    const nextTeam1History = [...selectedMatch.team1History, nextTeam1Result]
    const nextTeam2History = [...selectedMatch.team2History, nextTeam2Result]

    const payload = {
      team1Name: selectedMatch.team1Name,
      team1_name: selectedMatch.team1Name,
      team2Name: selectedMatch.team2Name,
      team2_name: selectedMatch.team2Name,
      team1Point: calculateSumoPoints(nextTeam1History),
      team1_point: calculateSumoPoints(nextTeam1History),
      team2Point: calculateSumoPoints(nextTeam2History),
      team2_point: calculateSumoPoints(nextTeam2History),
      table: selectedMatch.table,
      tournamentStage: STAGE_API_VALUES[selectedMatch.stage] || 1,
      tournament_stage: STAGE_API_VALUES[selectedMatch.stage] || 1,
      team1Result: nextTeam1History.join(','),
      team1result: nextTeam1History.join(','),
      team2Result: nextTeam2History.join(','),
      team2result: nextTeam2History.join(',')
    }

    setSaving(true)
    try {
      let response = await fetch(`${API_BASE}/Sumo`, {
        method: 'PATCH',
        headers: { accept: '*/*', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorText = await response.text()
        const shouldFallback = response.status === 400 && /Object reference not set to an instance of an object/i.test(errorText || '')
        if (!shouldFallback) {
          throw new Error(errorText || 'A szumó meccs frissítése sikertelen volt.')
        }

        response = await fetch(`${API_BASE}/Sumo`, {
          method: 'POST',
          headers: { accept: '*/*', 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          const fallbackErrorText = await response.text()
          throw new Error(fallbackErrorText || 'A szumó meccs frissítése sikertelen volt.')
        }
      }

      setMatches((prev) => prev.map((match) => (
        match.id === selectedMatch.id
          ? {
              ...match,
              team1History: nextTeam1History,
              team2History: nextTeam2History,
              team1Point: calculateSumoPoints(nextTeam1History),
              team2Point: calculateSumoPoints(nextTeam2History)
            }
          : match
      )))
      setActionMessage({ type: 'success', text: 'Szumó eredmény rögzítve.' })
    } catch (error) {
      setActionMessage({ type: 'danger', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="game-scoring-panel">
      <FloatingFeedback message={actionMessage} onClose={() => setActionMessage(null)} />
      <header className="game-scoring-panel__header">
        <h3>Szumó</h3>
        <p>Válassz meccset, majd rögzíts egy új köreredményt egy kattintással.</p>
      </header>

      {loading ? <div className="alert alert-secondary">Meccsek betöltése...</div> : (
        <>
          <div className="sumo-timer-panel mb-3">
            <div className="sumo-timer-panel__header">
              <h4 className="mb-0">Szumó időkezelő</h4>
              <div className="small text-muted">Aktív mód: {timerLabel}</div>
            </div>

            <div className="sumo-timer-modes">
              <button
                type="button"
                className={`btn ${timerMode === 'match' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setTimerMode('match')}
              >
                Meccs 45 mp
              </button>
              <button
                type="button"
                className={`btn ${timerMode === 'timeout' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setTimerMode('timeout')}
              >
                Időkérés 30 mp
              </button>
              <button
                type="button"
                className={`btn ${timerMode === 'break' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setTimerMode('break')}
              >
                Szünet 30 mp
              </button>
            </div>

            <PrecisionStopwatch
              key={`sumo-${timerMode}`}
              mode="countdown"
              initialSeconds={SUMO_TIMER_PRESETS[timerMode] || 30}
              startHint="Indítás"
              stopHint="Megállítás"
              subHint="Koppints az időkezelőre"
              onFinished={() => setActionMessage({ type: 'info', text: 'Letelt az idő.' })}
            />
          </div>

          <div className="row g-3">
            <div className="col-12">
              <SearchPicker
                id="sumo-match-search"
                label="Aktív meccs keresése"
                value={matchSearch}
                onChange={(nextValue) => {
                  setMatchSearch(nextValue)
                  const exactMatch = matches.find((match) => getMatchLabel(match) === nextValue)
                  setSelectedMatchId(exactMatch?.id || '')
                }}
                options={matches}
                placeholder={matches.length === 0 ? 'Nincs meccs' : 'Keresés csapat vagy szakasz alapján...'}
                getOptionValue={(match) => getMatchLabel(match)}
                getOptionLabel={(match) => getMatchLabel(match)}
                renderOption={(match) => (
                  <>
                    <AgeGroupBadge category={categoryByTeamName.get(match.team1Name)} className="me-2" />
                    {match.team1Name}
                    <span className="mx-1">vs</span>
                    <AgeGroupBadge category={categoryByTeamName.get(match.team2Name)} className="me-2" />
                    {match.team2Name}
                    <span className="text-muted ms-2">| {STAGE_LABELS[match.stage] || match.stage} | {match.table}. tábla</span>
                  </>
                )}
              />
            </div>
          </div>

          {selectedMatch && (
            <div className="game-sumo-versus mt-4">
              <div className="game-sumo-versus__team">
                <h4><AgeGroupBadge category={categoryByTeamName.get(selectedMatch.team1Name)} className="me-2" />{selectedMatch.team1Name}</h4>
                <div className="game-sumo-versus__points">{selectedMatch.team1Point} pont</div>
                <div className="small text-muted">{selectedMatch.team1History.join(', ') || 'nincs kör'}</div>
              </div>
              <div className="game-sumo-versus__center">VS</div>
              <div className="game-sumo-versus__team">
                <h4><AgeGroupBadge category={categoryByTeamName.get(selectedMatch.team2Name)} className="me-2" />{selectedMatch.team2Name}</h4>
                <div className="game-sumo-versus__points">{selectedMatch.team2Point} pont</div>
                <div className="small text-muted">{selectedMatch.team2History.join(', ') || 'nincs kör'}</div>
              </div>
            </div>
          )}

          <div className="row g-2 mt-3">
            <div className="col-md-4 d-grid">
              <button type="button" className="btn btn-lg game-action-btn game-action-btn-win" onClick={() => handleAddResult('team1')} disabled={!selectedMatch || saving}>
                {selectedMatch?.team1Name || 'Bal csapat'} nyer
              </button>
            </div>
            <div className="col-md-4 d-grid">
              <button type="button" className="btn btn-lg game-action-btn game-action-btn-draw" onClick={() => handleAddResult('draw')} disabled={!selectedMatch || saving}>
                Döntetlen
              </button>
            </div>
            <div className="col-md-4 d-grid">
              <button type="button" className="btn btn-lg game-action-btn game-action-btn-loss" onClick={() => handleAddResult('team2')} disabled={!selectedMatch || saving}>
                {selectedMatch?.team2Name || 'Jobb csapat'} nyer
              </button>
            </div>
          </div>
        </>
      )}
<br /><br />
      <JudgeScenarioHelper title="Szumó: bírói szituációk" intro={JUDGE_SCENARIOS.sumo.intro} scenarios={JUDGE_SCENARIOS.sumo.items} />
    </section>
  )
}

export default function GameScoringPage({ userPrivilege }) {
  const { competitionType } = useParams()
  const isAdmin = Number(userPrivilege) === 1
  const allowedJudgeCompetition = judgeCompetitionByPrivilege[Number(userPrivilege)] || null
  const visibleCompetitions = competitionTypes.filter((item) => (
    item.slug !== 'osszesitett' && (isAdmin || item.slug === allowedJudgeCompetition)
  ))

  const selectedCompetition = visibleCompetitions.find((item) => item.slug === competitionType) || visibleCompetitions[0] || null

  useEffect(() => {
    document.body.classList.add('game-scoring-active')
    return () => document.body.classList.remove('game-scoring-active')
  }, [])

  return (
    <div className="game-scoring-page">
      <header className="game-scoring-topbar">
        <div className="game-scoring-topbar__left">
          <Link to="/admin/pontozas" className="game-back-link">
            <i className="bi bi-arrow-left" />
            Vissza
          </Link>
          <div>
            <div className="game-scoring-kicker">Bírói mód</div>
            <h1>Pontozó</h1>
          </div>
        </div>
        <div className="game-scoring-topbar__right">0.001 mp pontosság</div>
      </header>

      <section className="game-scoring-content">
        <div className="game-competition-links">
          {visibleCompetitions.map((item) => (
            <Link
              key={item.slug}
              to={`/admin/pontozas-jatek/${item.slug}`}
              className={`game-competition-link ${selectedCompetition?.slug === item.slug ? 'active' : ''}`}
            >
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        {!selectedCompetition && (
          <div className="alert alert-danger">Ehhez a felhasználói jogosultsághoz nem található pontozható versenyszám.</div>
        )}

        {selectedCompetition?.slug === 'kosarra-dobas' && <GameBasketScoring />}
        {selectedCompetition?.slug === 'vonalkovetes' && <GameLineFollowingScoring />}
        {selectedCompetition?.slug === 'hegymaszas' && <GameHillClimbingScoring />}
        {selectedCompetition?.slug === 'szumo' && <GameSumoScoring />}
      </section>
    </div>
  )
}
