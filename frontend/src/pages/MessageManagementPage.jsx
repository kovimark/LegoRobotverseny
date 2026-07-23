import React, { useEffect, useRef, useState } from 'react'
import ConfirmModal from '../components/ConfirmModal'
import MessageLinks from '../components/MessageLinks'
import MessageText from '../components/MessageText'
import FloatingFeedback from '../components/FloatingFeedback'
import { getMessageLinkLines } from '../utils/messageContent'
import { getCategoryBadgeStyle, normalizeHexColor } from '../utils/categoryColor'
import {
  addMessageType,
  deleteMessage,
  deleteMessageType,
  getMessages,
  getMessageTypes,
  renameMessageType,
  saveMessage,
  toLocalDateTimeInput
} from '../services/messageBoardApi'
import { getNotificationTeams, sendNotificationToTeam } from '../services/notificationApi'

const emptyDraft = { title: '', text: '', type: '', start: '', end: '', links: '' }

export default function MessageManagementPage() {
  const [messages, setMessages] = useState([])
  const [types, setTypes] = useState([])
  const [draft, setDraft] = useState(emptyDraft)
  const [newType, setNewType] = useState('')
  const [newTypeHex, setNewTypeHex] = useState('#198754')
  const [renamingType, setRenamingType] = useState(null)
  const [renamedType, setRenamedType] = useState('')
  const [renamedTypeHex, setRenamedTypeHex] = useState('#198754')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)
  const [deleteRequest, setDeleteRequest] = useState(null)
  const [messageSearch, setMessageSearch] = useState('')
  const [linkSelection, setLinkSelection] = useState(null)
  const [selectedLinkNumber, setSelectedLinkNumber] = useState('1')
  const [linkToolError, setLinkToolError] = useState('')
  const [newManagedLink, setNewManagedLink] = useState('')
  const [managedLinkError, setManagedLinkError] = useState('')
  const [linkDeleteIndex, setLinkDeleteIndex] = useState(null)
  const [confirmAction, setConfirmAction] = useState(null)
  const [notificationTeams, setNotificationTeams] = useState([])
  const [notificationMode, setNotificationMode] = useState('none')
  const [notificationTeamIds, setNotificationTeamIds] = useState([])
  const [notificationTeamSearch, setNotificationTeamSearch] = useState('')
  const messageTextRef = useRef(null)
  const messageFormRef = useRef(null)

  const normalizedMessageSearch = messageSearch.trim().toLocaleLowerCase('hu-HU')
  const filteredMessages = messages.filter((message) => (
    !normalizedMessageSearch || `${message.title} ${message.text} ${message.type} ${message.links}`
      .toLocaleLowerCase('hu-HU')
      .includes(normalizedMessageSearch)
  ))

  const loadData = async () => {
    try {
      setLoading(true)
      const [messageData, typeData, teamData] = await Promise.all([getMessages(), getMessageTypes(), getNotificationTeams()])
      setMessages(messageData)
      setTypes(typeData)
      setNotificationTeams(teamData)
      setDraft((current) => ({ ...current, type: current.type || typeData[0]?.name || '' }))
    } catch (error) {
      setStatus({ type: 'danger', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])
  const updateDraft = (name, value) => setDraft((current) => ({ ...current, [name]: value }))
  const draftLinkLines = getMessageLinkLines(draft.links)
  const filteredNotificationTeams = notificationTeams.filter((team) => {
    const term = notificationTeamSearch.trim().toLocaleLowerCase('hu-HU')
    return !term || `${team.teamName || ''} ${team.schoolName || ''}`.toLocaleLowerCase('hu-HU').includes(term)
  })

  const openLinkTool = () => {
    const input = messageTextRef.current
    if (draftLinkLines.length === 0) {
      setLinkToolError('Először adj meg legalább egy linket a Linkek mezőben.')
      return
    }
    if (!input || input.selectionStart === input.selectionEnd) {
      setLinkToolError('Először jelölj ki egy szót vagy szövegrészt az üzenet szövegében.')
      return
    }
    setLinkToolError('')
    setSelectedLinkNumber('1')
    setLinkSelection({ start: input.selectionStart, end: input.selectionEnd, text: draft.text.slice(input.selectionStart, input.selectionEnd) })
  }

  const applyLinkToSelection = () => {
    if (!linkSelection) return
    const marker = `[${linkSelection.text}](link:${selectedLinkNumber})`
    const nextText = `${draft.text.slice(0, linkSelection.start)}${marker}${draft.text.slice(linkSelection.end)}`
    updateDraft('text', nextText)
    setLinkSelection(null)
    requestAnimationFrame(() => {
      const caretPosition = linkSelection.start + marker.length
      messageTextRef.current?.focus()
      messageTextRef.current?.setSelectionRange(caretPosition, caretPosition)
    })
  }

  const isValidWebLink = (value) => {
    try { return ['http:', 'https:'].includes(new URL(value).protocol) } catch { return false }
  }

  const updateManagedLink = (index, value) => {
    const nextLinks = [...draftLinkLines]
    nextLinks[index] = value
    updateDraft('links', nextLinks.join('\n'))
  }

  const addManagedLink = () => {
    const value = newManagedLink.trim()
    if (!isValidWebLink(value)) {
      setManagedLinkError('Adj meg egy teljes, http:// vagy https:// kezdetű linket.')
      return
    }
    updateDraft('links', [...draftLinkLines, value].join('\n'))
    setNewManagedLink('')
    setManagedLinkError('')
  }

  const deleteManagedLink = () => {
    if (linkDeleteIndex === null) return
    const deletedNumber = linkDeleteIndex + 1
    const nextLinks = draftLinkLines.filter((_, index) => index !== linkDeleteIndex)
    const nextText = draft.text.replace(/\[([^\]]+)]\(link:(\d+)\)/g, (marker, label, numberText) => {
      const number = Number(numberText)
      if (number === deletedNumber) return label
      return number > deletedNumber ? `[${label}](link:${number - 1})` : marker
    })
    setDraft((current) => ({ ...current, links: nextLinks.join('\n'), text: nextText }))
    setLinkDeleteIndex(null)
    setLinkSelection(null)
  }

  const handleSave = async (event) => {
    event?.preventDefault()
    if (!draft.title.trim() || !draft.text.trim() || !draft.type) {
      setStatus({ type: 'danger', text: 'A cím, a szöveg és a típus kötelező.' })
      return
    }
    if (draft.start && draft.end && new Date(draft.start) > new Date(draft.end)) {
      setStatus({ type: 'danger', text: 'A kezdési idő nem lehet később a befejezésnél.' })
      return
    }
    const invalidLink = getMessageLinkLines(draft.links).find((link) => !isValidWebLink(link))
    if (invalidLink) {
      setManagedLinkError(`Hibás link: ${invalidLink}`)
      return
    }
    if (notificationMode === 'selected' && notificationTeamIds.length === 0) {
      setStatus({ type: 'danger', text: 'Válassz ki legalább egy csapatot az értesítéshez.' })
      return
    }
    try {
      setSaving(true)
      await saveMessage(draft)
      let notificationText = ''
      if (notificationMode !== 'none') {
        const recipientIds = notificationMode === 'all'
          ? notificationTeams.map((team) => team.id)
          : notificationTeamIds
        const plainMessage = draft.text
          .replace(/\[([^\]]+)]\(link:\d+\)/g, '$1')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 500)
        const failedTeams = []
        for (const teamId of recipientIds) {
          try {
            await sendNotificationToTeam(teamId, { title: draft.title.trim(), message: plainMessage })
          } catch {
            failedTeams.push(teamId)
          }
        }
        notificationText = failedTeams.length > 0
          ? ` Az értesítés ${recipientIds.length - failedTeams.length} csapatnak elküldve, ${failedTeams.length} csapatnál sikertelen.`
          : ` Az értesítés ${recipientIds.length} csapatnak elküldve.`
      }
      setStatus({ type: 'success', text: `${draft.id ? 'Az üzenet módosítva.' : 'Az üzenet létrehozva.'}${notificationText}` })
      setDraft({ ...emptyDraft, type: types[0]?.name || '' })
      setNotificationMode('none')
      setNotificationTeamIds([])
      setNotificationTeamSearch('')
      await loadData()
    } catch (error) {
      setStatus({ type: 'danger', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  const editMessage = (message) => {
    setDraft({
      ...message,
      start: toLocalDateTimeInput(message.start),
      end: toLocalDateTimeInput(message.end)
    })
    setLinkSelection(null)
    setLinkToolError('')
    setManagedLinkError('')
    setNotificationMode('none')
    setNotificationTeamIds([])
    setNotificationTeamSearch('')
    requestAnimationFrame(() => messageFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const executeConfirmedAction = () => {
    const action = confirmAction
    setConfirmAction(null)
    if (action?.kind === 'save-message') handleSave()
    if (action?.kind === 'rename-type') handleRenameType()
    if (action?.kind === 'edit-message') editMessage(action.message)
  }

  const handleDeleteMessage = async (message) => {
    try {
      setSaving(true)
      await deleteMessage(message.id)
      if (draft.id === message.id) setDraft({ ...emptyDraft, type: types[0]?.name || '' })
      setStatus({ type: 'success', text: 'Az üzenet törölve.' })
      setDeleteRequest(null)
      await loadData()
    } catch (error) { setStatus({ type: 'danger', text: error.message }) }
    finally { setSaving(false) }
  }

  const handleAddType = async () => {
    const value = newType.trim()
    if (!value) return
    try {
      await addMessageType(value, normalizeHexColor(newTypeHex))
      setNewType('')
      setNewTypeHex('#198754')
      setStatus({ type: 'success', text: 'Az új üzenettípus hozzáadva.' })
      await loadData()
    } catch (error) { setStatus({ type: 'danger', text: error.message }) }
  }

  const handleRenameType = async () => {
    const value = renamedType.trim()
    if (!renamingType || !value) return
    const originalType = types.find((type) => type.name === renamingType)
    try {
      await renameMessageType(renamingType, {
        id: originalType?.id || 0,
        name: value,
        hex: normalizeHexColor(renamedTypeHex)
      })
      setRenamingType(null)
      setRenamedType('')
      setRenamedTypeHex('#198754')
      setStatus({ type: 'success', text: 'Az üzenettípus átnevezve.' })
      await loadData()
    } catch (error) { setStatus({ type: 'danger', text: error.message }) }
  }

  const handleDeleteType = async (type) => {
    try {
      setSaving(true)
      await deleteMessageType(type.name)
      setStatus({ type: 'success', text: 'Az üzenettípus törölve.' })
      setDeleteRequest(null)
      await loadData()
    } catch (error) { setStatus({ type: 'danger', text: error.message }) }
    finally { setSaving(false) }
  }

  return (
    <div className="container py-4">
      <h2 className="mb-1">Üzenetek kezelése</h2>
      <p className="text-muted mb-4">Üzenetek és üzenettípusok kezelése a backendben.</p>
      <FloatingFeedback message={status} onClose={() => setStatus(null)} />

      <section className="card shadow-sm team-card no-hover-card mb-4">
        <div className="card-body p-4">
          <h3 className="h5 mb-3">Üzenettípusok</h3>
          <div className="row g-2 mb-3 align-items-end">
            <div className="col-md-5"><label className="form-label" htmlFor="new-type-name">Típus neve</label><input id="new-type-name" className="form-control" placeholder="Új típus neve" value={newType} onChange={(event) => setNewType(event.target.value)} /></div>
            <div className="col-md-3"><label className="form-label" htmlFor="new-type-color">Szín</label><div className="input-group"><input id="new-type-color" type="color" className="form-control form-control-color" value={normalizeHexColor(newTypeHex)} onChange={(event) => setNewTypeHex(event.target.value)} /><input className="form-control" aria-label="Hex színkód" value={newTypeHex} maxLength="7" onChange={(event) => setNewTypeHex(event.target.value)} /></div></div>
            <div className="col-md-4"><button type="button" className="btn btn-primary w-100" onClick={handleAddType}>Típus hozzáadása</button></div>
          </div>
          <div className="d-flex flex-column gap-2">
            {types.map((type) => (
              <div className="border rounded p-2 d-flex flex-wrap align-items-center gap-2" key={type.id ?? type.name}>
                {renamingType === type.name ? (
                  <><input className="form-control flex-grow-1" aria-label="Típus neve" value={renamedType} onChange={(event) => setRenamedType(event.target.value)} /><div className="input-group message-type-color-edit"><input type="color" className="form-control form-control-color" aria-label="Típus színe" value={normalizeHexColor(renamedTypeHex)} onChange={(event) => setRenamedTypeHex(event.target.value)} /><input className="form-control" aria-label="Hex színkód" value={renamedTypeHex} maxLength="7" onChange={(event) => setRenamedTypeHex(event.target.value)} /></div><button type="button" className="btn btn-success btn-sm" onClick={() => setConfirmAction({ kind: 'rename-type' })}>Mentés</button><button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => { setRenamingType(null); setRenamedTypeHex('#198754') }}>Mégse</button></>
                ) : (
                  <><span className="badge" style={getCategoryBadgeStyle(type.hex)}>{type.name}</span><span className="small text-muted flex-grow-1">{type.hex || 'Nincs szín megadva'}</span><button type="button" className="btn btn-outline-primary btn-sm" onClick={() => { setRenamingType(type.name); setRenamedType(type.name); setRenamedTypeHex(normalizeHexColor(type.hex)) }}>Szerkesztés</button><button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setDeleteRequest({ kind: 'type', item: type })}>Törlés</button></>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <form ref={messageFormRef} className="card shadow-sm team-card no-hover-card mb-4 message-edit-form" onSubmit={(event) => { event.preventDefault(); setConfirmAction({ kind: 'save-message' }) }}>
        <div className="card-body p-4">
          <div className="d-flex justify-content-between mb-3"><h3 className="h5 mb-0">{draft.id ? 'Üzenet szerkesztése' : 'Új üzenet'}</h3>{draft.id && <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setDraft({ ...emptyDraft, type: types[0]?.name || '' })}>Mégse</button>}</div>
          <div className="row g-3">
            <div className="col-md-8"><label className="form-label" htmlFor="message-title">Cím</label><input id="message-title" className="form-control" value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} /></div>
            <div className="col-md-4"><label className="form-label" htmlFor="message-type">Típus</label><select id="message-type" className="form-select" value={draft.type} onChange={(event) => updateDraft('type', event.target.value)}><option value="">Válassz típust</option>{types.map((type) => <option key={type.id ?? type.name} value={type.name}>{type.name}</option>)}</select></div>
            <div className="col-12"><div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2"><label className="form-label mb-0" htmlFor="message-text">Szöveg</label><div className="message-link-button-wrap"><button type="button" className="btn btn-outline-primary btn-sm" onClick={openLinkTool}><i className="bi bi-link-45deg me-1" />Kijelölt szöveg legyen link</button>{linkToolError && <div className="message-link-warning" role="status"><i className="bi bi-exclamation-triangle-fill" /><span>{linkToolError}</span><button type="button" className="btn-close btn-close-white" aria-label="Bezárás" onClick={() => setLinkToolError('')} /></div>}</div></div><textarea ref={messageTextRef} id="message-text" className="form-control" rows="5" value={draft.text} onChange={(event) => updateDraft('text', event.target.value)} />
              {linkSelection && <div className="message-link-tool mt-2"><div className="small mb-2">Kijelölés: <strong>„{linkSelection.text}”</strong></div><div className="d-flex flex-wrap gap-2 align-items-center"><select className="form-select message-link-select" value={selectedLinkNumber} onChange={(event) => setSelectedLinkNumber(event.target.value)}>{draftLinkLines.map((link, index) => <option value={index + 1} key={`${link}-${index}`}>{index + 1}. link – {link}</option>)}</select><button type="button" className="btn btn-primary btn-sm" onClick={applyLinkToSelection}>Link alkalmazása</button><button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setLinkSelection(null)}>Mégse</button></div></div>}
            </div>
            <div className="col-12"><label className="form-label" htmlFor="message-links">Linkek (opcionális)</label><textarea id="message-links" className="form-control" rows="3" placeholder={'https://pelda.hu\nhttps://youtube.com/watch?v=...'} value={draft.links} onChange={(event) => updateDraft('links', event.target.value)} /><div className="form-text">Soronként egy linket adj meg. A YouTube-linkek videóként jelennek meg a hírben.</div>
              <section className="message-link-manager mt-3" aria-label="Linkek kezelése">
                <h4 className="h6 mb-3">Linkek kezelése</h4>
                {draftLinkLines.length > 0 ? <div className="d-flex flex-column gap-2 mb-3">{draftLinkLines.map((link, index) => {
                  const usageCount = [...draft.text.matchAll(new RegExp(`\\(link:${index + 1}\\)`, 'g'))].length
                  return <div className="message-link-manager-row" key={index}><span className="message-link-number">{index + 1}.</span><input className={`form-control ${isValidWebLink(link) ? '' : 'is-invalid'}`} aria-label={`${index + 1}. link`} value={link} onChange={(event) => updateManagedLink(index, event.target.value)} /><span className="message-link-usage">{usageCount} szöveges hivatkozás</span><button type="button" className="btn btn-outline-danger btn-sm" aria-label={`${index + 1}. link törlése`} onClick={() => setLinkDeleteIndex(index)}><i className="bi bi-trash" /></button></div>
                })}</div> : <p className="small text-muted">Még nincs link hozzáadva.</p>}
                <div className="input-group"><input type="url" className="form-control" placeholder="https://..." value={newManagedLink} onChange={(event) => setNewManagedLink(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addManagedLink() } }} /><button type="button" className="btn btn-outline-primary" onClick={addManagedLink}><i className="bi bi-plus-lg me-1" />Link hozzáadása</button></div>
                {managedLinkError && <div className="small text-danger fw-semibold mt-2">{managedLinkError}</div>}
              </section>
            </div>
            <div className="col-md-6"><label className="form-label" htmlFor="message-start">Kezdés (magyar idő, opcionális)</label><input id="message-start" type="datetime-local" className="form-control" value={draft.start} onChange={(event) => updateDraft('start', event.target.value)} /><div className="form-text">Üresen hagyva a mentés aktuális időpontja lesz.</div></div>
            <div className="col-md-6"><label className="form-label" htmlFor="message-end">Befejezés (magyar idő, opcionális)</label><input id="message-end" type="datetime-local" className="form-control" value={draft.end} onChange={(event) => updateDraft('end', event.target.value)} /></div>
            <div className="col-12">
              <section className="message-notification-options">
                <h4 className="h6 mb-2">Push értesítés a közzétételről</h4>
                <div className="d-flex flex-wrap gap-3">
                  <label className="form-check"><input className="form-check-input" type="radio" name="notification-mode" value="none" checked={notificationMode === 'none'} onChange={(event) => setNotificationMode(event.target.value)} /><span className="form-check-label">Ne küldjön értesítést</span></label>
                  <label className="form-check"><input className="form-check-input" type="radio" name="notification-mode" value="all" checked={notificationMode === 'all'} onChange={(event) => setNotificationMode(event.target.value)} /><span className="form-check-label">Minden csapatnak</span></label>
                  <label className="form-check"><input className="form-check-input" type="radio" name="notification-mode" value="selected" checked={notificationMode === 'selected'} onChange={(event) => setNotificationMode(event.target.value)} /><span className="form-check-label">Kiválasztott csapatoknak</span></label>
                </div>
                {notificationMode === 'selected' && <div className="mt-3">
                  <input type="search" className="form-control mb-2" placeholder="Csapat vagy iskola keresése…" value={notificationTeamSearch} onChange={(event) => setNotificationTeamSearch(event.target.value)} />
                  <div className="notification-team-grid">
                    {filteredNotificationTeams.map((team) => <label className={`notification-team-option ${notificationTeamIds.includes(team.id) ? 'selected' : ''}`} key={team.id}><input type="checkbox" checked={notificationTeamIds.includes(team.id)} onChange={() => setNotificationTeamIds((current) => current.includes(team.id) ? current.filter((id) => id !== team.id) : [...current, team.id])} /><span><strong>{team.teamName || `Csapat #${team.id}`}</strong><small>{team.schoolName || 'Nincs megadott iskola'}</small></span></label>)}
                  </div>
                  <div className="form-text">{notificationTeamIds.length} csapat kijelölve.</div>
                </div>}
                {notificationMode !== 'none' && <div className="form-text mt-2">Az értesítés a mentéskor azonnal kimegy. Címe a hír címe, tartalma a hír szövege lesz.</div>}
              </section>
            </div>
            <div className="col-12 text-end"><button className="btn btn-primary" disabled={saving || types.length === 0}>{saving ? 'Mentés...' : 'Üzenet mentése'}</button></div>
          </div>
        </div>
      </form>

      <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-3">
        <h3 className="h5 mb-0">Korábbi üzenetek</h3>
        <div className="message-admin-search">
          <label className="form-label fw-semibold" htmlFor="message-admin-search">Keresés</label>
          <div className="input-group"><span className="input-group-text"><i className="bi bi-search" /></span><input id="message-admin-search" type="search" className="form-control" placeholder="Cím, szöveg vagy típus" value={messageSearch} onChange={(event) => setMessageSearch(event.target.value)} /></div>
        </div>
      </div>
      {loading ? <div className="alert alert-info">Betöltés...</div> : messages.length === 0 ? <div className="alert alert-secondary">Nincs üzenet.</div> : (
        filteredMessages.length > 0 ? <div className="d-flex flex-column gap-3">{filteredMessages.map((message) => (
          <details className="message-admin-dropdown" key={message.id}>
            <summary>
              <span className="badge" style={getCategoryBadgeStyle(message.typeHex)}>{message.type || 'Nincs típus'}</span>
              <span className="message-admin-dropdown-title">{message.title}</span>
              <span className="message-admin-dropdown-date">{message.start ? new Date(message.start).toLocaleString('hu-HU') : 'Most'}</span>
              <i className="bi bi-chevron-down message-admin-dropdown-icon" aria-hidden="true" />
            </summary>
            <div className="message-admin-dropdown-content">
              <MessageText text={message.text} links={message.links} />
              <MessageLinks links={message.links} compact />
              <div className="small text-muted mb-3"><strong>Megjelenés:</strong> {message.start ? new Date(message.start).toLocaleString('hu-HU') : 'Azonnal'}<br /><strong>Lejárat:</strong> {message.end ? new Date(message.end).toLocaleString('hu-HU') : 'Nincs lejárat'}</div>
              <div className="d-flex flex-wrap gap-2"><button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setConfirmAction({ kind: 'edit-message', message })}>Szerkesztés</button><button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setDeleteRequest({ kind: 'message', item: message })}>Törlés</button></div>
            </div>
          </details>
        ))}</div> : <div className="alert alert-secondary">Nincs a keresésnek megfelelő üzenet.</div>
      )}
      <ConfirmModal
        open={Boolean(deleteRequest)}
        title={deleteRequest?.kind === 'type' ? 'Üzenettípus törlése' : 'Üzenet törlése'}
        confirmLabel="Törlés"
        busy={saving}
        onClose={() => setDeleteRequest(null)}
        onConfirm={() => deleteRequest?.kind === 'type' ? handleDeleteType(deleteRequest.item) : handleDeleteMessage(deleteRequest.item)}
      >
        <p className="mb-2">A törlés nem vonható vissza. Biztosan folytatod?</p>
        <strong>{deleteRequest?.item?.name || deleteRequest?.item?.title}</strong>
      </ConfirmModal>
      <ConfirmModal
        open={linkDeleteIndex !== null}
        title="Link törlése"
        confirmLabel="Link törlése"
        onClose={() => setLinkDeleteIndex(null)}
        onConfirm={deleteManagedLink}
      >
        <p className="mb-2">Biztosan törlöd ezt a linket?</p>
        <div className="small text-break">{linkDeleteIndex !== null ? draftLinkLines[linkDeleteIndex] : ''}</div>
        <p className="small text-muted mt-2 mb-0">A hozzá kapcsolt szavak megmaradnak, de többé nem lesznek kattinthatók. A többi link sorszámát automatikusan javítjuk.</p>
      </ConfirmModal>
      <ConfirmModal
        open={Boolean(confirmAction)}
        title={confirmAction?.kind === 'edit-message' ? 'Hír szerkesztése' : confirmAction?.kind === 'rename-type' ? 'Üzenettípus módosítása' : 'Üzenet mentése'}
        confirmLabel={confirmAction?.kind === 'edit-message' ? 'Szerkesztés megnyitása' : 'Mentés'}
        confirmVariant={confirmAction?.kind === 'edit-message' ? 'primary' : 'success'}
        onClose={() => setConfirmAction(null)}
        onConfirm={executeConfirmedAction}
      >
        {confirmAction?.kind === 'edit-message' && <p className="mb-0">Megnyitod szerkesztésre ezt a hírt: <strong>{confirmAction.message?.title}</strong>?</p>}
        {confirmAction?.kind === 'rename-type' && <p className="mb-0">Elmented a(z) <strong>{renamingType}</strong> kategória nevét és színét?</p>}
        {confirmAction?.kind === 'save-message' && <p className="mb-0">Biztosan elmented a(z) <strong>{draft.title || 'cím nélküli'}</strong> üzenetet?</p>}
      </ConfirmModal>
    </div>
  )
}
