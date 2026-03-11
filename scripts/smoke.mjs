import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'

const port = 3010
const baseUrl = `http://127.0.0.1:${port}`

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForServer(timeoutMs = 60000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/api/recipes`)
      if ([200, 500].includes(res.status)) {
        return
      }
    } catch {
      // keep polling
    }
    await wait(1000)
  }
  throw new Error('Timed out waiting for dev server')
}

async function checkJsonEndpoint(path, allowedStatuses) {
  const res = await fetch(`${baseUrl}${path}`)
  assert.ok(
    allowedStatuses.includes(res.status),
    `${path} returned ${res.status}, expected one of ${allowedStatuses.join(', ')}`
  )

  const body = await res.text()
  assert.doesNotThrow(() => JSON.parse(body), `${path} did not return valid JSON`)
}

const dev = spawn('npm', ['run', 'dev', '--', '-p', String(port)], {
  stdio: 'inherit',
  env: process.env,
})

try {
  await waitForServer()
  await checkJsonEndpoint('/api/recipes', [200, 500])
  await checkJsonEndpoint('/api/admin/check', [200, 401])
  console.log('Smoke checks passed')
} finally {
  dev.kill('SIGTERM')
  await wait(1000)
  if (!dev.killed) {
    dev.kill('SIGKILL')
  }
}
