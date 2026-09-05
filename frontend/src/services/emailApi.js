import { authFetch } from './apiClient'

const API_URL = 'https://legocompetition.runasp.net/api/Email'

/**
 * Automatikus üdvözlő / visszaigazoló email küldése a csapat regisztrációja után.
 * @param {string} toEmail Címzett email címe
 * @param {string} teamName Csapat neve
 * @returns {Promise<Response>}
 */
export const sendWelcomeEmail = async (toEmail, teamName) => {
  const cleanEmail = String(toEmail || '').trim().toLowerCase()
  const cleanTeamName = String(teamName || '').trim()

  if (!cleanEmail) {
    throw new Error('Címzett email cím megadása kötelező.')
  }

  const url = `${API_URL}/send-welcome?toEmail=${encodeURIComponent(cleanEmail)}&teamName=${encodeURIComponent(cleanTeamName)}`
  return await authFetch(url, {
    method: 'POST',
    headers: {
      accept: '*/*'
    }
  })
}

/**
 * Csoportos email küldése.
 * @param {{ subject: string, customMessage: string, targets: Array<{ email: string, name?: string }> }} payload
 * @returns {Promise<Response>}
 */
export const sendBulkEmail = async (payload) => {
  return await authFetch(`${API_URL}/send-bulk`, {
    method: 'POST',
    headers: {
      accept: '*/*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
}
