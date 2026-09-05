import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import FloatingFeedback from '../components/FloatingFeedback'
import { authFetch } from '../services/apiClient'
import { sendWelcomeEmail } from '../services/emailApi'

export default function CompetitionRegistration({ user }) {
  const [formData, setFormData] = useState({
    id: 0,
    teamName: '',
    teamMember1Email: user?.email || '',
    teamMember2Email: '',
    teamMember1Name: '',
    teamMember2Name: '',
    teamMember1Class: '',
    teamMember2Class: '',
    teamCoach1: '',
    teamCoach1Email: '',
    schoolName: '',
    category: 0,
    group: '-',
    rulesAccepted: false,
    privacyAccepted: false
  })
  const [errors, setErrors] = useState({})
  const [submitMessage, setSubmitMessage] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const requiredFields = {
    schoolName: 'Az iskola nevének kitöltése kötelező.',
    teamName: 'A csapatnév kitöltése kötelező.',
    teamMember1Email: 'Az 1. versenyző emailcímének kitöltése kötelező.',
    teamMember2Email: 'A 2. versenyző emailcímének kitöltése kötelező.',
    teamMember1Name: 'Az 1. Versenyző nevének kitöltése kötelező.',
    teamMember1Class: 'Az 1. versenyző osztályának kitöltése kötelező.',
    teamMember2Name: 'A 2. Versenyző nevének kitöltése kötelező.',
    teamMember2Class: 'A 2. versenyző osztályának kitöltése kötelező.',
    teamCoach1: 'Az 1. felkészítő tanár nevének kitöltése kötelező.',
    teamCoach1Email: 'Az 1. felkészítő tanár emailcímének kitöltése kötelező.',
    rulesAccepted: 'A versenyszabályzat és a versenyzői kézikönyv elfogadása kötelező.',
    privacyAccepted: 'Az adatkezelési tájékoztató és a képmás-/videófelvétel-készítéshez való hozzájárulás elfogadása kötelező.'
  }

  const getCategory = (member1Class, member2Class) => (
    Number(member1Class) >= 9 || Number(member2Class) >= 9 ? 1 : 0
  )

  const category = getCategory(formData.teamMember1Class, formData.teamMember2Class)

  useEffect(() => {
    if (user?.email) {
      setFormData(prev => ({
        ...prev,
        teamMember1Email: prev.teamMember1Email || user.email
      }))
    }
  }, [user?.email])

  const requiredMark = (
    <span className="position-absolute top-50 end-0 translate-middle-y me-3 text-danger fw-bold pe-none">
      *
    </span>
  )

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    const nextValue = type === 'checkbox' ? checked : value
    const isClassField = name === 'teamMember1Class' || name === 'teamMember2Class'
    const digitsOnly = isClassField ? String(nextValue).replace(/\D/g, '').slice(0, 2) : nextValue
    const parsedValue = isClassField && digitsOnly !== ''
      ? String(Math.min(13, Number(digitsOnly)))
      : digitsOnly

    setFormData(prev => ({
      ...prev,
      [name]: parsedValue,
      ...(isClassField ? {
        category: getCategory(
          name === 'teamMember1Class' ? parsedValue : prev.teamMember1Class,
          name === 'teamMember2Class' ? parsedValue : prev.teamMember2Class
        )
      } : {})
    }))
    setSubmitMessage(null)

    if (nextValue !== '' && (type !== 'checkbox' || checked)) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitMessage(null)

    const validationErrors = Object.entries(requiredFields).reduce((acc, [fieldName, message]) => {
      const value = formData[fieldName]
      const isEmpty = typeof value === 'string'
        ? value.trim() === ''
        : typeof value === 'boolean'
          ? !value
          : value === ''

      if (isEmpty) {
        acc[fieldName] = message
      }

      return acc
    }, {})

    const emailFields = [
      { key: 'teamMember1Email', label: 'Az 1. versenyző email címe' },
      { key: 'teamMember2Email', label: 'A 2. versenyző email címe' },
      { key: 'teamCoach1Email', label: 'Az 1. felkészítő tanár email címe' }
    ]

      ;['teamMember1Class', 'teamMember2Class'].forEach((fieldName) => {
        const value = Number(formData[fieldName])
        if (formData[fieldName] !== '' && (!Number.isInteger(value) || value < 1 || value > 13)) {
          validationErrors[fieldName] = 'Az osztály csak 1 és 13 közötti egész szám lehet.'
        }
      })

    const normalizedEmails = emailFields.reduce((acc, field) => {
      const value = typeof formData[field.key] === 'string' ? formData[field.key].trim().toLowerCase() : ''
      acc[field.key] = value
      return acc
    }, {})

    const usedEmails = new Map()

    emailFields.forEach((field) => {
      const value = normalizedEmails[field.key]

      if (!value) {
        return
      }

      if (usedEmails.has(value)) {
        validationErrors[field.key] = 'Az email cím nem lehet megegyező másik mezőben megadott címmel.'
        validationErrors[usedEmails.get(value)] = 'Az email cím nem lehet megegyező másik mezőben megadott címmel.'
      } else {
        usedEmails.set(value, field.key)
      }
    })

    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      setSubmitMessage({
        type: 'danger',
        text: 'A csillaggal megjelölt mezők kitöltése és a kötelező nyilatkozatok elfogadása szükséges a jelentkezéshez.'
      })
      return
    }

    try {
      setIsSubmitting(true)
      const payload = {
        teamName: formData.teamName.trim(),
        teamMember1Name: formData.teamMember1Name.trim(),
        teamMember1Class: Number(formData.teamMember1Class),
        teamMember1Email: (user?.email || formData.teamMember1Email).trim().toLowerCase(),
        teamMember2Name: formData.teamMember2Name.trim(),
        teamMember2Class: Number(formData.teamMember2Class),
        teamMember2Email: formData.teamMember2Email.trim().toLowerCase(),
        teamCoach1: formData.teamCoach1.trim(),
        teamCoach1Email: formData.teamCoach1Email.trim().toLowerCase(),
        schoolName: formData.schoolName.trim(),
        category,
        group: formData.group || '-'
      }

      const response = await authFetch('https://legocompetition.runasp.net/api/Teams/registerteam', {
        method: 'POST',
        headers: {
          accept: '*/*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorText = await response.text()
        let readableError = errorText
        try {
          const errorData = JSON.parse(errorText)
          readableError = Object.values(errorData.errors || {}).flat().join(' ') || errorData.title || errorText
        } catch {
          // Backend nem JSON hibát küldött
        }
        throw new Error(readableError || 'A jelentkezés mentése nem sikerült.')
      }

      // Automatikus visszaigazoló email(ek) küldése
      const emailsToSend = [
        payload.teamMember1Email,
        payload.teamMember2Email,
        payload.teamCoach1Email
      ].filter((email, index, self) => Boolean(email) && self.indexOf(email) === index)

      let emailSentCount = 0
      for (const email of emailsToSend) {
        try {
          const emailResponse = await sendWelcomeEmail(email, payload.teamName)
          if (emailResponse.ok) {
            emailSentCount++
          } else {
            console.warn(`Visszaigazoló email küldése sikertelen (${email}):`, await emailResponse.text())
          }
        } catch (emailError) {
          console.warn(`Hiba a visszaigazoló email küldésekor (${email}):`, emailError.message)
        }
      }

      setFormData({
        id: 0,
        teamName: '',
        teamMember1Email: user?.email || '',
        teamMember2Email: '',
        teamMember1Name: '',
        teamMember2Name: '',
        teamMember1Class: '',
        teamMember2Class: '',
        teamCoach1: '',
        teamCoach1Email: '',
        schoolName: '',
        category: 0,
        group: '-',
        rulesAccepted: false,
        privacyAccepted: false
      })
      setErrors({})
      setSubmitMessage({
        type: 'success',
        text: emailSentCount > 0
          ? 'Sikeres regisztráció! A visszaigazoló e-mailt elküldtük a megadott címekre.'
          : 'Sikeres regisztráció!'
      })
    } catch (error) {
      console.error('Hiba:', error)
      setSubmitMessage({
        type: 'danger',
        text: `Hiba történt a jelentkezés során: ${error.message}`
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user || !user.email) {
    return (
      <div className="container py-5">
        <div className="card shadow-sm border-0 mx-auto text-center p-4 p-md-5 bg-white text-dark rounded-4" style={{ maxWidth: '560px' }}>
          <div className="mb-3 text-warning">
            <i className="bi bi-shield-lock fs-1" />
          </div>
          <h2 className="h4 fw-bold mb-3">Bejelentkezés szükséges</h2>
          <p className="text-muted mb-4">
            A versenyre való jelentkezéshez előbb be kell jelentkezned a Google-fiókoddal!
          </p>
          <div>
            <Link to="/bejelentkezes" className="btn btn-primary btn-lg px-4">
              <i className="bi bi-google me-2" />
              Bejelentkezés
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <h2 className="mb-4">Verseny Jelentkezés</h2>
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="teamName" className="form-label">Csapatnév</label>
              <div className="position-relative">
                <input
                  type="text"
                  className={`form-control pe-4 ${errors.teamName ? 'border-danger' : ''}`}
                  id="teamName"
                  name="teamName"
                  value={formData.teamName}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                {requiredMark}
              </div>
              {errors.teamName && <div className="text-danger small mt-1">{errors.teamName}</div>}
            </div>

            <div className="mb-3">
              <label htmlFor="schoolName" className="form-label">Iskola neve</label>
              <div className="position-relative">
                <input
                  type="text"
                  className={`form-control pe-4 ${errors.schoolName ? 'border-danger' : ''}`}
                  id="schoolName"
                  name="schoolName"
                  value={formData.schoolName}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                {requiredMark}
              </div>
              {errors.schoolName && <div className="text-danger small mt-1">{errors.schoolName}</div>}
            </div>

            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="teamMember1Name" className="form-label">1. versenyző neve</label>
                  <div className="position-relative">
                    <input
                      type="text"
                      className={`form-control pe-4 ${errors.teamMember1Name ? 'border-danger' : ''}`}
                      id="teamMember1Name"
                      name="teamMember1Name"
                      value={formData.teamMember1Name}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                    {requiredMark}
                  </div>
                  {errors.teamMember1Name && <div className="text-danger small mt-1">{errors.teamMember1Name}</div>}
                </div>
              </div>

              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="teamMember1Email" className="form-label d-flex justify-content-between align-items-center">
                    <span>1. versenyző email (bejelentkezett fiók)</span>
                  </label>
                  <div className="position-relative">
                    <input
                      type="email"
                      className="form-control bg-secondary-subtle text-dark fw-semibold"
                      id="teamMember1Email"
                      name="teamMember1Email"
                      value={user?.email || formData.teamMember1Email}
                      disabled
                      readOnly
                    />
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="teamMember1Class" className="form-label">1. versenyző osztálya</label>
                  <div className="position-relative">
                    <input
                      type="number"
                      className={`form-control pe-4 ${errors.teamMember1Class ? 'border-danger' : ''}`}
                      id="teamMember1Class"
                      name="teamMember1Class"
                      min="1"
                      max="13"
                      value={formData.teamMember1Class}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                    {requiredMark}
                  </div>
                  {errors.teamMember1Class && <div className="text-danger small mt-1">{errors.teamMember1Class}</div>}
                </div>
              </div>

              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="teamMember2Name" className="form-label">2. versenyző neve</label>
                  <div className="position-relative">
                    <input
                      type="text"
                      className={`form-control pe-4 ${errors.teamMember2Name ? 'border-danger' : ''}`}
                      id="teamMember2Name"
                      name="teamMember2Name"
                      value={formData.teamMember2Name}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                    {requiredMark}
                  </div>
                  {errors.teamMember2Name && <div className="text-danger small mt-1">{errors.teamMember2Name}</div>}
                </div>
              </div>

              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="teamMember2Email" className="form-label">2. versenyző email</label>
                  <div className="position-relative">
                    <input
                      type="email"
                      className={`form-control pe-4 ${errors.teamMember2Email ? 'border-danger' : ''}`}
                      id="teamMember2Email"
                      name="teamMember2Email"
                      value={formData.teamMember2Email}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                    {requiredMark}
                  </div>
                  {errors.teamMember2Email && <div className="text-danger small mt-1">{errors.teamMember2Email}</div>}
                </div>
              </div>

              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="teamMember2Class" className="form-label">2. versenyző osztálya</label>
                  <div className="position-relative">
                    <input
                      type="number"
                      className={`form-control pe-4 ${errors.teamMember2Class ? 'border-danger' : ''}`}
                      id="teamMember2Class"
                      name="teamMember2Class"
                      min="1"
                      max="13"
                      value={formData.teamMember2Class}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                    {requiredMark}
                  </div>
                  {errors.teamMember2Class && <div className="text-danger small mt-1">{errors.teamMember2Class}</div>}
                </div>
              </div>

              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="teamCoach1" className="form-label">Felkészítő tanár neve</label>
                  <div className="position-relative">
                    <input
                      type="text"
                      className={`form-control pe-4 ${errors.teamCoach1 ? 'border-danger' : ''}`}
                      id="teamCoach1"
                      name="teamCoach1"
                      value={formData.teamCoach1}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                    {requiredMark}
                  </div>
                  {errors.teamCoach1 && <div className="text-danger small mt-1">{errors.teamCoach1}</div>}
                </div>
              </div>

              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="teamCoach1Email" className="form-label">Felkészítő tanár email</label>
                  <div className="position-relative">
                    <input
                      type="email"
                      className={`form-control pe-4 ${errors.teamCoach1Email ? 'border-danger' : ''}`}
                      id="teamCoach1Email"
                      name="teamCoach1Email"
                      value={formData.teamCoach1Email}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                    {requiredMark}
                  </div>
                  {errors.teamCoach1Email && <div className="text-danger small mt-1">{errors.teamCoach1Email}</div>}
                </div>
              </div>
            </div>

            <div className="card border-0 bg-light p-3 rounded-3 mb-3 shadow-sm">
              <div className="d-flex align-items-center gap-2 mb-2 text-primary">
                <i className="bi bi-file-earmark-text-fill fs-5" />
                <h6 className="mb-0 fw-bold">Dokumentumok és nyilatkozatok</h6>
              </div>
              <p className="small text-muted mb-3">
                Kérjük, a jelentkezés előtt tekintsd át a szabályzatot és a hozzájárulási tájékoztatókat!
              </p>

              <div className="d-flex flex-column flex-md-row flex-wrap gap-2 mb-3">
                <a
                  href="https://drive.google.com/drive/folders/1Lg5k_dhlMSalj5uzqnTpLGu3JpVi_moT"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-primary btn-sm flex-fill d-inline-flex align-items-center justify-content-center"
                >
                  <i className="bi bi-box-arrow-up-right me-2" />
                  Hivatalos szabályzatok (Google Drive)
                </a>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm flex-fill d-inline-flex align-items-center justify-content-center"
                  onClick={() => setSubmitMessage({ type: 'info', text: 'Az adatkezelési tájékoztató dokumentuma hamarosan letölthető.' })}
                >
                  <i className="bi bi-file-earmark-text me-2" />
                  Adatkezelési tájékoztató letöltése
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm flex-fill d-inline-flex align-items-center justify-content-center"
                  onClick={() => setSubmitMessage({ type: 'info', text: 'A képmás- és médiatárolási hozzájárulási nyilatkozat hamarosan letölthető.' })}
                >
                  <i className="bi bi-camera-video me-2" />
                  Képmás és médiatárolási nyilatkozat letöltése
                </button>
              </div>

              <div className="form-check mb-2">
                <input
                  className={`form-check-input ${errors.rulesAccepted ? 'border-danger' : ''}`}
                  type="checkbox"
                  id="rulesAccepted"
                  name="rulesAccepted"
                  checked={formData.rulesAccepted}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                <label className="form-check-label small" htmlFor="rulesAccepted">
                  Elolvastam a versenyszabályzatot és a versenyzői kézikönyvet, és elfogadom az azokban foglaltakat. <span className="text-danger fw-bold">*</span>
                </label>
                {errors.rulesAccepted && (
                  <div className="text-danger small mt-1">{errors.rulesAccepted}</div>
                )}
              </div>

              <div className="form-check">
                <input
                  className={`form-check-input ${errors.privacyAccepted ? 'border-danger' : ''}`}
                  type="checkbox"
                  id="privacyAccepted"
                  name="privacyAccepted"
                  checked={formData.privacyAccepted}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                <label className="form-check-label small" htmlFor="privacyAccepted">
                  Elfogadom az adatkezelési tájékoztatót, és hozzájárulok ahhoz, hogy a verseny során a csapattagokról és felkészítőkről fényképek és videófelvételek készüljenek, melyeket a szervezők a verseny bemutatására felhasználhatnak. <span className="text-danger fw-bold">*</span>
                </label>
                {errors.privacyAccepted && (
                  <div className="text-danger small mt-1">{errors.privacyAccepted}</div>
                )}
              </div>
            </div>

            <FloatingFeedback message={submitMessage} onClose={() => setSubmitMessage(null)} />

            <div className="mb-3">
              <p className="text-muted small">
                <strong>Korosztály:</strong> {category === 1 ? 'Középiskolás (9–13. osztály)' : 'Általános iskolás (1–8. osztály)'}
              </p>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Regisztráció...' : 'Regisztráció'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}