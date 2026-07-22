export const normalizeHexColor = (hex, fallback = '#198754') => (
  /^#[0-9a-f]{6}$/i.test(String(hex || '').trim()) ? String(hex).trim() : fallback
)

export const getCategoryBadgeStyle = (hex) => {
  const backgroundColor = normalizeHexColor(hex)
  const red = parseInt(backgroundColor.slice(1, 3), 16)
  const green = parseInt(backgroundColor.slice(3, 5), 16)
  const blue = parseInt(backgroundColor.slice(5, 7), 16)
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000
  return { backgroundColor, color: luminance > 150 ? '#111111' : '#ffffff' }
}
