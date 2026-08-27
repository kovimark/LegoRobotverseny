import React, { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { getActiveMessages, getMessageByTitle, deleteMessage } from '../services/messageBoardApi'
import MessageLinks from '../components/MessageLinks'
import MessageText from '../components/MessageText'
import ConfirmModal from '../components/ConfirmModal'
import { getCategoryBadgeStyle } from '../utils/categoryColor'

export default function NewsDetailsPage({ userRole }) {
  const { messageId, messageTitle } = useParams()
  const navigate = useNavigate()
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const request = messageTitle
      ? getMessageByTitle(messageTitle).then(async (foundMessage) => {
        if (foundMessage?.title) return foundMessage
        const messages = await getActiveMessages()
        return messages.find((item) => item.title.trim().toLocaleLowerCase('hu-HU') === messageTitle.trim().toLocaleLowerCase('hu-HU')) || null
      }).catch(async () => {
        const messages = await getActiveMessages()
        return messages.find((item) => item.title.trim().toLocaleLowerCase('hu-HU') === messageTitle.trim().toLocaleLowerCase('hu-HU')) || null
      })
      : getActiveMessages().then((items) => items.find((item) => String(item.id) === String(messageId)) || null)
    request
      .then(setMessage)
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false))
  }, [messageId, messageTitle])

  const handleDelete = async () => {
    if (!message?.id) return
    try {
      setDeleting(true)
      await deleteMessage(message.id)
      setDeleteConfirmOpen(false)
      navigate('/hirek')
    } catch (delError) {
      setError(delError.message)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <main className="container py-5"><div className="alert alert-info">Hír betöltése...</div></main>
  if (error) return <main className="container py-5"><div className="alert alert-danger">{error}</div><Link to="/hirek" className="btn btn-outline-dark">Vissza a hírekhez</Link></main>
  if (!message) return <main className="container py-5"><div className="news-empty"><i className="bi bi-file-earmark-x" /><h1 className="h4 mt-3">Ez a hír nem található vagy már nem aktív.</h1><Link to="/hirek" className="btn btn-primary mt-2">Vissza a hírekhez</Link></div></main>

  const isAdmin = userRole === 'admin'

  return (
    <main className="container py-4 news-details-page">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <Link to="/hirek" className="news-back-link mb-0"><i className="bi bi-arrow-left" /> Összes hír</Link>
        {isAdmin && (
          <div className="d-flex align-items-center gap-2">
            <Link to="/admin/uzenetek" className="btn btn-outline-primary btn-sm">
              <i className="bi bi-pencil-square me-1" />
              Kezelés az adminban
            </Link>
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              <i className="bi bi-trash3 me-1" />
              Hír törlése
            </button>
          </div>
        )}
      </div>

      <article className="news-details-card">
        <header className="news-details-header">
          <span className="home-card-tag" style={getCategoryBadgeStyle(message.typeHex)}>{message.type || 'Hír'}</span>
          <h1>{message.title}</h1>
          <div className="news-details-date">
            <i className="bi bi-calendar3" />
            <span>
              Megjelenés: {message.start ? new Date(message.start).toLocaleString('hu-HU') : 'azonnal'}
              <br />
              Lejárat: {message.end ? new Date(message.end).toLocaleString('hu-HU') : 'nincs megadva'}
            </span>
          </div>
        </header>
        <div className="news-details-content"><MessageText text={message.text} links={message.links} /></div>
        <div className="news-details-links"><MessageLinks links={message.links} /></div>
      </article>

      <ConfirmModal
        open={deleteConfirmOpen}
        title="Hír törlése"
        confirmLabel="Törlés"
        busy={deleting}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
      >
        <p className="mb-2">Biztosan törölni szeretnéd ezt a hírt? A művelet nem vonható vissza.</p>
        <strong>{message.title}</strong>
      </ConfirmModal>
    </main>
  )
}
