import { FAQ_SOURCES } from '../config.js'
import { UNTRUSTED_CONTENT_RULE, createResolutionSchema, issueContext, requireObject, verifiedFAQSources } from './shared.js'

export async function suggestResolution(model, input, faqSources = FAQ_SOURCES) {
  const approvedSources = verifiedFAQSources(faqSources)
  const faqText = approvedSources.map(({ id, question, answer, sourceUrl }) => ({ id, question, answer, sourceUrl }))
  const output = requireObject(await model.generateJson({
    systemInstruction:
      `You are the resolution specialist. You may only select relevant supplied, institution-approved FAQ IDs and copy exact, contiguous excerpts from those FAQ answers. Do not paraphrase, add a troubleshooting step, infer a policy, or use outside knowledge. If no approved FAQ source applies, return available=false and matches=[]. ${UNTRUSTED_CONTENT_RULE}`,
    prompt: `Issue data (JSON): ${issueContext(input)}\nApproved FAQ source text (JSON): ${JSON.stringify(faqText)}`,
    schema: createResolutionSchema(faqSources),
  }), 'Resolution')
  if (typeof output.available !== 'boolean' || !Array.isArray(output.matches)) {
    throw new Error('Resolution agent returned an invalid response.')
  }
  const faqById = new Map(approvedSources.map((faq) => [faq.id, faq]))
  const seen = new Set()
  for (const match of output.matches) {
    if (!match || !faqById.has(match.faqId) || seen.has(match.faqId) || !Array.isArray(match.excerpts) || !match.excerpts.length) {
      throw new Error('Resolution agent referenced an invalid FAQ.')
    }
    seen.add(match.faqId)
    for (const excerpt of match.excerpts) {
      if (typeof excerpt !== 'string' || !excerpt.trim() || !faqById.get(match.faqId).answer.includes(excerpt)) {
        throw new Error('Resolution agent returned advice that is not an exact approved FAQ excerpt.')
      }
    }
  }
  if (output.available !== (output.matches.length > 0)) {
    throw new Error('Resolution agent returned inconsistent FAQ availability.')
  }
  return output
}
