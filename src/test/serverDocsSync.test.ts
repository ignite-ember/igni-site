/**
 * `src/docs/content/server/` is igni-server's generated documentation, copied —
 * no longer hand-authored here (Phase 3 of the docs-versioning plan). With an
 * igni-server checkout beside this repository (or at `IGNI_SERVER_DIR`) this
 * fails when the copies differ from what igni-server generates; run
 * `node scripts/sync-docs.mjs server`. Without one (as in this repository's CI)
 * the comparison is skipped and only the copies' own consistency is checked.
 */
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { serverDiff, serverDir, serverSourceDir, serverVersions } from '../../scripts/sync-docs.mjs'
import { DOCS, docPackage } from '../docs/docsManifest'

const source = serverSourceDir(serverDir())
const checkout = serverVersions(source).length > 0

describe('the server pages', () => {
  it.skipIf(!checkout)('are what the igni-server checkout generates', () => {
    for (const version of serverVersions(source)) {
      const { changed, removed } = serverDiff(version, source)
      expect({ version, changed, removed }, 'run node scripts/sync-docs.mjs server').toEqual({
        version,
        changed: [],
        removed: [],
      })
    }
  })

  it('are every article the manifest names for the latest version, and no other', () => {
    const latest = docPackage('server')!.versions[0]
    const dir = join(__dirname, '..', 'docs', 'content', 'server', latest)
    const onDisk = new Set(readdirSync(dir).filter((f) => f.endsWith('.md')))
    const wanted = new Set(DOCS.filter((d) => d.package === 'server').map((d) => `${d.slug}.md`))
    expect(onDisk).toEqual(wanted)
    for (const f of wanted) expect(existsSync(join(dir, f)), f).toBe(true)
  })
})
