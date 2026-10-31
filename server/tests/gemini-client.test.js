import assert from 'node:assert/strict'
import test from 'node:test'
import { GeminiClient, GeminiError } from '../gemini-client.js'

function providerResponse(status, payload, retryAfter) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => name === 'retry-after' ? retryAfter || null : null },
    async json() { return payload },
  }
}

test('Gemini client sends structured JSON configuration and keeps the key out of the URL', async () => {
  let observed
  const client = new GeminiClient({
    apiKey: 'secret-for-test-only',
    fetchImpl: async (url, options) => {
      observed = { url, options }
      return providerResponse(200, {
        candidates: [{ content: { parts: [{ text: '{"approved":true}' }] } }],
      })
    },
  })
  const result = await client.generateJson({
    systemInstruction: 'Return structured data.',
    prompt: 'Test request.',
    schema: { type: 'OBJECT', properties: { approved: { type: 'BOOLEAN' } }, required: ['approved'] },
  })
  assert.deepEqual(result, { approved: true })
  assert.equal(observed.options.headers['x-goog-api-key'], 'secret-for-test-only')
  assert.equal(observed.url.includes('secret-for-test-only'), false)
  assert.equal(JSON.parse(observed.options.body).generationConfig.responseMimeType, 'application/json')
})

test('Gemini client retries a quota response and surfaces missing key configuration', async () => {
  let calls = 0
  const client = new GeminiClient({
    apiKey: 'test-key',
    fetchImpl: async () => {
      calls += 1
      return calls === 1
        ? providerResponse(429, {}, '0.001')
        : providerResponse(200, { candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] })
    },
  })
  assert.deepEqual(await client.generateJson({ systemInstruction: 's', prompt: 'p', schema: {} }), { ok: true })
  assert.equal(calls, 2)

  const unconfigured = new GeminiClient({ fetchImpl: async () => { throw new Error('Must not call provider') } })
  await assert.rejects(
    unconfigured.generateJson({ systemInstruction: 's', prompt: 'p', schema: {} }),
    (error) => error instanceof GeminiError && error.code === 'gemini_not_configured',
  )
})

test('Gemini client identifies invalid keys, denied access, missing models, and invalid requests', async () => {
  const cases = [
    [400, { error: { status: 'INVALID_ARGUMENT', message: 'API_KEY_INVALID: API key not valid.' } }, 'gemini_invalid_api_key'],
    [403, { error: { status: 'PERMISSION_DENIED', message: 'API access is denied.' } }, 'gemini_access_denied'],
    [404, { error: { status: 'NOT_FOUND', message: 'Model not found.' } }, 'gemini_model_not_found'],
    [400, { error: { status: 'INVALID_ARGUMENT', message: 'Invalid response schema.' } }, 'gemini_invalid_request'],
  ]

  for (const [status, payload, expectedCode] of cases) {
    const client = new GeminiClient({
      apiKey: 'test-key',
      fetchImpl: async () => providerResponse(status, payload),
    })
    await assert.rejects(
      client.generateJson({ systemInstruction: 's', prompt: 'p', schema: {} }),
      (error) => error instanceof GeminiError && error.code === expectedCode,
    )
  }
})
