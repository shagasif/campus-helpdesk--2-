import { setTimeout as delay } from 'node:timers/promises'

export class GeminiError extends Error {
  constructor(message, code = 'gemini_request_failed', retryable = false) {
    super(message)
    this.name = 'GeminiError'
    this.code = code
    this.retryable = retryable
  }
}

function getProviderError(status, payload) {
  const providerMessage = `${payload?.error?.status || ''} ${payload?.error?.message || ''}`.toLowerCase()
  if (status === 401 || /api[_ ]key[_ ]invalid|api key not valid/.test(providerMessage)) {
    return { code: 'gemini_invalid_api_key', message: 'Gemini rejected the API key. Verify GEMINI_API_KEY in the project-root .env file.' }
  }
  if (status === 403) {
    return { code: 'gemini_access_denied', message: 'Gemini denied access. Check that the Generative Language API is enabled and the key has no incompatible restrictions.' }
  }
  if (status === 404) {
    return { code: 'gemini_model_not_found', message: 'The configured Gemini model is unavailable. Check GEMINI_MODEL against the models enabled for this API key.' }
  }
  if (status === 429) {
    return { code: 'gemini_quota_exceeded', message: 'Gemini quota or rate limit was reached. Check the project quota and try again later.' }
  }
  if (status === 400) {
    return { code: 'gemini_invalid_request', message: 'Gemini rejected the request format. Check the configured model and structured-output schema.' }
  }
  if (status >= 500) {
    return { code: 'gemini_provider_unavailable', message: `Gemini is temporarily unavailable (HTTP ${status}). Try again shortly.` }
  }
  return { code: 'gemini_request_failed', message: `Gemini rejected the request (HTTP ${status}).` }
}

export class GeminiClient {
  constructor({ apiKey, model = 'gemini-2.5-flash', fetchImpl = fetch, requestsPerMinute = 8 } = {}) {
    this.apiKey = apiKey
    this.model = model
    this.fetchImpl = fetchImpl
    this.requestsPerMinute = Math.max(1, Number(requestsPerMinute) || 8)
    this.requestTimes = []
    this.queue = Promise.resolve()
  }

  async waitForQuota() {
    let release
    const previous = this.queue
    this.queue = new Promise((resolve) => { release = resolve })
    await previous
    try {
      while (true) {
        const now = Date.now()
        this.requestTimes = this.requestTimes.filter((time) => now - time < 60_000)
        if (this.requestTimes.length < this.requestsPerMinute) {
          this.requestTimes.push(now)
          return
        }
        await delay(Math.max(100, 60_000 - (now - this.requestTimes[0])))
      }
    } finally {
      release()
    }
  }

  async generateJson({ systemInstruction, prompt, schema }) {
    if (!this.apiKey) throw new GeminiError('Gemini is not configured on the server.', 'gemini_not_configured')
    let lastError
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await this.waitForQuota()
      try {
        const response = await this.fetchImpl(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-goog-api-key': this.apiKey },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemInstruction }] },
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json', responseSchema: schema },
            }),
            signal: AbortSignal.timeout(30_000),
          },
        )
        if (!response.ok) {
          let payload = null
          try {
            payload = await response.json()
          } catch {
            payload = null
          }
          const retryable = response.status === 429 || response.status >= 500
          const providerError = getProviderError(response.status, payload)
          if (!retryable) throw new GeminiError(providerError.message, providerError.code)
          const retryAfter = Number(response.headers.get('retry-after'))
          const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
            ? Math.min(retryAfter * 1000, 30_000)
            : Math.min(1000 * (2 ** attempt), 8000)
          lastError = new GeminiError(providerError.message, providerError.code, true)
          if (attempt < 2) await delay(waitMs)
          continue
        }
        const payload = await response.json()
        const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('')
        if (typeof text !== 'string' || !text.trim()) {
          throw new GeminiError('Gemini returned an empty structured response.', 'gemini_invalid_response')
        }
        try {
          return JSON.parse(text)
        } catch {
          throw new GeminiError('Gemini returned malformed JSON.', 'gemini_invalid_response')
        }
      } catch (error) {
        if (error instanceof GeminiError && !error.retryable) throw error
        const retryable = error instanceof GeminiError || error.name === 'TimeoutError' || error.name === 'TypeError'
        if (!retryable || attempt === 2) {
          if (error instanceof GeminiError) throw error
          throw new GeminiError('Gemini could not be reached.', 'gemini_unavailable', false)
        }
        lastError = error instanceof GeminiError
          ? error
          : new GeminiError('Gemini could not be reached.', 'gemini_unavailable', true)
        await delay(Math.min(1000 * (2 ** attempt), 8000))
      }
    }
    throw lastError || new GeminiError('Gemini retries were exhausted.', 'gemini_unavailable')
  }
}
