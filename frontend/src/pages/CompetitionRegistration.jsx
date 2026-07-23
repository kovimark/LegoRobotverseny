import React, { useEffect, useState } from 'react'
import FloatingFeedback from '../components/FloatingFeedback'

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
    group: '-'
  })
  const [errors, setErrors] = useState({})
  const [submitMessage, setSubmitMessage] = useState(null)

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
    teamCoach1Email: 'Az 1. felkészítő tanár emailcímének kitöltése kötelező.'
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
    const { name, value } = e.target
    const parsedValue = name.includes('Class') && value !== ''
      ? Math.min(13, Number(value))
      : value

    setFormData(prev => ({
      ...prev,
      [name]: parsedValue,
      ...(name.includes('Class') ? {
        category: getCategory(
          name === 'teamMember1Class' ? parsedValue : prev.teamMember1Class,
          name === 'teamMember2Class' ? parsedValue : prev.teamMember2Class
        )
      } : {})
    }))
    setSubmitMessage(null)

    if (value !== '') {
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
      const isEmpty = typeof value === 'string' ? value.trim() === '' : value === ''

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
        text: 'A csillaggal megjelölt mezők kitöltése kötelező'
      })
      return
    }

    try {
      const payload = {
        teamName: formData.teamName.trim(),
        teamMember1Name: formData.teamMember1Name.trim(),
        teamMember1Class: Number(formData.teamMember1Class),
        teamMember1Email: formData.teamMember1Email.trim().toLowerCase(),
        teamMember2Name: formData.teamMember2Name.trim(),
        teamMember2Class: Number(formData.teamMember2Class),
        teamMember2Email: formData.teamMember2Email.trim().toLowerCase(),
        teamCoach1: formData.teamCoach1.trim(),
        teamCoach1Email: formData.teamCoach1Email.trim().toLowerCase(),
        schoolName: formData.schoolName.trim(),
        category,
        group: formData.group || '-'
      }

      const response = await fetch('https://legocompetition.runasp.net/api/Teams/registerteam', {
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
          // A backend nem JSON hibát küldött, ezért az eredeti szöveget mutatjuk.
        }
        throw new Error(readableError || 'A jelentkezés mentése nem sikerült.')
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
        group: '-'
      })
      setErrors({})
      setSubmitMessage({
        type: 'success',
        text: 'Sikeres regisztráció!'
      })
    } catch (error) {
      console.error('Hiba:', error)
      setSubmitMessage({
        type: 'danger',
        text: `Hiba történt a jelentkezés során: ${error.message}`
      })
    }
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
                />
                {requiredMark}
              </div>
              {errors.schoolName && <div className="text-danger small mt-1">{errors.schoolName}</div>}
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label htmlFor="teamMember1Name" className="form-label">1. Versenyző Neve</label>
                <div className="position-relative">
                  <input
                    type="text"
                    className={`form-control pe-4 ${errors.teamMember1Name ? 'border-danger' : ''}`}
                    id="teamMember1Name"
                    name="teamMember1Name"
                    value={formData.teamMember1Name}
                    onChange={handleChange}
                  />
                  {requiredMark}
                </div>
                {errors.teamMember1Name && <div className="text-danger small mt-1">{errors.teamMember1Name}</div>}
              </div>
              <div className="col-md-6 mb-3">
                <label htmlFor="teamMember1Email" className="form-label">1. Versenyző E-mail</label>
                <div className="position-relative">
                  <input
                    type="email"
                    className={`form-control pe-4 ${errors.teamMember1Email ? 'border-danger' : ''}`}
                    id="teamMember1Email"
                    name="teamMember1Email"
                    value={formData.teamMember1Email}
                    onChange={handleChange}
                    disabled={Boolean(user?.email)}
                  />
                  {requiredMark}
                </div>                
                {errors.teamMember1Email && <div className="text-danger small mt-1">{errors.teamMember1Email}</div>}
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label htmlFor="teamMember1Class" className="form-label">1. Versenyző osztálya</label>
                <div className="position-relative">
                  <input
                    type="number"
                    min="1"
                    max="13"
                    step="1"
                    className={`form-control pe-4 ${errors.teamMember1Class ? 'border-danger' : ''}`}
                    id="teamMember1Class"
                    name="teamMember1Class"
                    value={formData.teamMember1Class}
                    onChange={handleChange}
                  />
                  {requiredMark}
                </div>
                {errors.teamMember1Class && <div className="text-danger small mt-1">{errors.teamMember1Class}</div>}
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label htmlFor="teamMember2Name" className="form-label">2. Versenyző Neve</label>
                <div className="position-relative">
                  <input
                    type="text"
                    className={`form-control pe-4 ${errors.teamMember2Name ? 'border-danger' : ''}`}
                    id="teamMember2Name"
                    name="teamMember2Name"
                    value={formData.teamMember2Name}
                    onChange={handleChange}
                  />
                  {requiredMark}
                </div>
                {errors.teamMember2Name && <div className="text-danger small mt-1">{errors.teamMember2Name}</div>}
              </div>
              <div className="col-md-6 mb-3">
                <label htmlFor="teamMember2Email" className="form-label">2. Versenyző E-mail</label>
                <div className="position-relative">
                  <input
                    type="email"
                    className={`form-control pe-4 ${errors.teamMember2Email ? 'border-danger' : ''}`}
                    id="teamMember2Email"
                    name="teamMember2Email"
                    value={formData.teamMember2Email}
                    onChange={handleChange}
                  />
                  {requiredMark}
                </div>
                {errors.teamMember2Email && <div className="text-danger small mt-1">{errors.teamMember2Email}</div>}
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label htmlFor="teamMember2Class" className="form-label">2. Versenyző osztálya</label>
                <div className="position-relative">
                  <input
                    type="number"
                    min="1"
                    max="13"
                    step="1"
                    className={`form-control pe-4 ${errors.teamMember2Class ? 'border-danger' : ''}`}
                    id="teamMember2Class"
                    name="teamMember2Class"
                    value={formData.teamMember2Class}
                    onChange={handleChange}
                  />
                  {requiredMark}
                </div>
                {errors.teamMember2Class && <div className="text-danger small mt-1">{errors.teamMember2Class}</div>}
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label htmlFor="teamCoach1" className="form-label">1. Felkészítő Tanár Neve</label>
                <div className="position-relative">
                  <input
                    type="text"
                    className={`form-control pe-4 ${errors.teamCoach1 ? 'border-danger' : ''}`}
                    id="teamCoach1"
                    name="teamCoach1"
                    value={formData.teamCoach1}
                    onChange={handleChange}
                  />
                  {requiredMark}
                </div>
                {errors.teamCoach1 && <div className="text-danger small mt-1">{errors.teamCoach1}</div>}
              </div>
              <div className="col-md-6 mb-3">
                <label htmlFor="teamCoach1Email" className="form-label">1. Felkészítő Tanár E-mail</label>
                <div className="position-relative">
                  <input
                    type="email"
                    className={`form-control pe-4 ${errors.teamCoach1Email ? 'border-danger' : ''}`}
                    id="teamCoach1Email"
                    name="teamCoach1Email"
                    value={formData.teamCoach1Email}
                    onChange={handleChange}
                  />
                  {requiredMark}
                </div>
                {errors.teamCoach1Email && <div className="text-danger small mt-1">{errors.teamCoach1Email}</div>}
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label htmlFor="category" className="form-label">Automatikus korosztály</label>
                <input
                  className="form-control"
                  id="category"
                  value={category === 1 ? 'Középiskolás (9–13. osztály)' : 'Általános iskolás (1–8. osztály)'}
                  readOnly
                />
                <div className="form-text">Ha legalább az egyik versenyző 9–13. osztályos, a csapat középiskolás kategóriába kerül.</div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-100">Jelentkezés</button>
            <FloatingFeedback message={submitMessage} onClose={() => setSubmitMessage(null)} />
          </form>
        </div>
      </div>
    </div>
  )
}
