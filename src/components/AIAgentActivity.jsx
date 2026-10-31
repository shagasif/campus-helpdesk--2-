const AGENT_LABELS = {
  manager: 'Manager Agent',
  classification: 'Classification Agent',
  priority: 'Priority Agent',
  resolution: 'Resolution Agent',
  routing: 'Routing Agent',
  validation: 'Validation Agent',
}

const AGENT_ERROR_HELP = {
  gemini_not_configured: 'Add GEMINI_API_KEY to the project-root .env file, then restart the backend.',
  gemini_invalid_api_key: 'Gemini rejected the key. Check GEMINI_API_KEY in the project-root .env file, then restart the backend.',
  gemini_access_denied: 'Gemini denied access. Enable the Generative Language API and review API-key restrictions.',
  gemini_model_not_found: 'The configured model is unavailable for this key. Check GEMINI_MODEL in .env.',
  gemini_quota_exceeded: 'Gemini quota or rate limit was reached. Check the project quota and try again later.',
  gemini_invalid_request: 'Gemini rejected the request format. Check the configured model and structured-output support.',
  gemini_provider_unavailable: 'Gemini is temporarily unavailable. Try again shortly.',
  gemini_unavailable: 'The backend could not reach Gemini. Check the server connection and try again.',
  gemini_invalid_response: 'Gemini returned an invalid response. Try again; if it persists, check the configured model.',
  gemini_request_failed: 'Gemini rejected the request. Check the backend configuration and provider response.',
}

function agentResult(agent) {
  const output = agent.output
  if (!output) {
    if (!agent.errorCode) return 'Waiting for work.'
    return `${AGENT_ERROR_HELP[agent.errorCode] || 'The agent could not complete its task.'} (${agent.errorCode})`
  }
  switch (agent.name) {
    case 'manager':
      return output.summary || output.understanding || 'Plan prepared.'
    case 'classification':
      return `${output.issueType} · ${output.category}. ${output.reason}`
    case 'priority':
      return `${output.priority}. ${output.reason} ${output.deadlineSignal}`
    case 'resolution':
      return output.available
        ? output.matches.map((match) => match.excerpts.join(' ')).join(' ')
        : 'No verified FAQ source matched; no troubleshooting advice was generated.'
    case 'routing':
      return `${output.department} · ${output.team}. ${output.reason}`
    case 'validation':
      return `${output.approved ? 'Approved' : 'Blocked'}: ${output.summary}${output.concerns.length ? ` ${output.concerns.join(' ')}` : ''}`
    default:
      return 'No result.'
  }
}

export default function AIAgentActivity({ workflows = [] }) {
  return (
    <section className="ai-activity-card" aria-labelledby="ai-activity-title">
      <div className="ai-activity-heading">
        <div>
          <h2 id="ai-activity-title">AI Agent Activity</h2>
          <p>Live workflow state and recorded agent results</p>
        </div>
      </div>
      {workflows.length === 0 ? (
        <p className="ai-empty-state">No AI workflows have been run for this account.</p>
      ) : (
        <div className="ai-workflow-list">
          {workflows.map((workflow) => (
            <article key={workflow.id} className="ai-workflow-item">
              <header className="ai-workflow-header">
                <div>
                  <strong>Workflow {workflow.id.slice(0, 8)}</strong>
                  <span>{new Date(workflow.createdAt).toLocaleString()}</span>
                </div>
                <span className={`ai-state ai-state-${workflow.status}`}>{workflow.status.replaceAll('_', ' ')}</span>
              </header>
              <p className="ai-current-task"><strong>Current task:</strong> {workflow.currentTask}</p>
              {workflow.taskPlan && (
                <p className="ai-manager-plan"><strong>Manager plan:</strong> four independent specialist tasks delegated.</p>
              )}
              <ul className="ai-agent-list">
                {workflow.agents.map((agent) => (
                  <li key={agent.name} className="ai-agent-row">
                    <div className="ai-agent-topline">
                      <strong>{AGENT_LABELS[agent.name] || agent.name}</strong>
                      <span className={`ai-state ai-state-${agent.status}`}>{agent.status}</span>
                    </div>
                    <p>{agentResult(agent)}</p>
                  </li>
                ))}
              </ul>
              {workflow.events?.length > 0 && (
                <details className="ai-history">
                  <summary>Workflow history ({workflow.events.length} events)</summary>
                  <ol>
                    {workflow.events.slice(-8).map((event, index) => (
                      <li key={`${event.type}-${index}`}>
                        <time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleTimeString()}</time> {event.message}
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
