import { CATEGORIES, ISSUE_TYPES, PRIORITIES, ROUTING_TEAMS, FAQ_SOURCES } from '../config.js'
import { configuredRoute, UNTRUSTED_CONTENT_RULE, requireObject, requireText, validationSchema, verifiedFAQSources } from './shared.js'

export function inspectSpecialistOutputs(findings, faqSources = FAQ_SOURCES) {
  const issues = []
  if (!ISSUE_TYPES.includes(findings.classification?.issueType) ||
      !CATEGORIES.includes(findings.classification?.category) ||
      !findings.classification?.reason?.trim()) issues.push('Classification is incomplete or unsupported.')
  if (!PRIORITIES.includes(findings.priority?.priority) ||
      !findings.priority?.reason?.trim() || !findings.priority?.deadlineSignal?.trim()) {
    issues.push('Priority is incomplete or unsupported.')
  }
  const route = configuredRoute(findings.routing?.department, findings.routing?.team)
  if (!route || !ROUTING_TEAMS.includes(findings.routing?.team) ||
      findings.routing?.assignedTo !== route.assignedTo ||
      typeof findings.routing?.reason !== 'string' || !findings.routing.reason.trim()) {
    issues.push('Routing is incomplete or unsupported.')
  }
  const faqById = new Map(verifiedFAQSources(faqSources).map((faq) => [faq.id, faq]))
  if (typeof findings.resolution?.available !== 'boolean' || !Array.isArray(findings.resolution?.matches)) {
    issues.push('Resolution is missing verified FAQ references.')
  } else {
    for (const match of findings.resolution.matches) {
      const faq = faqById.get(match?.faqId)
      if (!faq || !Array.isArray(match.excerpts) || !match.excerpts.length ||
          match.excerpts.some((excerpt) => typeof excerpt !== 'string' || !faq.answer.includes(excerpt))) {
        issues.push('Resolution contains a recommendation not supported by configured FAQ content.')
        break
      }
    }
    if (findings.resolution.available !== (findings.resolution.matches.length > 0)) {
      issues.push('Resolution availability conflicts with its FAQ references.')
    }
  }
  return issues
}

export async function validateFindings(model, findings, faqSources = FAQ_SOURCES) {
  const deterministicIssues = inspectSpecialistOutputs(findings, faqSources)
  const output = requireObject(await model.generateJson({
    systemInstruction:
      `You are the validation specialist. Check missing or conflicting fields and confirm that resolution recommendations are supported only by exact configured FAQ excerpts supplied. Flag unsupported advice, invented departments, invalid values, and contradictions. Do not add recommendations. ${UNTRUSTED_CONTENT_RULE}`,
    prompt: `Specialist outputs to validate (JSON): ${JSON.stringify(findings)}`,
    schema: validationSchema,
  }), 'Validation')
  if (typeof output.approved !== 'boolean' || !Array.isArray(output.concerns)) {
    throw new Error('Validation agent returned an invalid response.')
  }
  output.summary = requireText(output.summary, 'Validation')
  if (output.concerns.some((concern) => typeof concern !== 'string' || !concern.trim())) {
    throw new Error('Validation agent returned invalid concerns.')
  }
  output.concerns = [...new Set([...deterministicIssues, ...output.concerns])]
  output.approved = output.approved && deterministicIssues.length === 0 && output.concerns.length === 0
  return output
}
