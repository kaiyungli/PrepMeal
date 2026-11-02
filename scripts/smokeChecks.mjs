import assert from 'node:assert/strict'

export async function request(baseUrl, path) {
  return fetch(`${baseUrl}${path}`, { signal: AbortSignal.timeout(5000) })
}

/** @param {string} baseUrl
 * @param {{timeoutMs?: number, isRunning?: () => boolean}} [options]
 */
export async function waitForServer(baseUrl, { timeoutMs = 60000, isRunning = () => true } = {}) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (!isRunning()) throw new Error('Smoke server exited before becoming ready')
    let res
    try {
      res = await request(baseUrl, '/api/recipes')
    } catch {
      // Retry connection failures while Next starts, within a bounded deadline.
      await new Promise(resolve => setTimeout(resolve, 250))
      continue
    }
    const status = res.status
    await res.body?.cancel()
    if (status === 200) return
    if (status >= 500) throw new Error(`Recipes API returned HTTP ${status} during smoke readiness`)
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error('Timed out waiting for dev server')
}

export async function checkJsonEndpoint(baseUrl, path, allowedStatuses) {
  const res = await request(baseUrl, path)
  assert.ok(allowedStatuses.includes(res.status),
    `${path} returned ${res.status}, expected one of ${allowedStatuses.join(', ')}`)
  const body = await res.text()
  assert.doesNotThrow(() => JSON.parse(body), `${path} did not return valid JSON`)
}
