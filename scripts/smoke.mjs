import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createRequire } from 'node:module'
import { waitForServer, checkJsonEndpoint } from './smokeChecks.mjs'

const require = createRequire(import.meta.url)
const baseUrl = 'http://127.0.0.1:3010'
// Spawn Next directly so cleanup owns the server, not an intermediate npm shell.
// Explicit loopback binding also avoids unnecessary interface enumeration.
const dev = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '-H', '127.0.0.1', '-p', '3010'], {
  stdio: 'inherit', env: process.env,
})
let running = true
dev.once('exit', () => { running = false })
dev.once('error', () => { running = false })

// Success must be explicit, even if a child or runtime terminates early.
process.exitCode = 1
try {
  await waitForServer(baseUrl, { isRunning: () => running })
  await checkJsonEndpoint(baseUrl, '/api/recipes', [200])
  await checkJsonEndpoint(baseUrl, '/api/admin/check', [200, 401])
  console.log('Smoke checks passed')
  process.exitCode = 0
} finally {
  if (running) {
    const exited = once(dev, 'exit')
    const timer = setTimeout(() => dev.kill('SIGKILL'), 2000)
    dev.kill('SIGTERM')
    try { await exited } finally { clearTimeout(timer) }
  }
}
