import { PRIORITIES } from '../config.js'
import { UNTRUSTED_CONTENT_RULE, issueContext, prioritySchema, requireObject, requireText } from './shared.js'

export async function assessPriority(model, input) {
  const output = requireObject(await model.generateJson({
    systemInstruction:
      `You are the urgency specialist. Assign Low, Medium, High, or Critical based only on stated impact, urgency, and any supplied deadline. Critical requires immediate safety, security, or campus-wide service risk. Treat the student's selected priority as a request, not proof. Explain the decision and the deadline signal. ${UNTRUSTED_CONTENT_RULE}`,
    prompt: `Issue data (JSON): ${issueContext(input)}`,
    schema: prioritySchema,
  }), 'Priority')
  if (!PRIORITIES.includes(output.priority)) throw new Error('Priority agent returned an unsupported priority.')
  output.reason = requireText(output.reason, 'Priority')
  output.deadlineSignal = requireText(output.deadlineSignal, 'Priority')
  return output
}
