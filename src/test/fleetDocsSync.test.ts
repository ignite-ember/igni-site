/**
 * `src/docs/content/fleet/` is igni__cloudvm's generated documentation, copied —
 * no longer hand-authored here (Phase 3 of the docs-versioning plan). With an
 * igni__cloudvm checkout beside this repository (or at `IGNI_CLOUDVM_DIR`) this
 * fails when the copies differ from what igni__cloudvm generates; run
 * `node scripts/sync-docs.mjs fleet`. Without one (as in this repository's CI)
 * the comparison is skipped and only the copies' own consistency is checked.
 * Note igni__cloudvm's default branch is `master`.
 */
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { fleetDiff, fleetDir, fleetSourceDir, fleetVersions } from '../../scripts/sync-docs.mjs'
import { DOCS, docPackage } from '../docs/docsManifest'

const source = fleetSourceDir(fleetDir())
const checkout = fleetVersions(source).length > 0

describe('the fleet pages', () => {
  it.skipIf(!checkout)('are what the igni__cloudvm checkout generates', () => {
    for (const version of fleetVersions(source)) {
      const { changed, removed } = fleetDiff(version, source)
      expect({ version, changed, removed }, 'run node scripts/sync-docs.mjs fleet').toEqual({
        version,
        changed: [],
        removed: [],
      })
    }
  })

  it('are every article the manifest names for the latest version, and no other', () => {
    const latest = docPackage('fleet')!.versions[0]
    const dir = join(__dirname, '..', 'docs', 'content', 'fleet', latest)
    const onDisk = new Set(readdirSync(dir).filter((f) => f.endsWith('.md')))
    const wanted = new Set(DOCS.filter((d) => d.package === 'fleet').map((d) => `${d.slug}.md`))
    expect(onDisk).toEqual(wanted)
    for (const f of wanted) expect(existsSync(join(dir, f)), f).toBe(true)
  })
})
