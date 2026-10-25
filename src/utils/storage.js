import { STATUSES, createDefaultTickets } from '../data/mockData'

const TICKETS_KEY = 'campus_helpdesk_tickets_v1'
const THEME_KEY = 'campus_helpdesk_theme_v1'

function isValidTicket(t) {
  return Boolean(t) && typeof t === 'object' && typeof t.id === 'string' && typeof t.title === 'string' &&
    typeof t.description === 'string' && typeof t.submitterName === 'string' && STATUSES.includes(t.status)
}

export function getTickets() {
  try {
    const raw = localStorage.getItem(TICKETS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      // An empty array is valid (all tickets deleted); only re-seed when the data is unusable.
      if (Array.isArray(parsed)) return parsed.filter(isValidTicket)
    }
  } catch (err) {
    console.error('Failed to read tickets from localStorage:', err)
  }
  return resetTickets() || createDefaultTickets()
}

export function saveTickets(tickets) {
  try {
    localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets))
    return true
  } catch (err) {
    console.error('Failed to write tickets to localStorage:', err)
    return false
  }
}

export function generateId(tickets) {
  let max = 1000
  tickets.forEach((t) => {
    if (t.id && t.id.startsWith('TICK-')) {
      const n = parseInt(t.id.replace('TICK-', ''), 10)
      if (!Number.isNaN(n) && n > max) max = n
    }
  })
  return `TICK-${max + 1}`
}

export function createTicket(data) {
  const tickets = getTickets()
  const now = new Date().toISOString()
  const name = data.submitterName.trim()
  const ticket = {
    id: generateId(tickets),
    title: data.title.trim(),
    description: data.description.trim(),
    category: data.category || 'Other / General Support',
    priority: data.priority || 'Medium',
    status: 'Pending',
    submitterName: name,
    submitterEmail: data.submitterEmail.trim(),
    submitterRole: data.submitterRole || 'Student',
    department: data.department || 'General',
    location: data.location ? data.location.trim() : 'Campus Grounds',
    createdAt: now,
    updatedAt: now,
    assignedTo: 'Unassigned',
    adminNotes: '',
    history: [{ status: 'Pending', timestamp: now, note: `Issue submitted by ${name || 'user'}` }],
  }
  if (!saveTickets([ticket, ...tickets])) return null
  return ticket
}

// `note` is optional; when blank, a default "Status changed" entry is logged
// and the existing admin notes are left untouched.
export function updateTicketStatus(id, status, note = '', assignedTo) {
  const now = new Date().toISOString()
  const trimmed = note ? note.trim() : ''
  const updated = getTickets().map((t) => {
    if (t.id !== id) return t
    const entry = { status, timestamp: now, note: trimmed || `Status changed to ${status}` }
    return {
      ...t,
      status,
      updatedAt: now,
      adminNotes: trimmed || t.adminNotes,
      assignedTo: assignedTo === undefined ? t.assignedTo : assignedTo,
      history: [...(t.history || []), entry],
    }
  })
  if (!saveTickets(updated)) return null
  return updated
}

export function updateTicket(id, changes) {
  const now = new Date().toISOString()
  const updated = getTickets().map((t) => (t.id === id ? { ...t, ...changes, updatedAt: now } : t))
  if (!saveTickets(updated)) return null
  return updated
}

export function deleteTicket(id) {
  const updated = getTickets().filter((t) => t.id !== id)
  if (!saveTickets(updated)) return null
  return updated
}

export function resetTickets() {
  const defaults = createDefaultTickets()
  if (!saveTickets(defaults)) return null
  return defaults
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
  } catch {
    return 'light'
  }
}

export function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch (err) {
    console.error('Failed to save theme:', err)
  }
}
