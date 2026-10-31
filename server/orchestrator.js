import { randomUUID } from 'node:crypto'
import { AGENT_NAMES, CATEGORIES, MAX_INPUT_LENGTH, PRIORITIES } from './config.js'
import { recordAudit } from './database.js'
import { planWithManager, combineWithManager } from './agents/manager-agent.js'
import { classifyIssue } from './agents/classification-agent.js'
import { assessPriority } from './agents/priority-agent.js'
import { suggestResolution } from './agents/resolution-agent.js'
import { routeIssue } from './agents/routing-agent.js'
import { validateFindings } from './agents/validation-agent.js'

const specialistAgents = {
  classification: classifyIssue,
  priority: assessPriority,
  resolution: suggestResolution,
  routing: routeIssue,
}

function timestamp() {
  return new Date().toISOString()
}

function logWorkflowEvent(db, workflowId, eventType, message) {
  db.prepare(
    'INSERT INTO workflow_events (workflow_id, event_type, message, created_at) VALUES (?, ?, ?, ?)',
  ).run(workflowId, eventType, message, timestamp())
}

function setWorkflow(db, id, patch) {
  const keys = Object.keys(patch)
  const values = keys.map((key) => patch[key])
  const sql = keys.map((key) => `${key} = ?`).join(', ')
  db.prepare(`UPDATE workflows SET ${sql}, updated_at = ? WHERE id = ?`).run(...values, timestamp(), id)
}

function setAgent(db, workflowId, name, status, output = null, errorCode = null) {
  const now = timestamp()
  const agent = db.prepare('SELECT started_at FROM agent_runs WHERE workflow_id = ? AND agent_name = ?').get(workflowId, name)
  db.prepare(`
    UPDATE agent_runs SET status = ?, output_json = ?, error_code = ?, started_at = ?, completed_at = ?
    WHERE workflow_id = ? AND agent_name = ?
  `).run(
    status,
    output === null ? null : JSON.stringify(output),
    errorCode,
    status === 'running' ? now : (agent?.started_at || now),
    ['completed', 'failed', 'skipped'].includes(status) ? now : null,
    workflowId,
    name,
  )
  logWorkflowEvent(db, workflowId, `agent_${status}`, `${name} agent ${status}.`)
}

function workflowState(db, id, includeInput = false) {
  const row = db.prepare('SELECT * FROM workflows WHERE id = ?').get(id)
  if (!row) return null
  const agents = db.prepare(
    'SELECT agent_name, status, output_json, error_code, started_at, completed_at FROM agent_runs WHERE workflow_id = ? ORDER BY CASE agent_name WHEN \'manager\' THEN 1 WHEN \'classification\' THEN 2 WHEN \'priority\' THEN 3 WHEN \'resolution\' THEN 4 WHEN \'routing\' THEN 5 ELSE 6 END',
  ).all(id).map((agent) => ({
    name: agent.agent_name,
    status: agent.status,
    output: agent.output_json ? JSON.parse(agent.output_json) : null,
    errorCode: agent.error_code,
    startedAt: agent.started_at,
    completedAt: agent.completed_at,
  }))
  const events = db.prepare(
    'SELECT event_type AS type, message, created_at AS createdAt FROM workflow_events WHERE workflow_id = ? ORDER BY id',
  ).all(id)
  return {
    id: row.id,
    status: row.status,
    currentTask: row.current_task,
    taskPlan: row.plan_json ? JSON.parse(row.plan_json) : null,
    result: row.result_json ? JSON.parse(row.result_json) : null,
    errorCode: row.error_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    agents,
    events,
    ...(includeInput ? { input: JSON.parse(row.input_json) } : {}),
  }
}

