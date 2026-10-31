export class ApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(path, {
      ...options,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new ApiError(0, 'server_unavailable', 'Could not reach the helpdesk server. Please try again.')
  }
  if (response.status === 204) return null
  let payload
  try {
    payload = await response.json()
  } catch {
    throw new ApiError(response.status, 'invalid_response', 'The helpdesk server returned an invalid response.')
  }
  if (!response.ok) {
    throw new ApiError(response.status, payload?.error?.code || 'request_failed', payload?.error?.message || 'The request could not be completed.')
  }
  return payload
}

export const api = {
  async currentUser() {
    return (await request('/api/auth/me')).user
  },
  async register(fields) {
    return (await request('/api/auth/register', { method: 'POST', body: JSON.stringify(fields) })).user
  },
  async login(fields) {
    return (await request('/api/auth/login', { method: 'POST', body: JSON.stringify(fields) })).user
  },
  logout() {
    return request('/api/auth/logout', { method: 'POST' })
  },
  async listTickets() {
    return (await request('/api/tickets')).tickets
  },
  importLocalTickets(tickets) {
    return request('/api/tickets/import-local', { method: 'POST', body: JSON.stringify({ tickets }) })
  },
  migrationStatus() {
    return request('/api/tickets/migration-status')
  },
  async listWorkflows() {
    return (await request('/api/ai/workflows')).workflows
  },
  async getWorkflow(id) {
    return (await request(`/api/ai/workflows/${encodeURIComponent(id)}`)).workflow
  },
  async startWorkflow(input) {
    return (await request('/api/ai/workflows', { method: 'POST', body: JSON.stringify(input) })).workflow
  },
  async confirmWorkflow(id) {
    return (await request(`/api/ai/workflows/${encodeURIComponent(id)}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ confirmed: true }),
    })).ticket
  },
  async changeStatus(id, fields) {
    return (await request(`/api/tickets/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify(fields),
    })).ticket
  },
  async updateTicket(id, fields) {
    return (await request(`/api/tickets/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(fields),
    })).ticket
  },
  deleteTicket(id) {
    return request(`/api/tickets/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },
}
