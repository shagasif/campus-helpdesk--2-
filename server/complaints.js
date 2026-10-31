import { recordAudit } from './database.js'
import { createConfirmedTicket, ticketFromRow } from './tickets.js'

export class ComplaintActionError extends Error {
  constructor(status, code, message) {
    super(message)
    this.name = 'ComplaintActionError'
    this.status = status
    this.code = code
  }
}

export function confirmComplaint(db, { workflowId, user, confirmed }) {
  if (confirmed !== true) {
    throw new ComplaintActionError(400, 'confirmation_required', 'Explicit confirmation is required to create a ticket.')
  }
  const workflow = db.prepare('SELECT * FROM workflows WHERE id = ?').get(workflowId)
  if (!workflow || workflow.owner_user_id !== user.id) {
    throw new ComplaintActionError(404, 'workflow_not_found', 'Workflow was not found.')
  }
  if (workflow.status === 'confirmed') {
    const existing = db.prepare('SELECT * FROM tickets WHERE workflow_id = ?').get(workflow.id)
    if (existing) return { ticket: ticketFromRow(existing), duplicate: true }
  }
  if (workflow.status !== 'awaiting_confirmation') {
    throw new ComplaintActionError(409, 'workflow_not_ready', 'Only a validated workflow can be confirmed.')
  }
  if (Date.now() - Date.parse(workflow.updated_at) > 2 * 60 * 60 * 1000) {
    db.prepare('UPDATE workflows SET status = ?, current_task = ?, updated_at = ? WHERE id = ?')
      .run('expired', 'Approval expired; run a new triage to submit this issue.', new Date().toISOString(), workflow.id)
    throw new ComplaintActionError(410, 'workflow_expired', 'This approval expired. Run AI triage again before submitting.')
  }
  const create = db.transaction(() => {
    const current = db.prepare('SELECT * FROM workflows WHERE id = ?').get(workflow.id)
    if (current.status === 'confirmed') {
      const existing = db.prepare('SELECT * FROM tickets WHERE workflow_id = ?').get(workflow.id)
      if (existing) return { ticket: ticketFromRow(existing), duplicate: true }
    }
    if (current.status !== 'awaiting_confirmation') {
      throw new ComplaintActionError(409, 'workflow_not_ready', 'Only a validated workflow can be confirmed.')
    }
    const ticket = createConfirmedTicket(db, current, user)
    db.prepare('UPDATE workflows SET status = ?, current_task = ?, updated_at = ? WHERE id = ?')
      .run('confirmed', `Complaint ${ticket.id} was created after student confirmation.`, new Date().toISOString(), workflow.id)
    recordAudit(db, user.id, 'ticket.confirmed', ticket.id)
    return { ticket, duplicate: false }
  })
  return create()
}
