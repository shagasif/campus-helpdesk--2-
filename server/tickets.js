import { randomBytes } from 'node:crypto'
import { CATEGORIES, DEPARTMENTS, PRIORITIES, STATUSES, SUPPORT_TEAMS } from './config.js'
import { recordAudit } from './database.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ticketFromRow(row) {
  if (!row) return null
  return {
    id: row.ticket_id,
    title: row.title,
    description: row.description,
    category: row.category,
    issueType: row.issue_type,
    priority: row.priority,
    status: row.status,
    submitterName: row.submitter_name,
    submitterEmail: row.submitter_email,
    submitterRole: row.submitter_role,
    department: row.department,
    location: row.location,
    neededBy: row.needed_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    assignedTo: row.assigned_to,
    adminNotes: row.admin_notes,
    history: JSON.parse(row.history_json),
  }
}

export function listTickets(db, user) {
  const rows = user.role === 'admin'
    ? db.prepare('SELECT * FROM tickets ORDER BY seq DESC').all()
    : db.prepare('SELECT * FROM tickets WHERE owner_user_id = ? ORDER BY seq DESC').all(user.id)
  return rows.map(ticketFromRow)
}

function insertTicket(db, data, owner, workflowId = null, legacyId = null) {
  const now = new Date().toISOString()
  const insert = db.prepare(`
    INSERT INTO tickets (
      ticket_id, owner_user_id, workflow_id, legacy_id, title, description, category, issue_type,
      priority, status, submitter_name, submitter_email, submitter_role, department, location,
      needed_by, created_at, updated_at, assigned_to, admin_notes, history_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const initialHistory = [{ status: 'Pending', timestamp: now, note: `Issue submitted by ${owner.name || 'user'}` }]
  const result = insert.run(
    `TMP-${randomBytes(12).toString('hex')}`, owner.id, workflowId, legacyId, data.title, data.description, data.category, data.issueType || null,
    data.priority, 'Pending', owner.name, owner.email, owner.role === 'admin' ? 'Staff' : 'Student',
    data.department, data.location, data.neededBy || null, now, now, data.assignedTo || 'Unassigned', '', JSON.stringify(initialHistory),
  )
  let suffix = 1000 + Number(result.lastInsertRowid)
  let ticketId = `TICK-${suffix}`
  while (db.prepare('SELECT 1 FROM tickets WHERE ticket_id = ? AND seq != ?').get(ticketId, result.lastInsertRowid)) {
    suffix += 1
    ticketId = `TICK-${suffix}`
  }
  db.prepare('UPDATE tickets SET ticket_id = ? WHERE seq = ?').run(ticketId, result.lastInsertRowid)
  const row = db.prepare('SELECT * FROM tickets WHERE seq = ?').get(result.lastInsertRowid)
  recordAudit(db, owner.id, workflowId ? 'ticket.created_from_ai' : 'ticket.migrated', ticketId)
  return ticketFromRow(row)
}

export function createConfirmedTicket(db, workflow, owner) {
  const existing = db.prepare('SELECT * FROM tickets WHERE workflow_id = ?').get(workflow.id)
  if (existing) return ticketFromRow(existing)
  const result = JSON.parse(workflow.result_json)
  const fields = {
    ...JSON.parse(workflow.input_json),
    category: result.classification.category,
    issueType: result.classification.issueType,
    priority: result.priority.priority,
    department: result.routing.department,
    assignedTo: result.routing.assignedTo,
  }
  return insertTicket(db, fields, owner, workflow.id)
}

function importableTicket(record, user) {
  if (!record || typeof record !== 'object') return false
  const fields = ['id', 'title', 'description', 'submitterEmail', 'status']
  if (fields.some((key) => typeof record[key] !== 'string')) return false
  if (record.submitterEmail.trim().toLowerCase() !== user.email.toLowerCase()) return false
  if (!record.id.trim() || record.id.length > 64 || record.title.trim().length < 6 ||
      record.title.length > 120 || record.description.trim().length < 15 || record.description.length > 4000) return false
  if (!STATUSES.includes(record.status) || !CATEGORIES.includes(record.category)) return false
  if (!PRIORITIES.includes(record.priority) && record.priority !== 'Urgent') return false
  if (!DEPARTMENTS.includes(record.department) || !EMAIL_RE.test(record.submitterEmail)) return false
  if (typeof record.location !== 'string' || !record.location.trim() || record.location.length > 160) return false
  return true
}

export function importOwnedTickets(db, records, user) {
  const insert = db.transaction((items) => {
    const imported = []
    let skippedOwnership = 0
    let skippedInvalid = 0
    let skippedDuplicate = 0
    for (const record of items) {
      if (!record || typeof record !== 'object' ||
          typeof record.submitterEmail !== 'string' ||
          record.submitterEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
        skippedOwnership += 1
        continue
      }
      if (!importableTicket(record, user)) {
        skippedInvalid += 1
        continue
      }
      const duplicate = db.prepare(
        'SELECT ticket_id FROM tickets WHERE owner_user_id = ? AND legacy_id = ?',
      ).get(user.id, record.id)
      if (duplicate) {
        skippedDuplicate += 1
        continue
      }
      const priority = record.priority === 'Urgent' ? 'Critical' : record.priority
      const now = typeof record.createdAt === 'string' && !Number.isNaN(Date.parse(record.createdAt))
        ? record.createdAt
        : new Date().toISOString()
      const history = Array.isArray(record.history)
        ? record.history.filter((entry) => entry && STATUSES.includes(entry.status) && typeof entry.timestamp === 'string' && typeof entry.note === 'string')
        : []
      const importedName = typeof record.submitterName === 'string' && record.submitterName.trim()
        ? record.submitterName.trim().slice(0, 100)
        : user.name
      const importedTicket = insertTicket(db, {
        title: record.title.trim(),
        description: record.description.trim(),
        category: record.category,
        priority,
        department: record.department,
        location: record.location.trim(),
        assignedTo: SUPPORT_TEAMS.includes(record.assignedTo) ? record.assignedTo : 'Unassigned',
      }, { ...user, name: importedName }, null, record.id)
      const legacyId = record.id.trim()
      if (/^[A-Za-z0-9-]{1,40}$/.test(legacyId) &&
          !db.prepare('SELECT 1 FROM tickets WHERE ticket_id = ? AND ticket_id != ?').get(legacyId, importedTicket.id)) {
        const generatedId = importedTicket.id
        db.prepare('UPDATE tickets SET ticket_id = ? WHERE ticket_id = ?').run(legacyId, importedTicket.id)
        db.prepare("UPDATE audit_log SET entity_id = ? WHERE actor_user_id = ? AND action = 'ticket.migrated' AND entity_id = ?")
          .run(legacyId, user.id, generatedId)
        importedTicket.id = legacyId
      }
      const finalStatus = record.status
      const validHistory = history.length ? history : [{ status: finalStatus, timestamp: now, note: "Imported from this account's previous browser ticket data." }]
      db.prepare(`
        UPDATE tickets SET status = ?, submitter_name = ?, submitter_role = ?, updated_at = ?,
          assigned_to = ?, admin_notes = ?, history_json = ? WHERE ticket_id = ?
      `).run(
        finalStatus,
        importedName,
        ['Student', 'Faculty', 'Staff', 'Visitor'].includes(record.submitterRole) ? record.submitterRole : 'Student',
        typeof record.updatedAt === 'string' && !Number.isNaN(Date.parse(record.updatedAt)) ? record.updatedAt : now,
        SUPPORT_TEAMS.includes(record.assignedTo) ? record.assignedTo : 'Unassigned',
        typeof record.adminNotes === 'string' ? record.adminNotes.slice(0, 2000) : '',
        JSON.stringify(validHistory.map((entry) => ({
          ...entry,
          note: entry.note.slice(0, 1000),
        }))),
        importedTicket.id,
      )
      imported.push(ticketFromRow(db.prepare('SELECT * FROM tickets WHERE ticket_id = ?').get(importedTicket.id)))
    }
    recordAudit(db, user.id, 'ticket.local_migration', null)
    return { imported, skippedOwnership, skippedInvalid, skippedDuplicate }
  })
  return insert(records)
}

export { CATEGORIES, DEPARTMENTS, PRIORITIES, STATUSES, SUPPORT_TEAMS }
