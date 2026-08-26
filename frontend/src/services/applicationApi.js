import { authFetch } from './apiClient'

const API_URL = 'https://legocompetition.runasp.net/api/Application'

export const getApplications = async () => {
  const response = await authFetch(API_URL, {
    headers: {
      accept: '*/*'
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || 'Nem sikerült betölteni a bírói jelentkezéseket.')
  }

  const data = await response.json()
  return Array.isArray(data) ? data : []
}

export const getApplicationsByAcceptedStatus = async (isAccepted) => {
  const url = `${API_URL}/applicationsbyacceptedstatus/${isAccepted}`
  const response = await authFetch(url, {
    headers: {
      accept: '*/*'
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || 'Nem sikerült betölteni a jelentkezéseket a megadott státusz alapján.')
  }

  const data = await response.json()
  return Array.isArray(data) ? data : []
}

export const submitApplication = async (applicationData) => {
  const response = await authFetch(API_URL, {
    method: 'POST',
    headers: {
      accept: '*/*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(applicationData)
  })

  if (!response.ok) {
    const errorText = await response.text()
    let readableError = errorText
    try {
      const errorData = JSON.parse(errorText)
      readableError = Object.values(errorData.errors || {}).flat().join(' ') || errorData.title || errorText
    } catch {
      // Nem JSON válasz
    }
    throw new Error(readableError || 'A bírói jelentkezés elküldése nem sikerült.')
  }

  try {
    return await response.json()
  } catch {
    return true
  }
}

export const confirmApplication = async (email, role) => {
  const url = `${API_URL}/confirmApplication/${encodeURIComponent(email)}/${encodeURIComponent(role)}`
  const response = await authFetch(url, {
    method: 'POST',
    headers: {
      accept: '*/*'
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    let readableError = errorText
    try {
      const errorData = JSON.parse(errorText)
      readableError = Object.values(errorData.errors || {}).flat().join(' ') || errorData.title || errorText
    } catch {
      // Nem JSON válasz
    }
    throw new Error(readableError || 'A jelentkezés jóváhagyása nem sikerült.')
  }

  try {
    return await response.json()
  } catch {
    return true
  }
}

export const deleteApplication = async (email) => {
  const url = `${API_URL}/${encodeURIComponent(email)}`
  const response = await authFetch(url, {
    method: 'DELETE',
    headers: {
      accept: '*/*'
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    let readableError = errorText
    try {
      const errorData = JSON.parse(errorText)
      readableError = Object.values(errorData.errors || {}).flat().join(' ') || errorData.title || errorText
    } catch {
      // Nem JSON válasz
    }
    throw new Error(readableError || 'A jelentkezés törlése nem sikerült.')
  }

  try {
    return await response.json()
  } catch {
    return true
  }
}
