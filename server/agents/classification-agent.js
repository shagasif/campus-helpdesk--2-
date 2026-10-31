import { UNTRUSTED_CONTENT_RULE, classificationSchema, issueContext, requireObject, requireText } from './shared.js'
import { CATEGORIES, ISSUE_TYPES } from '../config.js'

export async function classifyIssue(model, input) {
  const output = requireObject(await model.generateJson({
    systemInstruction:
      `You are the complaint classification specialist. Choose the most fitting broad issueType and the closest existing helpdesk category. Use only the supplied choices; do not invent a category. ${UNTRUSTED_CONTENT_RULE}`,
    prompt: `Allowed broad types: ${ISSUE_TYPES.join(', ')}. Allowed categories: ${CATEGORIES.join(' | ')}.\nIssue data (JSON): ${issueContext(input)}`,
    schema: classificationSchema,
  }), 'Classification')
  if (!ISSUE_TYPES.includes(output.issueType) || !CATEGORIES.includes(output.category)) {
    throw new Error('Classification agent returned an unsupported issue type or category.')
  }
  output.reason = requireText(output.reason, 'Classification')
  return output
}
