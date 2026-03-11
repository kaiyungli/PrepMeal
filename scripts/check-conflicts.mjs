import { spawnSync } from 'node:child_process'

const markers = '^(<<<<<<<|=======|>>>>>>>)'
const result = spawnSync('rg', ['-n', markers, 'src', 'scripts', 'README.md'], {
  encoding: 'utf8',
})

if (result.status === 0) {
  console.error('Merge conflict markers found:\n')
  console.error(result.stdout.trim())
  process.exit(1)
}

if (result.status === 1) {
  console.log('No merge conflict markers found.')
  process.exit(0)
}

console.error(result.stderr || 'Failed to run conflict marker check.')
process.exit(result.status ?? 2)
