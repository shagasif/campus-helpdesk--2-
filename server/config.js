import { CATEGORIES, DEPARTMENTS, FAQS, PRIORITIES, ROUTING_ASSIGNMENTS, STATUSES, TECHNICIANS } from '../shared/helpdesk-data.js'

export { CATEGORIES, DEPARTMENTS, PRIORITIES, STATUSES }
export const ISSUE_TYPES = ['technical', 'academic', 'finance', 'administrative']
export { ROUTING_ASSIGNMENTS }
export const SUPPORT_TEAMS = TECHNICIANS
export const ROUTING_TEAMS = ['Unassigned', ...ROUTING_ASSIGNMENTS.map(({ team }) => team)]
export const FAQ_SOURCES = FAQS.map((faq, index) => ({
  ...faq,
  id: ['wifi-secure', 'password-reset', 'dorm-keycard', 'campus-printing'][index],
  verified: false,
  sourceUrl: null,
}))

export const AGENT_NAMES = [
  'manager',
  'classification',
  'priority',
  'resolution',
  'routing',
  'validation',
]

export const MAX_INPUT_LENGTH = 4000