export function createOrchestrator({ db, model }) {
  let activeWorkflows = 0
  const insertWorkflow = db.transaction((id, userId, input) => {
    const now = timestamp()
    db.prepare(`
      INSERT INTO workflows (id, owner_user_id, status, current_task, input_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, 'pending', 'Queued for manager planning.', JSON.stringify(input), now, now)
    const addAgent = db.prepare('INSERT INTO agent_runs (workflow_id, agent_name, status) VALUES (?, ?, ?)')
    for (const name of AGENT_NAMES) addAgent.run(id, name, 'pending')
    logWorkflowEvent(db, id, 'workflow_created', 'AI triage workflow created.')
    recordAudit(db, userId, 'ai.workflow_started', id)
  })

  async function run(id) {
    const workflow = db.prepare('SELECT * FROM workflows WHERE id = ?').get(id)
    if (!workflow) return
    const input = JSON.parse(workflow.input_json)
    try {
      setWorkflow(db, id, { status: 'running', current_task: 'Manager is understanding the request and planning specialist work.', error_code: null })
      setAgent(db, id, 'manager', 'running')
      const plan = await planWithManager(model, input)
      db.prepare('UPDATE workflows SET plan_json = ?, updated_at = ? WHERE id = ?')
        .run(JSON.stringify(plan), timestamp(), id)
      setWorkflow(db, id, { current_task: 'Classification, priority, resolution, and routing agents are working in parallel.' })
      logWorkflowEvent(db, id, 'manager_plan_ready', 'Manager created the specialist task plan.')

      const specialistResults = await Promise.allSettled(
        Object.entries(specialistAgents).map(async ([name, agent]) => {
          setAgent(db, id, name, 'running')
          try {
            const output = await agent(model, input)
            setAgent(db, id, name, 'completed', output)
            return [name, output]
          } catch (error) {
            setAgent(db, id, name, 'failed', null, error.code || 'agent_output_invalid')
            throw error
          }
        }),
      )
      const failed = specialistResults.find((result) => result.status === 'rejected')
      if (failed) {
        for (const name of ['classification', 'priority', 'resolution', 'routing']) {
          const agent = db.prepare('SELECT status FROM agent_runs WHERE workflow_id = ? AND agent_name = ?').get(id, name)
          if (agent?.status === 'pending') setAgent(db, id, name, 'skipped', null, 'dependency_failed')
        }
        setAgent(db, id, 'validation', 'skipped', null, 'specialist_failed')
        setAgent(db, id, 'manager', 'failed', null, 'specialist_failed')
        setWorkflow(db, id, { status: 'failed', current_task: 'Triage stopped because a specialist could not complete.', error_code: failed.reason?.code || 'agent_execution_failed' })
        recordAudit(db, workflow.owner_user_id, 'ai.workflow_failed', id)
        return
      }

      const findings = Object.fromEntries(specialistResults.map((item) => item.value))
      setWorkflow(db, id, { current_task: 'Validation agent is checking the specialist results.' })
      setAgent(db, id, 'validation', 'running')
      const validation = await validateFindings(model, findings)
      setAgent(db, id, 'validation', 'completed', validation)
      const combined = combineWithManager({ ...findings, validation })
      setAgent(db, id, 'manager', 'completed', combined)

      const result = { manager: combined, plan, ...findings, validation }
      const status = validation.approved ? 'awaiting_confirmation' : 'rejected'
      const currentTask = validation.approved
        ? 'Triage is complete. Waiting for the student to review and confirm ticket creation.'
        : 'Validation found unsupported or conflicting information; ticket creation is blocked.'
      setWorkflow(db, id, {
        status,
        current_task: currentTask,
        result_json: JSON.stringify(result),
        error_code: validation.approved ? null : 'validation_rejected',
      })
      logWorkflowEvent(db, id, validation.approved ? 'workflow_ready_for_confirmation' : 'workflow_rejected', currentTask)
      recordAudit(db, workflow.owner_user_id, validation.approved ? 'ai.workflow_ready' : 'ai.workflow_rejected', id)
    } catch (error) {
      const current = db.prepare('SELECT status FROM workflows WHERE id = ?').get(id)
      if (current?.status === 'confirmed') return
      const activeAgents = db.prepare('SELECT agent_name FROM agent_runs WHERE workflow_id = ? AND status = \'running\'').all(id)
      for (const { agent_name: name } of activeAgents) setAgent(db, id, name, 'failed', null, error.code || 'agent_execution_failed')
      const pendingAgents = db.prepare('SELECT agent_name FROM agent_runs WHERE workflow_id = ? AND status = \'pending\'').all(id)
      for (const { agent_name: name } of pendingAgents) setAgent(db, id, name, 'skipped', null, 'workflow_failed')
      setWorkflow(db, id, { status: 'failed', current_task: 'Triage could not be completed. No ticket was created.', error_code: error.code || 'agent_execution_failed' })
      logWorkflowEvent(db, id, 'workflow_failed', 'Workflow failed; no complaint was created.')
      recordAudit(db, workflow.owner_user_id, 'ai.workflow_failed', id)
    }
  }

  function start(userId, input) {
    if (activeWorkflows >= 1) {
      const error = new Error('Another AI triage is using the configured Gemini quota. Please try again shortly.')
      error.code = 'workflow_capacity_reached'
      throw error
    }
    const id = randomUUID()
    insertWorkflow(id, userId, input)
    activeWorkflows += 1
    void run(id).finally(() => { activeWorkflows -= 1 })
    return workflowState(db, id)
  }

  function list(user) {
    const rows = user.role === 'admin'
      ? db.prepare('SELECT id FROM workflows ORDER BY created_at DESC LIMIT 25').all()
      : db.prepare('SELECT id FROM workflows WHERE owner_user_id = ? ORDER BY created_at DESC LIMIT 25').all(user.id)
    return rows.map(({ id }) => workflowState(db, id))
  }

  function getForUser(id, user) {
    const row = db.prepare('SELECT owner_user_id FROM workflows WHERE id = ?').get(id)
    if (!row || (user.role !== 'admin' && row.owner_user_id !== user.id)) return null
    return workflowState(db, id, row.owner_user_id === user.id)
  }

  return { start, run, list, getForUser }
}

export function createTriageInput(body) {
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  const description = typeof body?.description === 'string' ? body.description.trim() : ''
  const location = typeof body?.location === 'string' ? body.location.trim() : ''
  if (title.length < 6 || title.length > 120) throw new Error('Title must be 6-120 characters.')
  if (description.length < 15 || description.length > MAX_INPUT_LENGTH) throw new Error('Description must be 15-4000 characters.')
  if (!location || location.length > 160) throw new Error('Location is required and must be 160 characters or fewer.')
  if (!CATEGORIES.includes(body.requestedCategory)) throw new Error('Choose a valid issue category.')
  if (!PRIORITIES.includes(body.requestedPriority)) throw new Error('Choose a valid requested priority.')
  const neededBy = body.neededBy || ''
  if (neededBy) {
    const parsedDate = new Date(`${neededBy}T00:00:00Z`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(neededBy) ||
        Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== neededBy) {
      throw new Error('Provide a valid needed-by date.')
    }
  }
  return {
    title,
    description,
    location,
    neededBy,
    requestedCategory: body.requestedCategory,
    requestedPriority: body.requestedPriority,
  }
}
