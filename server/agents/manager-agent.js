import { UNTRUSTED_CONTENT_RULE, issueContext, requireObject, requireText } from './shared.js'

const planSchema = {
  type: 'OBJECT',
  properties: {
    understanding: { type: 'STRING' },
    delegations: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { agent: { type: 'STRING' }, task: { type: 'STRING' } },
        required: ['agent', 'task'],
      },
    },
  },
  required: ['understanding', 'delegations'],
}

const SPECIALISTS = ['classification', 'priority', 'resolution', 'routing']

export async function planWithManager(model, input) {
  const plan = requireObject(await model.generateJson({
    systemInstruction:
      `You are the helpdesk manager agent. Understand the student's issue and delegate four independent analyses to the named specialist agents. ${UNTRUSTED_CONTENT_RULE} Do not invent policy or resolution steps.`,
    prompt: `Issue data (JSON): ${issueContext(input)}\nReturn one concise understanding and one delegation per specialist: ${SPECIALISTS.join(', ')}.`,
    schema: planSchema,
  }), 'Manager')
  requireText(plan.understanding, 'Manager')
  if (!Array.isArray(plan.delegations) || plan.delegations.length !== SPECIALISTS.length) {
    throw new Error('Manager agent returned an incomplete task plan.')
  }
  const names = plan.delegations.map((task) => task?.agent)
  if (SPECIALISTS.some((name) => !names.includes(name)) || new Set(names).size !== SPECIALISTS.length) {
    throw new Error('Manager agent returned invalid task delegations.')
  }
  for (const delegation of plan.delegations) requireText(delegation.task, 'Manager')
  return plan
}

export function combineWithManager(findings) {
  const { classification, priority, resolution, routing } = findings
  const issueType = classification.issueType[0].toUpperCase() + classification.issueType.slice(1)
  return {
    summary: `${issueType} issue in ${classification.category}, assigned ${priority.priority} priority, routed to ${routing.department} (${routing.team}).`,
    nextSteps: resolution.available ? resolution.matches.flatMap((match) => match.excerpts) : [],
  }
}
