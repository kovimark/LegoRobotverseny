export const privilegeOptions = [
  { value: 0, label: 'Versenyző' },
  { value: 1, label: 'Admin' },
  { value: 2, label: 'Hegymászás bíró' },
  { value: 3, label: 'Vonalkövetés bíró' },
  { value: 4, label: 'Kosárra dobás bíró' },
  { value: 5, label: 'Szumó bíró' },
  { value: 6, label: 'Segítő' }
]

export const judgeCompetitionByPrivilege = {
  2: 'hegymaszas',
  3: 'vonalkovetes',
  4: 'kosarra-dobas',
  5: 'szumo'
}

export const getPrivilegeLabel = (value) => (
  privilegeOptions.find((option) => option.value === Number(value))?.label || 'Ismeretlen'
)

export const isJudgePrivilege = (value) => Boolean(judgeCompetitionByPrivilege[Number(value)])

export const isHelperPrivilege = (value) => Number(value) === 6
