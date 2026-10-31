import { randomUUID } from 'node:crypto'
import process from 'node:process'
import express from 'express'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { createSession, clearSessionCookie, hashPassword, setSessionCookie, userFromSession, verifyPassword } from './auth.js'
import { recordAudit } from './database.js'
import { ComplaintActionError, confirmComplaint } from './complaints.js'
import { GeminiClient } from './gemini-client.js'
import { createOrchestrator, createTriageInput } from './orchestrator.js'
import { importOwnedTickets, listTickets, ticketFromRow } from './tickets.js'
import { STATUSES, SUPPORT_TEAMS } from './config.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_MIN_LENGTH = 12

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role }
}

function fail(res, status, code, message) {
  return res.status(status).json({ error: { code, message } })
}

function validateOrigin(allowedOrigins) {
  return (req, res, next) => {
    const origin = req.get('origin')
    if (!origin || ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
    if (!allowedOrigins.includes(origin)) return fail(res, 403, 'origin_not_allowed', 'Request origin is not allowed.')
    return next()
  }
}

function requireAuthentication(db) {
  return (req, res, next) => {
    const user = userFromSession(db, req)
    if (!user) return fail(res, 401, 'authentication_required', 'Please sign in to continue.')
    req.user = user
    return next()
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return fail(res, 403, 'forbidden', 'You do not have permission to perform this action.')
    return next()
  }
}

function findTicketRow(db, ticketId, user) {
  const row = db.prepare('SELECT * FROM tickets WHERE ticket_id = ?').get(ticketId)
  if (!row || (user.role !== 'admin' && row.owner_user_id !== user.id)) return null
  return row
}

export function createApp({ db, env = process.env, model, onWorkflowStart } = {}) {
  const database = db
  if (!database) throw new Error('createApp requires a database instance.')
  const gemini = model || new GeminiClient({
    apiKey: env.GEMINI_API_KEY,
    model: env.GEMINI_MODEL || 'gemini-3.6-flash',
    requestsPerMinute: env.GEMINI_REQUESTS_PER_MINUTE || 8,
  })
  const orchestrator = createOrchestrator({ db: database, model: gemini })
  const app = express()
  app.disable('x-powered-by')
  app.use(helmet())
  app.use(express.json({ limit: '2mb' }))
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store')
    next()
  })
  app.use(validateOrigin((env.APP_ORIGINS || 'http://localhost:5173').split(',').map((item) => item.trim()).filter(Boolean)))

  const rateLimitHandler = (_req, res) => fail(res, 429, 'rate_limited', 'Too many requests. Please wait and try again.')
  const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, handler: rateLimitHandler })
  const registrationLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false, handler: rateLimitHandler })
  const workflowLimiter = rateLimit({ windowMs: 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, handler: rateLimitHandler })

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

  app.post('/api/auth/register', registrationLimiter, async (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    if (name.length < 2 || name.length > 100) return fail(res, 400, 'invalid_name', 'Name must be 2-100 characters.')
    if (email.length > 254 || !EMAIL_RE.test(email)) return fail(res, 400, 'invalid_email', 'Enter a valid email address.')
    if (password.length < PASSWORD_MIN_LENGTH || password.length > 128) {
      return fail(res, 400, 'invalid_password', `Password must be ${PASSWORD_MIN_LENGTH}-128 characters.`)
    }
    if (database.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
      return fail(res, 409, 'account_exists', 'An account with that email already exists.')
    }
    const user = { id: randomUUID(), name, email, role: 'student' }
    const passwordHash = await hashPassword(password)
    try {
      database.prepare(
        'INSERT INTO users (id, name, email, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      ).run(user.id, user.name, user.email, user.role, passwordHash, new Date().toISOString())
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return fail(res, 409, 'account_exists', 'An account with that email already exists.')
      throw error
    }
    recordAudit(database, user.id, 'auth.registered')
    const session = createSession(database, user.id)
    setSessionCookie(res, session.token, env.NODE_ENV === 'production')
    return res.status(201).json({ user })
  })

  app.post('/api/auth/login', loginLimiter, async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    const user = database.prepare('SELECT * FROM users WHERE email = ?').get(email)
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return fail(res, 401, 'invalid_credentials', 'Email or password is incorrect.')
    }
    const session = createSession(database, user.id)
    setSessionCookie(res, session.token, env.NODE_ENV === 'production')
    recordAudit(database, user.id, 'auth.login')
    return res.json({ user: publicUser(user) })
  })

  app.post('/api/auth/logout', requireAuthentication(database), (req, res) => {
    database.transaction(() => {
      database.prepare('DELETE FROM sessions WHERE token_hash = ?').run(req.user.tokenHash)
      recordAudit(database, req.user.id, 'auth.logout')
    })()
    clearSessionCookie(res, env.NODE_ENV === 'production')
    return res.status(204).end()
  })

  app.get('/api/auth/me', requireAuthentication(database), (req, res) => res.json({ user: publicUser(req.user) }))

  app.get('/api/tickets', requireAuthentication(database), (req, res) => res.json({ tickets: listTickets(database, req.user) }))

  app.post('/api/tickets/import-local', requireAuthentication(database), requireRole('student'), (req, res) => {
    const records = req.body?.tickets
    if (!Array.isArray(records) || records.length > 500) {
      return fail(res, 400, 'invalid_migration', 'Provide up to 500 browser tickets to import.')
    }
    const userRow = database.prepare('SELECT legacy_imported_at FROM users WHERE id = ?').get(req.user.id)
    if (userRow.legacy_imported_at) {
      return fail(res, 409, 'migration_already_completed', 'Previous browser ticket data was already checked for this account.')
    }
    const result = importOwnedTickets(database, records, req.user)
    database.prepare('UPDATE users SET legacy_imported_at = ? WHERE id = ?').run(new Date().toISOString(), req.user.id)
    return res.json({
      imported: result.imported,
      importedCount: result.imported.length,
      skippedOwnership: result.skippedOwnership,
      skippedInvalid: result.skippedInvalid,
      skippedDuplicate: result.skippedDuplicate,
    })
  })

  app.get('/api/tickets/migration-status', requireAuthentication(database), requireRole('student'), (req, res) => {
    const row = database.prepare('SELECT legacy_imported_at FROM users WHERE id = ?').get(req.user.id)
    return res.json({ migrated: Boolean(row.legacy_imported_at) })
  })

  app.patch('/api/tickets/:ticketId/status', requireAuthentication(database), requireRole('admin'), (req, res) => {
    const { status, note = '', assignedTo } = req.body || {}
    if (!STATUSES.includes(status)) return fail(res, 400, 'invalid_status', 'Choose a valid ticket status.')
    if (typeof note !== 'string' || note.length > 1000) return fail(res, 400, 'invalid_note', 'Status note must be 1000 characters or fewer.')
    if (assignedTo !== undefined && !SUPPORT_TEAMS.includes(assignedTo)) {
      return fail(res, 400, 'invalid_assignee', 'Choose a listed support team.')
    }
    const row = findTicketRow(database, req.params.ticketId, req.user)
    if (!row) return fail(res, 404, 'ticket_not_found', 'Ticket was not found.')
    const now = new Date().toISOString()
    const trimmedNote = note.trim()
    const history = JSON.parse(row.history_json)
    history.push({ status, timestamp: now, note: trimmedNote || `Status changed to ${status}` })
    database.transaction(() => {
      database.prepare(`
        UPDATE tickets SET status = ?, updated_at = ?, admin_notes = ?, assigned_to = ?, history_json = ?
        WHERE ticket_id = ?
      `).run(
        status,
        now,
        trimmedNote || row.admin_notes,
        assignedTo === undefined ? row.assigned_to : assignedTo,
        JSON.stringify(history),
        req.params.ticketId,
      )
      recordAudit(database, req.user.id, 'ticket.status_changed', req.params.ticketId)
    })()
    return res.json({ ticket: ticketFromRow(database.prepare('SELECT * FROM tickets WHERE ticket_id = ?').get(req.params.ticketId)) })
  })

  app.patch('/api/tickets/:ticketId', requireAuthentication(database), requireRole('admin'), (req, res) => {
    const { adminNotes, assignedTo } = req.body || {}
    if (adminNotes !== undefined && (typeof adminNotes !== 'string' || adminNotes.length > 2000)) {
      return fail(res, 400, 'invalid_notes', 'Staff notes must be 2000 characters or fewer.')
    }
    if (assignedTo !== undefined && !SUPPORT_TEAMS.includes(assignedTo)) {
      return fail(res, 400, 'invalid_assignee', 'Choose a listed support team.')
    }
    const row = findTicketRow(database, req.params.ticketId, req.user)
    if (!row) return fail(res, 404, 'ticket_not_found', 'Ticket was not found.')
    const updatedAt = new Date().toISOString()
    database.transaction(() => {
      database.prepare('UPDATE tickets SET admin_notes = ?, assigned_to = ?, updated_at = ? WHERE ticket_id = ?')
        .run(adminNotes === undefined ? row.admin_notes : adminNotes.trim(), assignedTo === undefined ? row.assigned_to : assignedTo, updatedAt, req.params.ticketId)
      recordAudit(database, req.user.id, 'ticket.updated', req.params.ticketId)
    })()
    return res.json({ ticket: ticketFromRow(database.prepare('SELECT * FROM tickets WHERE ticket_id = ?').get(req.params.ticketId)) })
  })

  app.delete('/api/tickets/:ticketId', requireAuthentication(database), requireRole('admin'), (req, res) => {
    const row = findTicketRow(database, req.params.ticketId, req.user)
    if (!row) return fail(res, 404, 'ticket_not_found', 'Ticket was not found.')
    database.transaction(() => {
      database.prepare('DELETE FROM tickets WHERE ticket_id = ?').run(req.params.ticketId)
      recordAudit(database, req.user.id, 'ticket.deleted', req.params.ticketId)
    })()
    return res.status(204).end()
  })

  app.get('/api/ai/workflows', requireAuthentication(database), (req, res) => {
    return res.json({ workflows: orchestrator.list(req.user) })
  })

  app.get('/api/ai/workflows/:workflowId', requireAuthentication(database), (req, res) => {
    const workflow = orchestrator.getForUser(req.params.workflowId, req.user)
    if (!workflow) return fail(res, 404, 'workflow_not_found', 'Workflow was not found.')
    return res.json({ workflow })
  })

  app.post('/api/ai/workflows', workflowLimiter, requireAuthentication(database), async (req, res) => {
    if (database.prepare(`
      SELECT COUNT(*) AS count FROM workflows
      WHERE owner_user_id = ? AND created_at >= ?
    `).get(req.user.id, new Date(Date.now() - 60_000).toISOString()).count >= 3) {
      return fail(res, 429, 'workflow_quota_exceeded', 'Please wait before starting another AI triage.')
    }
    let input
    try {
      input = createTriageInput(req.body)
    } catch (error) {
      return fail(res, 400, 'invalid_triage_input', error.message)
    }
    if (!env.GEMINI_API_KEY) return fail(res, 503, 'gemini_not_configured', 'AI triage is not configured. Contact the helpdesk administrator.')
    let workflow
    try {
      workflow = orchestrator.start(req.user.id, input)
    } catch (error) {
      if (error.code === 'workflow_capacity_reached') return fail(res, 429, error.code, error.message)
      throw error
    }
    onWorkflowStart?.(workflow.id)
    return res.status(202).json({ workflow })
  })

  app.post('/api/ai/workflows/:workflowId/confirm', requireAuthentication(database), (req, res, next) => {
    try {
      const result = confirmComplaint(database, {
        workflowId: req.params.workflowId,
        user: req.user,
        confirmed: req.body?.confirmed,
      })
      return res.status(result.duplicate ? 200 : 201).json(result)
    } catch (error) {
      if (error instanceof ComplaintActionError) return fail(res, error.status, error.code, error.message)
      return next(error)
    }
  })

  app.use((error, _req, res, next) => {
    if (res.headersSent) return next(error)
    if (error.type === 'entity.too.large') return fail(res, 413, 'request_too_large', 'Request data is too large.')
    if (error.type === 'entity.parse.failed') return fail(res, 400, 'invalid_json', 'Request body must be valid JSON.')
    console.error('API request failed:', error.code || error.name || 'unknown_error')
    return fail(res, 500, 'internal_error', 'The request could not be completed.')
  })

  return app
}
