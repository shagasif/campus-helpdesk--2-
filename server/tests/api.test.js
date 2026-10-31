import assert from 'node:assert/strict'
import test from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import { createSession, createBootstrapAdmin, hashPassword, userFromSession, verifyPassword } from '../auth.js'
import { confirmComplaint, ComplaintActionError } from '../complaints.js'
import { createDatabase } from '../database.js'
import { createOrchestrator } from '../orchestrator.js'
import { importOwnedTickets, listTickets } from '../tickets.js'

const aiResponses = {
  plan: {
    understanding: 'Multiple students report intermittent Wi-Fi.',
    delegations: ['classification', 'priority', 'resolution', 'routing'].map((agent) => ({ agent, task: `Evaluate ${agent} evidence.` })),
  },
  classification: { issueType: 'technical', category: 'Wi-Fi & Network', reason: 'The issue concerns wireless connectivity.' },
  priority: { priority: 'High', reason: 'Several students are affected.', deadlineSignal: 'No deadline was provided.' },
  resolution: { available: false, matches: [] },
  routing: { department: 'Computer Science', team: 'Network Operations', reason: 'The configured network team handles network incidents.' },
  validation: { approved: true, concerns: [], summary: 'No unverified FAQ recommendation was included.' },
}

const testModel = {
  async generateJson({ schema }) {
    const fields = Object.keys(schema.properties)
    if (fields.includes('delegations')) return structuredClone(aiResponses.plan)
    if (fields.includes('issueType')) return structuredClone(aiResponses.classification)
    if (fields.includes('deadlineSignal')) return structuredClone(aiResponses.priority)
    if (fields.includes('available')) return structuredClone(aiResponses.resolution)
    if (fields.includes('department')) return structuredClone(aiResponses.routing)
    if (fields.includes('approved')) return structuredClone(aiResponses.validation)
    throw new Error('Unexpected schema in test provider.')
  },
}

async function setup() {
  const db = createDatabase(':memory:')
  const env = {
    ADMIN_EMAIL: 'administrator@example.edu',
    ADMIN_PASSWORD: 'a-long-test-password',
    ADMIN_NAME: 'Test Administrator',
  }
  await createBootstrapAdmin(db, env)
  async function addStudent(email, name = 'Test Student') {
    const id = `student-${email}`
    const passwordHash = await hashPassword('a-long-student-password')
    db.prepare(
      'INSERT INTO users (id, name, email, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(id, name, email, 'student', passwordHash, new Date().toISOString())
    return { id, name, email, role: 'student' }
  }
  return { db, addStudent }
}

async function waitForWorkflow(orchestrator, id, user) {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    const workflow = orchestrator.getForUser(id, user)
    if (!workflow) throw new Error('Workflow was unexpectedly hidden from its owner.')
    if (!['pending', 'running'].includes(workflow.status)) return workflow
    await delay(5)
  }
  throw new Error('Workflow did not finish in time.')
}

