import { DEPARTMENTS, ROUTING_ASSIGNMENTS, ROUTING_TEAMS } from '../config.js'
import { configuredRoute, UNTRUSTED_CONTENT_RULE, issueContext, requireObject, requireText, routingSchema } from './shared.js'

export async function routeIssue(model, input) {
  const output = requireObject(await model.generateJson({
    systemInstruction:
      `You are the university routing specialist. Select a department/team pair only from the configured assignment pairs. If none fits, select Unassigned and a valid department. Do not output staff names, assignees, offices, or contact details; the server supplies assignees from configuration. ${UNTRUSTED_CONTENT_RULE}`,
    prompt: `Configured department/team assignments (JSON): ${JSON.stringify(ROUTING_ASSIGNMENTS.map(({ department, team }) => ({ department, team })))}.\nAllowed departments: ${DEPARTMENTS.join(' | ')}.\nAllowed teams: ${ROUTING_TEAMS.join(' | ')}.\nIssue data (JSON): ${issueContext(input)}`,
    schema: routingSchema,
  }), 'Routing')
  if (!DEPARTMENTS.includes(output.department) || !ROUTING_TEAMS.includes(output.team)) {
    throw new Error('Routing agent returned an unknown department or support team.')
  }
  if (Object.hasOwn(output, 'assignedTo')) {
    throw new Error('Routing agent must not generate personnel assignments.')
  }
  const assignment = configuredRoute(output.department, output.team)
  if (!assignment) {
    throw new Error('Routing agent selected a department/team combination not in configured routing assignments.')
  }
  output.reason = requireText(output.reason, 'Routing')
  return { ...output, assignedTo: assignment.assignedTo }
}
