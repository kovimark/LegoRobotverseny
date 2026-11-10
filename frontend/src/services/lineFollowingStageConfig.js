export const LINE_STAGE_LABELS_STORAGE_KEY = 'lineRoundLabels'
export const LINE_STAGE_CONFIG_CHANGED_EVENT = 'lineRoundLabelsChanged'

export const getCustomLineStageLabels = () => {
  try {
    const raw = window.localStorage.getItem(LINE_STAGE_LABELS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export const saveCustomLineStageLabels = (labels) => {
  try {
    window.localStorage.setItem(LINE_STAGE_LABELS_STORAGE_KEY, JSON.stringify(labels || {}))
    window.dispatchEvent(new CustomEvent(LINE_STAGE_CONFIG_CHANGED_EVENT, { detail: labels || {} }))
  } catch {
    // localStorage can fail in certain sandboxed environments
  }
}

export const setCustomLineStageLabel = (stageValue, label) => {
  const current = getCustomLineStageLabels()
  const val = Number(stageValue)
  if (!Number.isFinite(val) || val <= 0) return current

  const trimmed = typeof label === 'string' ? label.trim() : ''
  const next = { ...current }
  if (trimmed) {
    next[val] = trimmed
  } else {
    delete next[val]
  }
  saveCustomLineStageLabels(next)
  return next
}

export const resetCustomLineStageLabels = () => {
  saveCustomLineStageLabels({})
}

export const getEffectiveLineAdvancingCount = (settingsOrGroupAdvance) => {
  if (!settingsOrGroupAdvance) return 4
  const isBreakdown = Number(settingsOrGroupAdvance.ageGroupBreakdown) === 1
  if (isBreakdown) {
    const ps = Number(settingsOrGroupAdvance.psGroupAdvance) || 0
    const hs = Number(settingsOrGroupAdvance.hsGroupAdvance) || 0
    const sum = ps + hs
    return sum > 0 ? sum : 4
  }
  const all = Number(settingsOrGroupAdvance.allGroupAdvance) || 0
  return all > 0 ? all : 4
}

export const buildDefaultLineFollowingStages = (advCount) => {
  const count = Number(advCount) > 0 ? Number(advCount) : 4
  const stages = [{ value: 1, label: 'Csoportkör' }]
  if (count <= 2) {
    stages.push({ value: 2, label: 'Döntő' })
    return stages
  }
  if (count === 4) {
    stages.push({ value: 2, label: 'Legjobb 4' })
    stages.push({ value: 3, label: 'Döntő' })
    return stages
  }
  if (count < 4) {
    stages.push({ value: 2, label: `Legjobb ${count}` })
    stages.push({ value: 3, label: 'Döntő' })
    return stages
  }
  if (count === 8) {
    stages.push({ value: 2, label: 'Negyeddöntő (Legjobb 8)' })
    stages.push({ value: 3, label: 'Legjobb 4' })
    stages.push({ value: 4, label: 'Döntő' })
    return stages
  }
  if (count < 8) {
    stages.push({ value: 2, label: `Legjobb ${count}` })
    stages.push({ value: 3, label: 'Legjobb 4' })
    stages.push({ value: 4, label: 'Döntő' })
    return stages
  }
  if (count === 16) {
    stages.push({ value: 2, label: 'Legjobb 16' })
    stages.push({ value: 3, label: 'Negyeddöntő' })
    stages.push({ value: 4, label: 'Legjobb 4' })
    stages.push({ value: 5, label: 'Döntő' })
    return stages
  }
  if (count < 16) {
    stages.push({ value: 2, label: `Legjobb ${count}` })
    stages.push({ value: 3, label: 'Negyeddöntő' })
    stages.push({ value: 4, label: 'Legjobb 4' })
    stages.push({ value: 5, label: 'Döntő' })
    return stages
  }
  let idx = 2
  stages.push({ value: idx++, label: `Legjobb ${count}` })
  stages.push({ value: idx++, label: 'Legjobb 16' })
  stages.push({ value: idx++, label: 'Negyeddöntő' })
  stages.push({ value: idx++, label: 'Legjobb 4' })
  stages.push({ value: idx++, label: 'Döntő' })
  return stages
}

export const buildLineFollowingStages = (settingsOrGroupAdvance, customLabels = {}, results = []) => {
  const advCount = getEffectiveLineAdvancingCount(settingsOrGroupAdvance)
  const defaultStages = buildDefaultLineFollowingStages(advCount)

  const maxResultStage = (Array.isArray(results) ? results : []).reduce(
    (max, r) => Math.max(max, Number(r.stage ?? r.tournamentStage ?? r.tournament_stage ?? 1)),
    1
  )

  const stageMap = new Map()
  defaultStages.forEach((s) => {
    stageMap.set(s.value, {
      value: s.value,
      label: customLabels[s.value] || s.label
    })
  })

  for (let st = 1; st <= maxResultStage; st++) {
    if (!stageMap.has(st)) {
      stageMap.set(st, {
        value: st,
        label: customLabels[st] || `${st}. forduló`
      })
    }
  }

  if (customLabels && typeof customLabels === 'object') {
    Object.entries(customLabels).forEach(([valStr, label]) => {
      const val = Number(valStr)
      if (Number.isFinite(val) && val > 0 && label) {
        if (stageMap.has(val)) {
          stageMap.get(val).label = label
        } else {
          stageMap.set(val, { value: val, label })
        }
      }
    })
  }

  return Array.from(stageMap.values()).sort((a, b) => a.value - b.value)
}
