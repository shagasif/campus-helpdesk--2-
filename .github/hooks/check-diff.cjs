const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const fileEditTools = new Set([
  'apply_patch',
  'multi_replace_file_content',
  'replace_file_content',
  'write_to_file',
])

function writeOutput(output) {
  process.stdout.write(`${JSON.stringify(output)}\n`)
}

let event
try {
  event = JSON.parse(fs.readFileSync(0, 'utf8'))
} catch (error) {
  console.error('Unable to parse Copilot PostToolUse event JSON:', error.message)
  writeOutput({})
  process.exitCode = 1
}

if (process.exitCode !== 1) {
  const rawToolName = event.tool_name
  if (typeof rawToolName !== 'string') {
    console.error('Copilot PostToolUse event is missing the tool_name field.')
    writeOutput({})
    process.exitCode = 1
  } else {
    const toolName = rawToolName.split('.').pop()
    if (!fileEditTools.has(toolName)) {
      writeOutput({})
    } else {
      const result = spawnSync('git', ['diff', '--check'], {
        cwd: path.resolve(__dirname, '../..'),
        encoding: 'utf8',
      })

      if (result.error) {
        console.error('Unable to run git diff --check:', result.error.message)
        writeOutput({ additionalContext: 'The post-edit whitespace check could not run.' })
      } else if (result.status !== 0) {
        const details = (result.stdout + result.stderr).trim()
        writeOutput({ additionalContext: `git diff --check found whitespace issues:\n${details}` })
      } else {
        writeOutput({})
      }
    }
  }
}
