import React from 'react'
import { getMessageLinkLines } from '../utils/messageContent'

export default function MessageText({ text, links, className = '' }) {
  const linkLines = getMessageLinkLines(links)
  const markerPattern = /\[([^\]]+)]\(link:(\d+)\)/g
  const content = String(text || '')
  const parts = []
  let lastIndex = 0
  let match

  while ((match = markerPattern.exec(content)) !== null) {
    if (match.index > lastIndex) parts.push(content.slice(lastIndex, match.index))
    const link = linkLines[Number(match[2]) - 1]
    let isSafeLink = false
    try { isSafeLink = ['http:', 'https:'].includes(new URL(link).protocol) } catch { isSafeLink = false }
    parts.push(isSafeLink ? (
      <a href={link} target="_blank" rel="noopener noreferrer" key={`${match.index}-${match[2]}`}>{match[1]}</a>
    ) : match[1])
    lastIndex = markerPattern.lastIndex
  }
  if (lastIndex < content.length) parts.push(content.slice(lastIndex))

  return <div className={`message-rich-text ${className}`.trim()}>{parts}</div>
}