test('authenticated student sees only own tickets and must confirm before a validated workflow creates one', async () => {
  const { db, addStudent } = await setup()
  try {
    const student = await addStudent('student.one@example.edu')
    const otherStudent = await addStudent('student.two@example.edu', 'Second Student')
    const admin = db.prepare('SELECT id, name, email, role FROM users WHERE role = ?').get('admin')
    const orchestrator = createOrchestrator({ db, model: testModel })
    const workflow = orchestrator.start(student.id, {
      title: 'Campus Wi-Fi disconnecting',
      description: 'Several students lose the campus Wi-Fi connection during afternoon lectures.',
      location: 'Science Building room 3',
      neededBy: '2027-01-15',
      requestedCategory: 'Wi-Fi & Network',
      requestedPriority: 'Medium',
    })
    const completed = await waitForWorkflow(orchestrator, workflow.id, student)
    assert.equal(completed.status, 'awaiting_confirmation')
    assert.deepEqual(completed.agents.map((agent) => agent.name), ['manager', 'classification', 'priority', 'resolution', 'routing', 'validation'])
    assert.ok(completed.agents.every((agent) => agent.status === 'completed'))
    assert.deepEqual(listTickets(db, student), [])
    assert.equal(orchestrator.getForUser(workflow.id, otherStudent), null)
    assert.throws(
      () => confirmComplaint(db, { workflowId: workflow.id, user: otherStudent, confirmed: true }),
      (error) => error instanceof ComplaintActionError && error.status === 404,
    )
    assert.throws(
      () => confirmComplaint(db, { workflowId: workflow.id, user: student, confirmed: false }),
      (error) => error instanceof ComplaintActionError && error.status === 400,
    )

    const created = confirmComplaint(db, { workflowId: workflow.id, user: student, confirmed: true })
    assert.equal(created.duplicate, false)
    assert.match(created.ticket.id, /^TICK-\d+$/)
    assert.equal(created.ticket.submitterEmail, student.email)
    assert.equal(created.ticket.category, 'Wi-Fi & Network')
    assert.equal(created.ticket.priority, 'High')
    assert.equal(created.ticket.department, 'Computer Science')
    assert.equal(created.ticket.assignedTo, 'Network Operations (David K.)')
    assert.equal(created.ticket.status, 'Pending')

    const repeated = confirmComplaint(db, { workflowId: workflow.id, user: student, confirmed: true })
    assert.equal(repeated.duplicate, true)
    assert.equal(repeated.ticket.id, created.ticket.id)
    assert.equal(listTickets(db, student).length, 1)
    assert.deepEqual(listTickets(db, otherStudent), [])
    assert.equal(listTickets(db, admin).length, 1)
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM audit_log WHERE action = ?').get('ticket.confirmed').count, 1)
  } finally {
    db.close()
  }
})

test('legacy migration imports only matching account email and maps legacy Urgent to Critical', async () => {
  const { db, addStudent } = await setup()
  try {
    const student = await addStudent('legacy.owner@example.edu')
    const otherStudent = await addStudent('other.owner@example.edu', 'Another Student')
    const result = importOwnedTickets(db, [
      {
        id: 'TICK-1042',
        title: 'My old Wi-Fi problem',
        description: 'My campus Wi-Fi connection drops repeatedly in the library.',
        category: 'Wi-Fi & Network',
        priority: 'Urgent',
        status: 'In Progress',
        submitterName: 'Test Student',
        submitterEmail: 'legacy.owner@example.edu',
        submitterRole: 'Student',
        department: 'Computer Science',
        location: 'Library',
        assignedTo: 'Network Operations (David K.)',
        adminNotes: 'Previous staff update.',
        history: [{ status: 'Pending', timestamp: '2026-01-01T00:00:00.000Z', note: 'Created in old tracker.' }],
      },
      {
        id: 'TICK-1043',
        title: "Someone else's ticket",
        description: 'This record belongs to a different account and must not be imported.',
        category: 'Wi-Fi & Network',
        priority: 'High',
        status: 'Pending',
        submitterEmail: 'other.owner@example.edu',
        department: 'Computer Science',
        location: 'Library',
      },
    ], student)
    assert.equal(result.imported.length, 1)
    assert.equal(result.skippedOwnership, 1)
    assert.equal(result.imported[0].id, 'TICK-1042')
    assert.equal(result.imported[0].priority, 'Critical')
    assert.equal(result.imported[0].status, 'In Progress')
    assert.equal(listTickets(db, student).length, 1)
    assert.deepEqual(listTickets(db, otherStudent), [])
    const duplicate = importOwnedTickets(db, [result.imported[0]], student)
    assert.equal(duplicate.skippedDuplicate, 1)
    assert.equal(listTickets(db, student).length, 1)
  } finally {
    db.close()
  }
})

test('local password accounts use stored password hashes and opaque expiring sessions', async () => {
  const { db, addStudent } = await setup()
  try {
    const student = await addStudent('login@example.edu')
    const passwordHash = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(student.id).password_hash
    assert.equal(await verifyPassword('a-long-student-password', passwordHash), true)
    assert.equal(await verifyPassword('incorrect-password', passwordHash), false)
    const session = createSession(db, student.id)
    const req = { headers: { cookie: `campus_session=${session.token}` } }
    assert.deepEqual(userFromSession(db, req), { ...student, tokenHash: userFromSession(db, req).tokenHash })
    assert.equal(userFromSession(db, { headers: { cookie: 'campus_session=invalid-token' } }), null)
  } finally {
    db.close()
  }
})
