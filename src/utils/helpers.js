export function formatDate(value) {
  if (!value) return 'N/A'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return 'N/A'
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function timeAgo(value) {
  if (!value) return ''
  const t = new Date(value).getTime()
  if (Number.isNaN(t)) return ''
  const secs = Math.floor((Date.now() - t) / 1000)
  if (secs < 60) return 'Just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  return days < 30 ? `${days}d ago` : formatDate(value)
}

export function getStatusStyle(status) {
  switch (status) {
    case 'Pending':
      return { bg: 'var(--status-pending-bg)', color: 'var(--status-pending-text)', borderColor: 'var(--status-pending-border)', dotColor: '#f59e0b' }
    case 'In Progress':
      return { bg: 'var(--status-progress-bg)', color: 'var(--status-progress-text)', borderColor: 'var(--status-progress-border)', dotColor: '#3b82f6' }
    case 'Resolved':
      return { bg: 'var(--status-resolved-bg)', color: 'var(--status-resolved-text)', borderColor: 'var(--status-resolved-border)', dotColor: '#10b981' }
    default:
      return { bg: 'var(--badge-gray-bg)', color: 'var(--badge-gray-text)', borderColor: 'transparent', dotColor: '#94a3b8' }
  }
}

export function getPriorityClass(priority) {
  switch (priority) {
    case 'Urgent': return 'priority-urgent'
    case 'High': return 'priority-high'
    case 'Low': return 'priority-low'
    default: return 'priority-medium'
  }
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
