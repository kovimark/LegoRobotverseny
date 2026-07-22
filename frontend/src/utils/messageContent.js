export const getMessageLinkLines = (links) => String(links || '')
  .split(/\r?\n/)
  .map((link) => link.trim())
  .filter(Boolean)

export const stripMessageLinkMarkers = (text) => String(text || '')
  .replace(/\[([^\]]+)]\(link:\d+\)/g, '$1')

