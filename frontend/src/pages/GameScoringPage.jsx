import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AgeGroupBadge from '../components/AgeGroupBadge'
import FloatingFeedback from '../components/FloatingFeedback'
import PrecisionStopwatch from '../components/PrecisionStopwatch'
import { competitionTypes } from '../config/adminScoringConfig'
import { judgeCompetitionByPrivilege } from '../config/privilegeConfig'
import { authFetch } from '../services/apiClient'
import { DATA_REFRESH_EVENT } from '../config/dataRefresh'
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

const JUDGE_GUIDE = {
  title: 'Versenybírói kézikönyv 2026',
  intro: [
    'Ez a bírói kézikönyved, ha bármi kérdés merülne fel, akkor ezt hívhatod segítségül. A hivatalos kézikönyvből idézett részeket tartalmaz, de a versenyen a bírói felület és a segítők is segítenek a döntéshozatalban.',
    'A NYOMTAOTT KÖNYVET KIEGÉSZÍTI, DE NEM ÍRJA FELÜL.',
    'Ha nem tudsz dönteni, akkor kérj segítséget a melletted lévő segítőtől, vagy hívd a főrendezőt.',
  ],
  goldenRules: [
    'A szabálykönyv az úr: ez a kivonat csak segédlet, vitás esetben a hivatalos szabálykönyv dönt.',
    'Kérj segítséget: ha bizonytalan vagy, azonnal szólj a melletted lévő segítőnek, aki hívja a főrendezőket.',
    'Figyelj magadra: ha elfáradtál, válts egy kollégáddal. A friss bíró a jó bíró.'
  ],
  interfaceUsage: [
    'Jelentkezz be a megadott Google-fiókodba.',
    'Kattints a profil gombra: Saját versenyszám pontozása.',
    'Itt rögzítheted az eredményeket az aktuális tabella és a beviteli mezők segítségével (az összetett tabella is itt érhető el).'
  ],
  rightsAndDuties: [
    'Döntéshozatal: az elsődleges döntés a tiéd, a szabálykönyv alapján. Ha vitás a helyzet, hívj rendezőt.',
    'Kommunikáció: mindig magyarázd el a döntésedet a csapatnak. A versenyzőknek joguk van ellenőrizni az eredmény rögzítését.',
    'Érvénytelenítés: jogod van egy próbálkozást érvényteleníteni a szabálykönyv szerint, ezt is magyarázd meg a csapatnak.',
    'NINCS JOGOD: bónuszpontot adni, pontot levonni vagy kizárni csapatot. Ilyen esetben azonnal tegyél javaslatot a főrendezőknek.'
  ],
  objectionProtocol: [
    'Csak addig nyújtható be óvás, amíg a csapat a versenyszám területén van.',
    'Állítsd meg a vitát: közöld a csapatokkal, hogy hívod a főrendezőt.',
    'Add át a pályát: egy szabad kollégád vegye át a következő meccset, a verseny nem állhat le.',
    'Várd meg a döntést: a segítővel hívott főrendező átveszi az ügyet, az ő szava a végső.'
  ],
  universalStartProcedure: [
    'A csapat visel passzt (azonosítható).',
    'A robot megfelel a mérethatárnak és az alkatrész-szabályoknak.',
    'A felületen látszik, hogy a csapat még próbálkozhat.',
    'Egyértelmű visszaszámlálás, rajtjelzés és stopper indítása.'
  ],
  competitions: [
    {
      id: 'hill',
      title: '1. Hegymászás',
      presence: 'Jelenlévők: 4 bíró, 1 segítő (minimum: 2 bíró).',
      rotation: 'Rotáció: csere minden levezetett csapat után. Egy bíró kíséri végig a csapatot az összes emelkedőn.',
      rule: 'Szabály: minden csapat csak egyszer próbálkozhat, és azt egyben kell letudnia. Mindig az első emelkedőnél kezdenek.',
      flow: [
        'A csapat a rajtzónába helyezi a robotot.',
        'Indítás + stopper indítás.',
        'A robot teljesíti a szintet (ha bármely része érinti a célvonalat).',
        'Eredmény rögzítése, majd új emelkedő kezdése (stopper nullázása).'
      ],
      decisions: [
        'Robot leesik vagy felborul: a próbálkozás véget ér (megfoghatod, hogy ne sérüljön).',
        'Robot megáll vagy visszagurul: a próbálkozás véget ér.',
        'Versenyző a robothoz ér: a próbálkozás véget ér.',
        'Külső beavatkozás: a próbálkozás az adott emelkedőn újrakezdhető.',
        'Pályahiba vagy akadály: a próbálkozás az adott emelkedőn újrakezdhető. Hívj rendezőt.'
      ]
    },
    {
      id: 'basket',
      title: '2. Kosárra dobás',
      presence: 'Jelenlévők: 3 bíró, 2 segítő (minimum: 2 bíró).',
      rotation: 'Rotáció: csere 2 levezetett csapat után.',
      rule: 'Szabály: csak a bíró által adott labdával dobhatnak (folyamatosan adogasd nekik). A csapatnak egy próbálkozása van.',
      flow: [
        'A csapat a dobóterületre teszi a robotot.',
        'Indítás + stopper indítás.',
        'A próba véget ér, ha letelik a 3 perc, vagy elérik a 10 dobást, vagy elérik az 5 érvényes pontszerzést.'
      ],
      validity: [
        'A dobás előtt és után helyváltoztató mozgást végzett.',
        'A robot dobta el a labdát.',
        'A robot végig a dobóterületen belül maradt.',
        'A dobás megkezdett: amint megvan az első mozgás. Elvégzett: amint a labda elhagyja a területet.'
      ],
      decisions: [
        'Szabályos dobás: a dobás érvényes. Rögzítsd a dobások számánál (+ ha kosárba ment, ott is).',
        'Első mozgás után kimegy a területből: a dobás újrakezdhető (amíg el nem dobta). Ne számold dobásnak.',
        'A labda elhagyja a területet: a dobás elvégzettnek minősül. Rögzítsd a dobás számát.',
        'A versenyző hozzáér a robothoz vagy későn teszi be a labdát: ha eldobta, a dobás érvénytelen; ha nem dobta el, újrakezdhető.'
      ]
    },
    {
      id: 'line',
      title: '3. Vonalkövetés',
      presence: 'Jelenlévők: 3 bíró, 2 segítő (minimum: 2 bíró).',
      rotation: 'Rotáció: csere 2 levezetett csapat után.',
      rule: 'Szabály: minden csapatnak 2 próbálkozása van.',
      flow: [
        'A csapat a rajtvonal elé teszi a robotot (fotocella még nem indul).',
        'Indítás (figyeld az időmérést).',
        'Érvényes célba érés: a robot áthalad a célvonalon és leállítja az órát, idő rögzítése.',
        'Hibapont: ha a csapat eléri a 120 másodpercet, állítsd le őket, és 120 másodpercet rögzíts.'
      ],
      checkpoints: [
        'A versenyző bármikor hozzáérhet a robothoz.',
        'Ilyenkor a legutoljára elhagyott ellenőrző pont (sárga pötty) mögé kell visszatenni. Mondd be a pötty betűjelét.',
        'Helyes visszahelyezés: a robot teljes terjedelmével a pont mögött van.'
      ],
      decisions: [
        'Rossz helyre teszi vissza: szólj azonnal. Ha figyelmen kívül hagyja az utasítást, a próba véget ér, 120 másodpercet rögzíts.',
        'A robot nem állítja le az órát: ajánld fel az általad mért (vagy látott) időt. Ha nem fogadják el, újrapróbálkozhatnak.'
      ]
    },
    {
      id: 'sumo',
      title: '4. Szumó',
      presence: 'Jelenlévők: 6 bíró, 3 segítő (minimum: 4 bíró).',
      rotation: 'Rotáció: csere 2 levezetett párharc után.',
      rule: 'Szabály: 1 párharc = 3 mérkőzés. Mind a hármat le kell játszani.',
      flow: [
        'Robotok startpozícióba helyezése.',
        'Indítás + stopper indítás.',
        'Győztes: aki letolja a másikat a pályáról.',
        'Két meccs között max. 30 mp szünet (időkérés: csapatonként, fordulónként 1x 30 mp).'
      ],
      warnings: [
        'A versenyző nem ül le a helyére.',
        'A robot nem indul el 5 mp-en belül.',
        'A robot nem az ellentétes irányba mozog.',
        'A robot nem megy el a pálya szélét jelző fehér sávig.',
        'Egy párharcon belül 2 figyelmeztetés = vesztett meccs.'
      ],
      decisions: [
        'Patthelyzet (összeakadás): csak akkor állítsd meg, ha mindkét versenyző kézfeltartással jelzi. A robotokon nem módosíthatnak, az idő megy tovább.',
        'Leesés időzítése nem egyértelmű: az eredmény döntetlen (vagy ha az idő lejár, és mindkettő a pályán van).',
        'Forduló vége: ha tiéd az utolsó párharc a fordulóban, a kezdés előtt értesíts egy rendezőt.'
      ]
    }
  ]
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
    if (nextValue === '' || nextValue === null || nextValue === undefined) return ''
    const parsed = integer ? Number.parseInt(nextValue, 10) : Number(nextValue)
    if (!Number.isFinite(parsed)) return min !== undefined ? min : ''
    const minLimited = min !== undefined ? Math.max(min, parsed) : parsed
    const limited = max !== undefined ? Math.min(max, minLimited) : minLimited
    if (integer) return Math.round(limited)
    return Number(limited.toFixed(3))
  }

  const currentNumber = Number(value)
  const canDecrease = !disabled && value !== '' && Number.isFinite(currentNumber) && (min === undefined || currentNumber > min)
  const canIncrease = !disabled && (value === '' || !Number.isFinite(currentNumber) || max === undefined || currentNumber < max)

  const changeBy = (direction) => {
    const base = Number.isFinite(currentNumber) ? currentNumber : Number(min || 0)
    const stepSize = Number(step || 1)
    const next = base + direction * stepSize
    if (integer) {
      onChange(Math.round(next))
    } else {
      onChange(Number(next.toFixed(3)))
    }
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
        step={step < 1 ? 'any' : step}
        inputMode={inputMode}
        className="form-control"
        value={value ?? ''}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onBlur={(event) => {
          if (event.target.value !== '') {
            onChange(normalize(event.target.value))
          }
        }}
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
      return source.slice(0, 100)
    }

    const filtered = source.filter((item) => getOptionLabel(item).toLocaleLowerCase('hu-HU').includes(normalizedQuery))
    if (filtered.length === 1 && getOptionLabel(filtered[0]).toLocaleLowerCase('hu-HU') === normalizedQuery) {
      return source.slice(0, 100)
    }

    return filtered.slice(0, 100)
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
        onFocus={(event) => {
          setIsOpen(true)
          event.target.select?.()
        }}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 150)}
        onChange={(event) => onChange(event.target.value)}
      />

      {isOpen && (
        <div className="list-group search-picker-results shadow bg-white border rounded" style={{ maxHeight: '20rem', overflowY: 'auto', zIndex: 1050 }}>
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

function JudgeScenarioHelper({ competitionId }) {
  const selectedCompetition = JUDGE_GUIDE.competitions.find((competition) => competition.id === competitionId) || JUDGE_GUIDE.competitions[0] || null
  const [activeSectionId, setActiveSectionId] = useState(selectedCompetition ? `${selectedCompetition.id}-basics` : 'general-golden')

  useEffect(() => {
    setActiveSectionId(selectedCompetition ? `${selectedCompetition.id}-basics` : 'general-golden')
  }, [selectedCompetition])

  const generalSections = [
    { id: 'general-golden', title: 'A 3 aranyszabályod', items: JUDGE_GUIDE.goldenRules },
    { id: 'general-interface', title: 'A bírói felület használata', items: JUDGE_GUIDE.interfaceUsage },
    { id: 'general-rights', title: 'Jogok és kötelességek', items: JUDGE_GUIDE.rightsAndDuties },
    { id: 'general-objection', title: 'Az óvás protokollja', items: JUDGE_GUIDE.objectionProtocol },
    { id: 'general-start', title: 'Univerzális rajtprocedúra', items: JUDGE_GUIDE.universalStartProcedure }
  ]

  const competitionSections = selectedCompetition
    ? [
      {
        id: `${selectedCompetition.id}-basics`,
        title: selectedCompetition.title,
        items: [selectedCompetition.presence, selectedCompetition.rotation, selectedCompetition.rule]
      },
      {
        id: `${selectedCompetition.id}-flow`,
        title: 'A próbálkozás menete',
        items: selectedCompetition.flow
      },
      ...(selectedCompetition.validity ? [{
        id: `${selectedCompetition.id}-validity`,
        title: 'Az érvényes dobás feltételei',
        items: selectedCompetition.validity
      }] : []),
      ...(selectedCompetition.checkpoints ? [{
        id: `${selectedCompetition.id}-checkpoints`,
        title: 'Ellenőrző pontok (sárga pöttyök) használata',
        items: selectedCompetition.checkpoints
      }] : []),
      ...(selectedCompetition.warnings ? [{
        id: `${selectedCompetition.id}-warnings`,
        title: 'Figyelmeztetések',
        items: selectedCompetition.warnings
      }] : []),
      {
        id: `${selectedCompetition.id}-decisions`,
        title: 'Mire figyelj (döntések)',
        items: selectedCompetition.decisions
      }
    ]
    : []

  const renderGuideItem = (item, key) => {
    if (typeof item !== 'string') {
      return <li key={key}>{String(item)}</li>
    }

    const separatorIndex = item.indexOf(':')
    if (separatorIndex === -1) {
      return <li key={key}>{item}</li>
    }

    const label = item.slice(0, separatorIndex).trim()
    const description = item.slice(separatorIndex + 1).trim()

    if (!label || !description) {
      return <li key={key}>{item}</li>
    }

    return (
      <li key={key}>
        <strong>{label}:</strong> "{description}"
      </li>
    )
  }

  return (
    <section className="judge-scenarios mb-3">
      <div className="judge-scenarios__shell">
        <div className="judge-scenarios__head">
          <h5 className="mb-2">{JUDGE_GUIDE.title}</h5>
          {JUDGE_GUIDE.intro.map((paragraph, index) => (
            <p className={`${index === JUDGE_GUIDE.intro.length - 1 ? 'small mb-0' : 'small mb-2'}`} key={`intro-${index}`}>{paragraph}</p>
          ))}
        </div>

        <div className="judge-scenarios__body">
          <div className="judge-scenarios__list">
            {competitionSections.map((section) => (
              <div key={section.id} className="judge-scenarios__item">
                <button
                  type="button"
                  className={`judge-scenarios__trigger ${activeSectionId === section.id ? 'is-open' : ''}`}
                  onClick={() => setActiveSectionId((current) => (current === section.id ? '' : section.id))}
                  aria-expanded={activeSectionId === section.id}
                >
                  <span>{section.title}</span>
                  <i className={`bi ${activeSectionId === section.id ? 'bi-chevron-up' : 'bi-chevron-down'}`} aria-hidden="true" />
                </button>
                <div className={`judge-scenarios__content ${activeSectionId === section.id ? 'is-open' : ''}`}>
                  <div className="judge-scenarios__result mt-2">
                    <ul className="mb-0 ps-3">
                      {section.items.map((item, index) => renderGuideItem(item, `${section.id}-${index}`))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
            {generalSections.map((section) => (
              <div key={section.id} className="judge-scenarios__item">
                <button
                  type="button"
                  className={`judge-scenarios__trigger ${activeSectionId === section.id ? 'is-open' : ''}`}
                  onClick={() => setActiveSectionId((current) => (current === section.id ? '' : section.id))}
                  aria-expanded={activeSectionId === section.id}
                >
                  <span>{section.title}</span>
                  <i className={`bi ${activeSectionId === section.id ? 'bi-chevron-up' : 'bi-chevron-down'}`} aria-hidden="true" />
                </button>
                <div className={`judge-scenarios__content ${activeSectionId === section.id ? 'is-open' : ''}`}>
                  <div className="judge-scenarios__result mt-2">
                    <ul className="mb-0 ps-3">
                      {section.items.map((item) => <li key={`${section.id}-${item}`}>{item}</li>)}
                    </ul>
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
    window.addEventListener(DATA_REFRESH_EVENT, loadData)
    return () => window.removeEventListener(DATA_REFRESH_EVENT, loadData)
  }, [])

  useEffect(() => {
    if (!actionMessage) return undefined
    const timeoutId = window.setTimeout(() => setActionMessage(null), 5000)
    return () => window.clearTimeout(timeoutId)
  }, [actionMessage])

  const handleResetForm = () => {
    setSelectedTeamName('')
    setTeamSearch('')
    setDraft(createBasketDraft())
  }

  const totalHits = Number(draft.hoop1) + Number(draft.hoop2) + Number(draft.hoop3) + Number(draft.hoop4) + Number(draft.hoop5)

  const handleSave = async () => {
    const time = Number(draft.time)
    const throwNumber = Number.parseInt(draft.throwNumber, 10)

    if (!selectedTeamName) {
      setActionMessage({ type: 'danger', text: 'Válassz csapatot.' })
      return
    }

    if (totalHits > MAX_BASKET_HITS) {
      setActionMessage({ type: 'danger', text: 'Összesen legfeljebb 5 érvényes találat adható meg. 5 találat után a futam véget ér.' })
      return
    }

    if (!Number.isInteger(throwNumber) || throwNumber < 1 || throwNumber > MAX_BASKET_ATTEMPTS) {
      setActionMessage({ type: 'danger', text: 'Az összes dobás száma 1 és 10 közötti egész szám kell legyen.' })
      return
    }

    if (throwNumber < totalHits) {
      setActionMessage({
        type: 'danger',
        text: `Az összes dobás száma (${throwNumber}) nem lehet kevesebb a sikeres találatok számánál (${totalHits})!`
      })
      return
    }

    if (!Number.isFinite(time) || time <= 0 || time > MAX_TIME_SECONDS) {
      setActionMessage({ type: 'danger', text: `Adj meg érvényes időt (0-${MAX_TIME_SECONDS} mp).` })
      return
    }

    setSaving(true)
    try {
      const payload = {
        teamName: selectedTeamName,
        hoop1: Number(draft.hoop1 || 0),
        hoop2: Number(draft.hoop2 || 0),
        hoop3: Number(draft.hoop3 || 0),
        hoop4: Number(draft.hoop4 || 0),
        hoop5: Number(draft.hoop5 || 0),
        time,
        throwNumber
      }

      let response = await authFetch(`${API_BASE}/Basketball`, {
        method: 'PUT',
        headers: { accept: '*/*', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const fallbackResponse = await authFetch(`${API_BASE}/Basketball/modifyExistingAttempt`, {
          method: 'PUT',
          headers: { accept: '*/*', 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (fallbackResponse.ok) {
          response = fallbackResponse
        }
      }

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'A mentés sikertelen volt.')
      }

      handleResetForm()
      setActionMessage({ type: 'success', text: `"${selectedTeamName}" kosárra dobás eredménye sikeresen rögzítve!` })
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
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h3>Kosárra dobás</h3>
            <p>Maximum 10 dobásból legfeljebb 5 érvényes találat érhető el. 5 találat után a futam lezárul.</p>
          </div>
          {selectedTeamName && (
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleResetForm}>
              Új csapat
            </button>
          )}
        </div>
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
                  if (exactMatch) {
                    setSelectedTeamName(exactMatch)
                    setDraft(createBasketDraft())
                  } else {
                    setSelectedTeamName('')
                    setDraft(createBasketDraft())
                  }
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
              <label className="form-label">Összes dobás száma (max 10)</label>
              <StepperInput
                value={draft.throwNumber}
                min={Math.max(1, totalHits)}
                max={MAX_BASKET_ATTEMPTS}
                step={1}
                integer
                onChange={(value) => setDraft((prev) => ({ ...prev, throwNumber: value }))}
              />
            </div>
            <div className="col-12 col-lg-3">
              <label className="form-label">Érvényes találatok</label>
              <div className={`game-scoring-counter ${totalHits === 5 ? 'text-success fw-bold' : ''}`}>
                {totalHits} / {MAX_BASKET_HITS} {totalHits === 5 ? '✓ (Kész)' : ''}
              </div>
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
                      setActionMessage({ type: 'danger', text: 'Maximum 5 érvényes találat adható meg összesen. 5 találat után a dobások lezárulnak.' })
                      return
                    }
                    if (nextDraft.throwNumber && Number(nextDraft.throwNumber) < nextTotal) {
                      nextDraft.throwNumber = nextTotal
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

          <div className="d-flex justify-content-end gap-2 mt-4">
            <button type="button" className="btn btn-outline-secondary" onClick={handleResetForm} disabled={saving}>
              Mégse
            </button>
            <button type="button" className="btn btn-lg btn-warning game-scoring-save-btn" onClick={handleSave} disabled={saving || !selectedTeamName}>
              {saving ? 'Mentés...' : 'Eredmény rögzítése'}
            </button>
          </div>
        </>
      )}
<br /><br />
      <JudgeScenarioHelper competitionId="basket" />
    </section>
  )
}

function GameLineFollowingScoring() {
  const [teamNames, setTeamNames] = useState([])
  const [allTeams, setAllTeams] = useState([])
  const [lineResults, setLineResults] = useState([])
  const [selectedTeamName, setSelectedTeamName] = useState('')
  const [selectedTeamCategory, setSelectedTeamCategory] = useState(null)
  const [time, setTime] = useState('')
  const [stage, setStage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionMessage, setActionMessage] = useState(null)
  const [teamSearch, setTeamSearch] = useState('')
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [resultsSearch, setResultsSearch] = useState('')
  const [resultToDelete, setResultToDelete] = useState(null)

  const loadData = useCallback(async () => {
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
      setLineResults(Array.isArray(lineResultsData) ? lineResultsData : [])
    } catch (error) {
      setActionMessage({ type: 'danger', text: error.message })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    window.addEventListener(DATA_REFRESH_EVENT, loadData)
    return () => window.removeEventListener(DATA_REFRESH_EVENT, loadData)
  }, [loadData])

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
      const response = await authFetch(`${API_BASE}/LineFollowing`, {
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

      // Reload results
      const res = await fetch(`${API_BASE}/LineFollowing`)
      if (res.ok) {
        const data = await res.json()
        setLineResults(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      setActionMessage({ type: 'danger', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteResult = async () => {
    if (!resultToDelete) return
    const teamName = resultToDelete.team_name || resultToDelete.teamName
    const rTime = Number(resultToDelete.time)
    const rStage = Number(resultToDelete.tournamentStage || resultToDelete.tournament_stage || resultToDelete.stage || 1)

    setSaving(true)
    try {
      const response = await authFetch(`${API_BASE}/LineFollowing/${encodeURIComponent(teamName)}/${rTime}/${rStage}`, {
        method: 'DELETE',
        headers: { accept: '*/*' }
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Az eredmény törlése sikertelen volt.')
      }
      setLineResults((prev) => prev.filter((item) => item !== resultToDelete))
      setActionMessage({ type: 'success', text: 'Az eredmény sikeresen törölve.' })
      setResultToDelete(null)
    } catch (error) {
      setActionMessage({ type: 'danger', text: error.message })
      setResultToDelete(null)
    } finally {
      setSaving(false)
    }
  }

  const stageFilteredResults = useMemo(() => {
    return lineResults.filter((item) => {
      const itemStage = Number(item.tournamentStage || item.tournament_stage || item.stage || 1)
      return itemStage === stage
    })
  }, [lineResults, stage])

  const displayResults = useMemo(() => {
    const query = resultsSearch.trim().toLowerCase()
    let filtered = stageFilteredResults
    if (query) {
      filtered = filtered.filter((item) => {
        const name = (item.team_name || item.teamName || '').toLowerCase()
        const timeStr = `${item.time} s`
        return name.includes(query) || timeStr.includes(query)
      })
    }

    return [...filtered].sort((a, b) => {
      const aName = a.team_name || a.teamName || ''
      const bName = b.team_name || b.teamName || ''

      if (sortField === 'name') {
        return sortDirection === 'desc'
          ? bName.localeCompare(aName, 'hu')
          : aName.localeCompare(bName, 'hu')
      }

      const aTime = Number(a.time) || 0
      const bTime = Number(b.time) || 0

      if (sortDirection === 'desc') {
        return (bTime - aTime) || bName.localeCompare(aName, 'hu')
      }
      return (aTime - bTime) || aName.localeCompare(bName, 'hu')
    })
  }, [stageFilteredResults, resultsSearch, sortField, sortDirection])

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

          <div className="card shadow-sm border mt-4 p-3 bg-light">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <div>
                <h4 className="h5 mb-0">Rögzített próbálkozások ({LINE_STAGES.find((s) => s.value === stage)?.label || `${stage}. szakasz`})</h4>
                <span className="text-muted small">{displayResults.length} eredmény találva</span>
              </div>
              <div className="btn-group" role="group" aria-label="Rendezés">
                <button
                  type="button"
                  className={`btn btn-sm ${sortField === 'name' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => {
                    if (sortField === 'name') {
                      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
                    } else {
                      setSortField('name')
                      setSortDirection('asc')
                    }
                  }}
                >
                  <i className={`bi ${sortField === 'name' ? (sortDirection === 'asc' ? 'bi-sort-alpha-down' : 'bi-sort-alpha-up-alt') : 'bi-sort-alpha-down'} me-1`} />
                  Név szerint {sortField === 'name' ? (sortDirection === 'asc' ? '(A → Z ↑)' : '(Z → A ↓)') : ''}
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${sortField === 'time' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => {
                    if (sortField === 'time') {
                      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
                    } else {
                      setSortField('time')
                      setSortDirection('asc')
                    }
                  }}
                >
                  <i className={`bi ${sortField === 'time' ? (sortDirection === 'asc' ? 'bi-sort-numeric-down' : 'bi-sort-numeric-up-alt') : 'bi-sort-numeric-down'} me-1`} />
                  Idő szerint {sortField === 'time' ? (sortDirection === 'asc' ? '(gyorsabb elöl ↑)' : '(lassabb elöl ↓)') : ''}
                </button>
              </div>
            </div>

            <div className="mb-3">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Keresés csapatnév vagy idő alapján..."
                value={resultsSearch}
                onChange={(e) => setResultsSearch(e.target.value)}
              />
            </div>

            {displayResults.length === 0 ? (
              <div className="alert alert-secondary mb-0">Ebben a szakaszban még nincs rögzített próbálkozás.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover align-middle mb-0 bg-white rounded shadow-sm">
                  <thead className="table-light">
                    <tr>
                      <th>Csapat</th>
                      <th>Korosztály</th>
                      <th>Szakasz</th>
                      <th className="text-end">Idő</th>
                      <th className="text-end" style={{ width: '80px' }}>Művelet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayResults.map((item, idx) => {
                      const teamName = item.team_name || item.teamName
                      const teamObj = allTeams.find((t) => (t.teamName || t.team_name) === teamName)
                      const category = teamObj ? (Number(teamObj.category) === 1 ? 1 : 0) : null
                      const itemStage = Number(item.tournamentStage || item.tournament_stage || item.stage || 1)
                      const stageLabel = LINE_STAGES.find((s) => s.value === itemStage)?.label || `${itemStage}. szakasz`

                      return (
                        <tr key={`${teamName}-${item.time}-${itemStage}-${idx}`}>
                          <td className="fw-semibold">
                            <AgeGroupBadge category={category} className="me-2" />
                            {teamName}
                          </td>
                          <td>
                            <span className="small text-muted">{category === 1 ? 'Középiskola' : 'Általános iskola'}</span>
                          </td>
                          <td>
                            <span className="badge text-bg-light border">{stageLabel}</span>
                          </td>
                          <td className="text-end font-monospace fw-bold">
                            {item.time} s
                          </td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => setResultToDelete(item)}
                              title="Eredmény törlése"
                            >
                              <i className="bi bi-trash" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {resultToDelete && (
        <div className="modal d-block" tabIndex="-1" role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-dark">Vonalkövetés eredményének törlése</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setResultToDelete(null)} />
              </div>
              <div className="modal-body">
                <p className="mb-2 text-dark">Biztosan törlöd ezt az eredményt?</p>
                <p className="fw-semibold mb-1 text-dark">{resultToDelete.team_name || resultToDelete.teamName}</p>
                <p className="small mb-0 text-dark">Idő: {resultToDelete.time} s</p>
                <p className="small mb-0 text-dark">Szakasz: {LINE_STAGES.find((s) => s.value === Number(resultToDelete.tournamentStage || resultToDelete.tournament_stage || resultToDelete.stage || 1))?.label || `${resultToDelete.tournamentStage || 1}. szakasz`}</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setResultToDelete(null)} disabled={saving}>
                  Mégse
                </button>
                <button type="button" className="btn btn-danger" onClick={handleDeleteResult} disabled={saving}>
                  {saving ? 'Törlés...' : 'Törlés megerősítése'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
<br /><br />
      <JudgeScenarioHelper competitionId="line" />
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
    window.addEventListener(DATA_REFRESH_EVENT, loadData)
    return () => window.removeEventListener(DATA_REFRESH_EVENT, loadData)
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
      const levelResponse = await authFetch(`${API_BASE}/HillClimbing/${encodeURIComponent(selectedTeamName)}/${parsedLevel}/${apiTime}`, {
        method: 'PATCH'
      })

      if (!levelResponse.ok) {
        const errorText = await levelResponse.text()
        throw new Error(errorText || 'A szint/idő mentés sikertelen volt.')
      }

      const statusResponse = await authFetch(`${API_BASE}/HillClimbing/${encodeURIComponent(selectedTeamName)}/${parsedEliminated}`, {
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
      <JudgeScenarioHelper competitionId="hill" />
    </section>
  )
}

const buildPairKey = (team1Name, team2Name) => [team1Name, team2Name].sort((left, right) => left.localeCompare(right)).join('::')

const hasResultHistory = (match) => {
  const team1History = parseResultHistory(match.team1Result ?? match.team1result)
  const team2History = parseResultHistory(match.team2Result ?? match.team2result)
  return team1History.length > 0 || team2History.length > 0
}

const dedupeMatches = (rawMatches) => {
  const byKey = new Map()

  rawMatches.forEach((match) => {
    const stage = normalizeTournamentStage(match.tournamentStage || match.tournament_stage || 'GS')
    const t1 = match.team1Name || match.team1_name || ''
    const t2 = match.team2Name || match.team2_name || ''
    const table = Number(match.table ?? 0)
    const key = `${stage}::${table}::${buildPairKey(t1, t2)}`
    const existing = byKey.get(key)

    if (!existing) {
      byKey.set(key, match)
      return
    }

    const existingHasResults = hasResultHistory(existing)
    const incomingHasResults = hasResultHistory(match)

    if (incomingHasResults && !existingHasResults) {
      byKey.set(key, match)
      return
    }

    if (incomingHasResults === existingHasResults) {
      const existingPoints = Number(existing.team1Point ?? existing.team1_point ?? 0) + Number(existing.team2Point ?? existing.team2_point ?? 0)
      const incomingPoints = Number(match.team1Point ?? match.team1_point ?? 0) + Number(match.team2Point ?? match.team2_point ?? 0)
      if (incomingPoints >= existingPoints) {
        byKey.set(key, match)
      }
    }
  })

  return Array.from(byKey.values())
}

function GameSumoScoring() {
  const [matches, setMatches] = useState([])
  const [allTeams, setAllTeams] = useState([])
  const [selectedMatchId, setSelectedMatchId] = useState('')
  const [matchSearch, setMatchSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionMessage, setActionMessage] = useState(null)
  const [timerMode, setTimerMode] = useState('match')

  const getMatchLabel = useCallback((match) => {
    if (!match) return ''
    return `${match.team1Name} vs ${match.team2Name} | #${match.table}. mérkőzés | ${STAGE_LABELS[match.stage] || match.stage}`
  }, [])

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
        const deduped = dedupeMatches(Array.isArray(data) ? data : [data])
        const normalized = deduped.map((match, index) => {
          const stage = normalizeTournamentStage(match.tournamentStage || match.tournament_stage || 'GS')
          const team1Name = match.team1Name || match.team1_name || ''
          const team2Name = match.team2Name || match.team2_name || ''
          const table = Number(match.table ?? 0) || (index + 1)
          return {
            id: `${stage}::${table}::${team1Name}::${team2Name}::${index}`,
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
          .sort((a, b) => (Number(a.table) || 0) - (Number(b.table) || 0))

        setMatches(normalized)
        setAllTeams(Array.isArray(allTeamsData) ? allTeamsData : [])

        if (normalized.length > 0) {
          setSelectedMatchId((current) => {
            const existing = normalized.find((m) => m.id === current)
            const target = existing || normalized[0]
            setMatchSearch(getMatchLabel(target))
            return target.id
          })
        }
      } catch (error) {
        setActionMessage({ type: 'danger', text: error.message })
      } finally {
        setLoading(false)
      }
    }

    loadMatches()
    window.addEventListener(DATA_REFRESH_EVENT, loadMatches)
    return () => window.removeEventListener(DATA_REFRESH_EVENT, loadMatches)
  }, [getMatchLabel])

  useEffect(() => {
    if (!actionMessage) return undefined
    const timeoutId = window.setTimeout(() => setActionMessage(null), 5000)
    return () => window.clearTimeout(timeoutId)
  }, [actionMessage])

  const categoryByTeamName = useMemo(() => new Map(
    allTeams.map((team) => [team.teamName || team.team_name, Number(team.category) === 1 ? 1 : 0])
  ), [allTeams])

  const timerLabel = timerMode === 'match'
    ? 'Meccs (45 mp)'
    : timerMode === 'timeout'
      ? 'Időkérés (30 mp)'
      : 'Szünet (30 mp)'

  const GROUP_MATCH_RESULT_LIMIT = 3
  const KNOCKOUT_WIN_POINTS = 6

  const selectedMatch = useMemo(() => {
    if (selectedMatchId) {
      const found = matches.find((match) => match.id === selectedMatchId)
      if (found) return found
    }
    return matches[0] || null
  }, [matches, selectedMatchId])

  const isKnockoutMatch = selectedMatch && selectedMatch.stage !== 'GS'
  const isKnockoutWinner = Boolean(
    isKnockoutMatch && (selectedMatch.team1Point >= KNOCKOUT_WIN_POINTS || selectedMatch.team2Point >= KNOCKOUT_WIN_POINTS)
  )
  const knockoutWinnerName = isKnockoutWinner
    ? selectedMatch.team1Point >= KNOCKOUT_WIN_POINTS
      ? selectedMatch.team1Name
      : selectedMatch.team2Name
    : null
  const isGroupLimitReached = Boolean(
    selectedMatch && selectedMatch.stage === 'GS' && selectedMatch.team1History.length >= GROUP_MATCH_RESULT_LIMIT
  )
  const isMatchLocked = isKnockoutWinner || isGroupLimitReached

  const handleAddResult = async (outcome) => {
    if (!selectedMatch || saving) return

    if (isKnockoutWinner) {
      setActionMessage({ type: 'info', text: 'A kieséses meccs már lezárult (6 pont elérve).' })
      return
    }

    if (isGroupLimitReached) {
      setActionMessage({ type: 'info', text: `Csoportköri meccsen legfeljebb ${GROUP_MATCH_RESULT_LIMIT} eredmény rögzíthető.` })
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

    const reversedPayload = {
      team1Name: selectedMatch.team2Name,
      team1_name: selectedMatch.team2Name,
      team2Name: selectedMatch.team1Name,
      team2_name: selectedMatch.team1Name,
      team1Point: calculateSumoPoints(nextTeam2History),
      team1_point: calculateSumoPoints(nextTeam2History),
      team2Point: calculateSumoPoints(nextTeam1History),
      team2_point: calculateSumoPoints(nextTeam1History),
      table: selectedMatch.table,
      tournamentStage: STAGE_API_VALUES[selectedMatch.stage] || 1,
      tournament_stage: STAGE_API_VALUES[selectedMatch.stage] || 1,
      team1Result: nextTeam2History.join(','),
      team1result: nextTeam2History.join(','),
      team2Result: nextTeam1History.join(','),
      team2result: nextTeam1History.join(',')
    }

    setSaving(true)
    try {
      let response = await authFetch(`${API_BASE}/Sumo`, {
        method: 'PATCH',
        headers: { accept: '*/*', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const postResponse = await authFetch(`${API_BASE}/Sumo`, {
          method: 'POST',
          headers: { accept: '*/*', 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (postResponse.ok) {
          response = postResponse
        }
      }

      if (!response.ok) {
        const revPatchResponse = await authFetch(`${API_BASE}/Sumo`, {
          method: 'PATCH',
          headers: { accept: '*/*', 'Content-Type': 'application/json' },
          body: JSON.stringify(reversedPayload)
        })
        if (revPatchResponse.ok) {
          response = revPatchResponse
        }
      }

      if (!response.ok) {
        const revPostResponse = await authFetch(`${API_BASE}/Sumo`, {
          method: 'POST',
          headers: { accept: '*/*', 'Content-Type': 'application/json' },
          body: JSON.stringify(reversedPayload)
        })
        if (revPostResponse.ok) {
          response = revPostResponse
        }
      }

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'A szumó meccs frissítése sikertelen volt.')
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

  const handleDeleteRoundResult = async (resultIndex) => {
    if (!selectedMatch || saving) return

    const prevTeam1History = [...(selectedMatch.team1History || [])]
    const prevTeam2History = [...(selectedMatch.team2History || [])]
    const prevTeam1Point = selectedMatch.team1Point
    const prevTeam2Point = selectedMatch.team2Point

    const nextTeam1History = prevTeam1History.filter((_, index) => index !== resultIndex)
    const nextTeam2History = prevTeam2History.filter((_, index) => index !== resultIndex)
    const nextTeam1Point = calculateSumoPoints(nextTeam1History)
    const nextTeam2Point = calculateSumoPoints(nextTeam2History)
    const nextTeam1ResultStr = nextTeam1History.join(',')
    const nextTeam2ResultStr = nextTeam2History.join(',')

    // 1. Azonnali helyi (optimistic) frissítés
    setMatches((prev) => prev.map((match) => (
      match.id === selectedMatch.id
        ? {
            ...match,
            team1History: nextTeam1History,
            team2History: nextTeam2History,
            team1Point: nextTeam1Point,
            team2Point: nextTeam2Point
          }
        : match
    )))

    const payload = {
      team1Name: selectedMatch.team1Name,
      team1_name: selectedMatch.team1Name,
      team2Name: selectedMatch.team2Name,
      team2_name: selectedMatch.team2Name,
      team1Point: nextTeam1Point,
      team1_point: nextTeam1Point,
      team2Point: nextTeam2Point,
      team2_point: nextTeam2Point,
      table: selectedMatch.table,
      tournamentStage: STAGE_API_VALUES[selectedMatch.stage] || 1,
      tournament_stage: STAGE_API_VALUES[selectedMatch.stage] || 1,
      team1Result: nextTeam1ResultStr,
      team1result: nextTeam1ResultStr,
      team2Result: nextTeam2ResultStr,
      team2result: nextTeam2ResultStr
    }

    const reversedPayload = {
      team1Name: selectedMatch.team2Name,
      team1_name: selectedMatch.team2Name,
      team2Name: selectedMatch.team1Name,
      team2_name: selectedMatch.team1Name,
      team1Point: nextTeam2Point,
      team1_point: nextTeam2Point,
      team2Point: nextTeam1Point,
      team2_point: nextTeam1Point,
      table: selectedMatch.table,
      tournamentStage: STAGE_API_VALUES[selectedMatch.stage] || 1,
      tournament_stage: STAGE_API_VALUES[selectedMatch.stage] || 1,
      team1Result: nextTeam2ResultStr,
      team1result: nextTeam2ResultStr,
      team2Result: nextTeam1ResultStr,
      team2result: nextTeam1ResultStr
    }

    setSaving(true)
    try {
      let response = await authFetch(`${API_BASE}/Sumo`, {
        method: 'PATCH',
        headers: { accept: '*/*', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const postResponse = await authFetch(`${API_BASE}/Sumo`, {
          method: 'POST',
          headers: { accept: '*/*', 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (postResponse.ok) {
          response = postResponse
        }
      }

      if (!response.ok) {
        const revPatchResponse = await authFetch(`${API_BASE}/Sumo`, {
          method: 'PATCH',
          headers: { accept: '*/*', 'Content-Type': 'application/json' },
          body: JSON.stringify(reversedPayload)
        })
        if (revPatchResponse.ok) {
          response = revPatchResponse
        }
      }

      if (!response.ok) {
        const revPostResponse = await authFetch(`${API_BASE}/Sumo`, {
          method: 'POST',
          headers: { accept: '*/*', 'Content-Type': 'application/json' },
          body: JSON.stringify(reversedPayload)
        })
        if (revPostResponse.ok) {
          response = revPostResponse
        }
      }

      if (!response.ok) {
        // Hiba esetén visszaállítás
        setMatches((prev) => prev.map((match) => (
          match.id === selectedMatch.id
            ? {
                ...match,
                team1History: prevTeam1History,
                team2History: prevTeam2History,
                team1Point: prevTeam1Point,
                team2Point: prevTeam2Point
              }
            : match
        )))
        const errorText = await response.text()
        throw new Error(errorText || 'A szumó kör törlése sikertelen volt.')
      }

      setActionMessage({ type: 'success', text: `A(z) ${resultIndex + 1}. menet sikeresen törölve.` })
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
        <p>Válassz mérkőzést a listából vagy keress rá, majd rögzíts eredményt.</p>
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

          <div className="card shadow-sm border mb-3 p-3 bg-light">
            <SearchPicker
              id="sumo-match-search"
              label="Aktív mérkőzés kiválasztása"
              value={matchSearch}
              onChange={(nextValue) => {
                setMatchSearch(nextValue)
                const exactMatch = matches.find((match) => getMatchLabel(match) === nextValue)
                if (exactMatch) {
                  setSelectedMatchId(exactMatch.id)
                }
              }}
              options={matches}
              placeholder={matches.length === 0 ? 'Nincs elérhető meccs' : 'Keresés csapatnév, sorszám (#1, #2...) vagy szakasz alapján…'}
              getOptionValue={(match) => getMatchLabel(match)}
              getOptionLabel={(match) => getMatchLabel(match)}
              renderOption={(match) => (
                <div className="d-flex justify-content-between align-items-center w-100 py-1">
                  <span className="text-start fw-semibold">
                    <AgeGroupBadge category={categoryByTeamName.get(match.team1Name)} className="me-2" />
                    {match.team1Name}
                  </span>
                  <span className="badge text-bg-light border mx-2">
                    #{match.table}. mérkőzés · {STAGE_LABELS[match.stage] || match.stage}
                  </span>
                  <span className="text-end fw-semibold">
                    {match.team2Name}
                    <AgeGroupBadge category={categoryByTeamName.get(match.team2Name)} className="ms-2" />
                  </span>
                </div>
              )}
            />
          </div>

          {/* Aktív mérkőzés pontozó doboza */}
          {selectedMatch && (
            <div className="card shadow-sm border-2 border-dark rounded mb-3 bg-white p-3 p-md-4">
              <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                <span className="badge text-bg-dark fs-6">
                  #{selectedMatch.table}. mérkőzés
                </span>
                <span className="fw-bold text-muted">
                  {STAGE_LABELS[selectedMatch.stage] || selectedMatch.stage}
                </span>
              </div>

              <div className="game-sumo-versus">
                <div className="game-sumo-versus__team text-start ps-3">
                  <h4><AgeGroupBadge category={categoryByTeamName.get(selectedMatch.team1Name)} className="me-2" />{selectedMatch.team1Name}</h4>
                  <div className="game-sumo-versus__points text-start">{selectedMatch.team1Point} pont</div>
                  {selectedMatch.team1History.length > 0 ? (
                    <div className="d-flex flex-wrap gap-1 justify-content-start mt-2">
                      {selectedMatch.team1History.map((result, resultIndex) => (
                        <button
                          key={`team1-res-${resultIndex}`}
                          type="button"
                          className={`btn btn-sm sumo-history-chip ${result === 'W' ? 'sumo-history-chip--win' : result === 'L' ? 'sumo-history-chip--loss' : 'sumo-history-chip--draw'}`}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleDeleteRoundResult(resultIndex)
                          }}
                          disabled={saving}
                          title={`Kattints a(z) ${resultIndex + 1}. menet (${result}) törléséhez`}
                          aria-label={`Törlés: ${result}`}
                        >
                          {result}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="small text-muted mt-2">Nincs még menet</div>
                  )}
                </div>
                <div className="game-sumo-versus__center">
                  <div className="fw-bold">VS</div>
                  <div className="small text-muted mt-1 font-monospace">
                    {selectedMatch.stage === 'GS' ? `${selectedMatch.team1History.length}/${GROUP_MATCH_RESULT_LIMIT}` : `${STAGE_LABELS[selectedMatch.stage] || selectedMatch.stage}`}
                  </div>
                </div>
                <div className="game-sumo-versus__team text-end pe-3">
                  <h4>{selectedMatch.team2Name}<AgeGroupBadge category={categoryByTeamName.get(selectedMatch.team2Name)} className="ms-2" /></h4>
                  <div className="game-sumo-versus__points text-end">{selectedMatch.team2Point} pont</div>
                  {selectedMatch.team2History.length > 0 ? (
                    <div className="d-flex flex-wrap gap-1 justify-content-end mt-2">
                      {selectedMatch.team2History.map((result, resultIndex) => (
                        <button
                          key={`team2-res-${resultIndex}`}
                          type="button"
                          className={`btn btn-sm sumo-history-chip ${result === 'W' ? 'sumo-history-chip--win' : result === 'L' ? 'sumo-history-chip--loss' : 'sumo-history-chip--draw'}`}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleDeleteRoundResult(resultIndex)
                          }}
                          disabled={saving}
                          title={`Kattints a(z) ${resultIndex + 1}. menet (${result}) törléséhez`}
                          aria-label={`Törlés: ${result}`}
                        >
                          {result}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="small text-muted mt-2">Nincs még menet</div>
                  )}
                </div>
              </div>
              <div className="text-center text-muted small mt-2">
                <i className="bi bi-info-circle me-1" />Törléshez kattints a csapatok alatti W, L vagy D jelölésre.
              </div>

              {isKnockoutWinner && (
                <div className="alert alert-success py-2 mt-3 mb-0">
                  <i className="bi bi-trophy-fill me-1" />Győztes: <strong>{knockoutWinnerName}</strong> ({KNOCKOUT_WIN_POINTS} pont elérve)
                </div>
              )}

              {isGroupLimitReached && (
                <div className="alert alert-info py-2 mt-3 mb-0">
                  <i className="bi bi-info-circle me-1" />A csoportköri mérkőzés lezárult ({GROUP_MATCH_RESULT_LIMIT}/{GROUP_MATCH_RESULT_LIMIT} menet rögzítve).
                </div>
              )}

              <div className="d-grid gap-2 mt-3">
                <button
                  type="button"
                  className="btn btn-lg game-action-btn game-action-btn-win"
                  onClick={() => handleAddResult('team1')}
                  disabled={!selectedMatch || saving || isMatchLocked}
                >
                  {selectedMatch?.team1Name || 'Bal csapat'} nyer
                </button>
                <button
                  type="button"
                  className="btn btn-lg game-action-btn game-action-btn-loss"
                  onClick={() => handleAddResult('team2')}
                  disabled={!selectedMatch || saving || isMatchLocked}
                >
                  {selectedMatch?.team2Name || 'Jobb csapat'} nyer
                </button>
                <button
                  type="button"
                  className="btn btn-lg game-action-btn game-action-btn-draw"
                  onClick={() => handleAddResult('draw')}
                  disabled={!selectedMatch || saving || isMatchLocked}
                >
                  Döntetlen
                </button>
              </div>
            </div>
          )}
        </>
      )}
<br /><br />
      <JudgeScenarioHelper competitionId="sumo" />
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
