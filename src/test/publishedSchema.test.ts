/**
 * igni's extension manifest schema is published at the URL every
 * manifest names in `$schema`.
 *
 * `igni ext init` writes `"$schema":
 * "https://ignite-ember.sh/schema/extension-manifest-1.json"` so an
 * editor completes and checks the manifest as it is typed. That URL
 * pointed at nothing. The file is `docs/extension-manifest.schema.json`
 * in igni's repository, copied to `public/schema/` here; and the deploy
 * uploaded only the top level of `dist/`, so it has to say so for
 * `schema/` too.
 */

import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const URL = 'https://ignite-ember.sh/schema/extension-manifest-1.json'
const FILE = join(process.cwd(), 'public/schema/extension-manifest-1.json')

describe('the extension manifest schema', () => {
  it('is in public/ under the path its $id names', () => {
    const schema = JSON.parse(readFileSync(FILE, 'utf8'))
    expect(schema.$id).toBe(URL)
    expect(schema.title).toBe('igni extension manifest')
  })

  it('is uploaded by the deploy, as JSON', () => {
    const dist = mkdtempSync(join(tmpdir(), 'site-dist-'))
    writeFileSync(join(dist, 'index.html'), '<html></html>')
    mkdirSync(join(dist, 'assets'))
    mkdirSync(join(dist, 'schema'))
    cpSync(FILE, join(dist, 'schema/extension-manifest-1.json'))
    const out = execFileSync('bash', ['scripts/deploy-site.sh', 'bucket', 'urlmap', 'ignite-ember.sh'], {
      env: { ...process.env, DRY_RUN: '1', DIST: dist },
      encoding: 'utf8',
    })
    const upload = out.split('\n').find((line) => line.includes('gs://bucket/schema/extension-manifest-1.json'))
    expect(upload).toBeDefined()
    expect(upload).toContain('application/schema+json')
  })
})
