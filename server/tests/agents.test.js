import assert from 'node:assert/strict'
import test from 'node:test'
import { assessPriority } from '../agents/priority-agent.js'
import { classifyIssue } from '../agents/classification-agent.js'
import { planWithManager, combineWithManager } from '../agents/manager-agent.js'
import { suggestResolution } from '../agents/resolution-agent.js'
import { routeIssue } from '../agents/routing-agent.js'
import { inspectSpecialistOutputs, validateFindings } from '../agents/validation-agent.js'
import { FAQ_SOURCES, ROUTING_ASSIGNMENTS } from '../config.js'

const issue = {
  title: 'Campus Wi-Fi disconnecting',
  description: 'Several students lose the campus Wi-Fi connection during lectures.',
  location: 'Science Building room 3',
  neededBy: '2027-01-15',
  requestedCategory: 'Wi-Fi & Network',
  requestedPriority: 'Medium',
}

const goodFindings = {
  classification: { issueType: 'technical', category: 'Wi-Fi & Network', reason: 'The report concerns network connectivity.' },
  priority: { priority: 'High', reason: 'Multiple students are affected.', deadlineSignal: 'A deadline was not provided.' },
  resolution: { available: true, matches: [{ faqId: 'wifi-secure', excerpts: ['Select "Campus-Secure" from your device Wi-Fi settings.'] }] },
  routing: { department: 'Computer Science', team: 'Network Operations', assignedTo: 'Network Operations (David K.)', reason: 'The configured network team handles Wi-Fi incidents.' },
}
const approvedFaqs = FAQ_SOURCES.map((faq) => ({
  ...faq,
  verified: true,
  sourceUrl: `https://helpdesk.example.edu/${faq.id}`,
}))

function modelReturning(value) {
  return { generateJson: async () => structuredClone(value) }
}

test('Manager Agent creates a complete plan and combines verified specialist outputs', async () => {
  const plan = {
    understanding: 'Several students are reporting a Wi-Fi issue.',
    delegations: ['classification', 'priority', 'resolution', 'routing'].map((agent) => ({ agent, task: `Assess ${agent} evidence.` })),
  }
  assert.deepEqual(await planWithManager(modelReturning(plan), issue), plan)
  const combined = combineWithManager(goodFindings)
  assert.match(combined.summary, /Technical issue in Wi-Fi & Network/)
  assert.deepEqual(combined.nextSteps, goodFindings.resolution.matches[0].excerpts)
  await assert.rejects(planWithManager(modelReturning({ ...plan, delegations: [] }), issue), /incomplete task plan/)
})

test('Classification Agent returns only supported issue types and categories', async () => {
  assert.deepEqual(
    await classifyIssue(modelReturning(goodFindings.classification), issue),
    goodFindings.classification,
  )
  await assert.rejects(classifyIssue(modelReturning({ ...goodFindings.classification, category: 'Invented Office' }), issue), /unsupported/)
})

test('Priority Agent supports Critical and requires a reason and deadline assessment', async () => {
  const output = { priority: 'Critical', reason: 'A security incident is actively affecting access.', deadlineSignal: 'Immediate impact was stated.' }
  assert.deepEqual(await assessPriority(modelReturning(output), issue), output)
  await assert.rejects(assessPriority(modelReturning({ ...output, reason: '' }), issue), /invalid Priority field/)
})

test('Resolution Agent accepts exact configured FAQ text and rejects invented instructions', async () => {
  assert.ok(FAQ_SOURCES.every((faq) => faq.verified === false && faq.sourceUrl === null))
  const excerpt = approvedFaqs[0].answer.slice(0, 52)
  const supported = { available: true, matches: [{ faqId: approvedFaqs[0].id, excerpts: [excerpt] }] }
  assert.deepEqual(await suggestResolution(modelReturning(supported), issue, approvedFaqs), supported)
  await assert.rejects(
    suggestResolution(modelReturning({ available: true, matches: [{ faqId: 'wifi-secure', excerpts: ['Restart the campus router.'] }] }), issue, approvedFaqs),
    /exact approved FAQ excerpt/,
  )
  assert.deepEqual(await suggestResolution(modelReturning({ available: false, matches: [] }), issue), { available: false, matches: [] })
})

test('Routing Agent resolves a configured department/team pair to its configured assignee', async () => {
  const modelOutput = { department: goodFindings.routing.department, team: goodFindings.routing.team, reason: goodFindings.routing.reason }
  const result = await routeIssue(modelReturning(modelOutput), issue)
  assert.deepEqual(result, goodFindings.routing)
  assert.equal(ROUTING_ASSIGNMENTS.find((assignment) => assignment.team === result.team)?.department, result.department)
})

test('Routing Agent rejects mismatched department/team pairs and unsupported personnel', async () => {
  const modelOutput = { department: goodFindings.routing.department, team: goodFindings.routing.team, reason: goodFindings.routing.reason }
  await assert.rejects(
    routeIssue(modelReturning({ ...modelOutput, department: 'Engineering' }), issue),
    /department\/team combination not in configured routing assignments/,
  )
  await assert.rejects(
    routeIssue(modelReturning({ ...modelOutput, assignedTo: 'Network Operations (Invented Person)' }), issue),
    /must not generate personnel assignments/,
  )
})

test('Validation Agent combines deterministic grounding checks with its structured review', async () => {
  assert.deepEqual(inspectSpecialistOutputs(goodFindings, approvedFaqs), [])
  const accepted = { approved: true, concerns: [], summary: 'All specialist output is complete and supported.' }
  assert.deepEqual(await validateFindings(modelReturning(accepted), goodFindings, approvedFaqs), accepted)
  const unsupported = {
    ...goodFindings,
    resolution: { available: true, matches: [{ faqId: 'wifi-secure', excerpts: ['Power-cycle the network access point.'] }] },
  }
  const rejected = await validateFindings(modelReturning(accepted), unsupported, approvedFaqs)
  assert.equal(rejected.approved, false)
  assert.ok(rejected.concerns.some((concern) => concern.includes('not supported by configured FAQ content')))

  const mismatchedRouting = { ...goodFindings, routing: { ...goodFindings.routing, department: 'Engineering' } }
  assert.ok(inspectSpecialistOutputs(mismatchedRouting, approvedFaqs).some((concern) => concern.includes('Routing is incomplete or unsupported')))
  const unsupportedAssignee = { ...goodFindings, routing: { ...goodFindings.routing, assignedTo: 'Network Operations (Invented Person)' } }
  assert.ok(inspectSpecialistOutputs(unsupportedAssignee, approvedFaqs).some((concern) => concern.includes('Routing is incomplete or unsupported')))
})
