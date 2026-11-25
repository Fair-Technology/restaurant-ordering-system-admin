import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('staticwebapp.config.json CSP', () => {
  it('allows direct blob storage uploads in connect-src', () => {
    const config = JSON.parse(
      readFileSync(path.join(__dirname, '../../staticwebapp.config.json'), 'utf8'),
    )
    const csp: string = config.globalHeaders['Content-Security-Policy']
    const connectSrc = csp.split(';').map((d) => d.trim()).find((d) => d.startsWith('connect-src'))
    expect(connectSrc).toContain('blob.core.windows.net')
  })
})
