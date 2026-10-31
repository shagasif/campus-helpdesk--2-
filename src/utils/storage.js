const TICKETS_KEY = 'campus_helpdesk_tickets_v1'
const THEME_KEY = 'campus_helpdesk_theme_v1'

export function getLegacyTicketsForEmail(email) {
  try {
    const raw = localStorage.getItem(TICKETS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      console.error('Previous browser ticket data is not a valid list.')
      return []
    }
    const normalizedEmail = email.trim().toLowerCase()
    return parsed.filter((ticket) =>
      ticket && typeof ticket === 'object' &&
      typeof ticket.submitterEmail === 'string' &&
      ticket.submitterEmail.trim().toLowerCase() === normalizedEmail,
    )
  } catch (error) {
    console.error('Could not read previous browser ticket data:', error)
    return []
  }
}

export function exportJSON(tickets) {
  const href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(tickets, null, 2))
  const a = document.createElement('a')
  a.setAttribute('href', href)
  a.setAttribute('download', `campus-helpdesk-tickets-${new Date().toISOString().slice(0, 10)}.json`)
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export function getTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || 'light'
  } catch (error) {
    console.error('Could not read the saved theme:', error)
    return 'light'
  }
}

export function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch (error) {
    console.error('Could not save the selected theme:', error)
  }
}
