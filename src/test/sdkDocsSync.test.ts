/**
 * `src/docs/sdk/` is igni-sdk's generated documentation, copied — never
 * edited here. With an igni-sdk checkout beside this repository (or at
 * `IGNI_SDK_DIR`) this fails when the copies differ from what igni-sdk
 * generates; run `node scripts/sync-sdk-docs.mjs`. Without one (as in
 * this repository's CI) the comparison is skipped and only the copies'
 * own consistency is checked.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { diff, sdkDir, sourceDir, TARGET } from '../../scripts/sync-sdk-docs.mjs'

const checkout = existsSync(join(sourceDir(sdkDir()), 'index.json'))

describe('the SDK pages', () => {
  it.skipIf(!checkout)('are what the igni-sdk checkout generates', () => {
    const { changed, removed } = diff()
    expect({ changed, removed }, 'run node scripts/sync-sdk-docs.mjs').toEqual({ changed: [], removed: [] })
  })

  it('are every file the copied index names, and no other', () => {
    const index = JSON.parse(readFileSync(join(TARGET, 'index.json'), 'utf8')) as { pages: { file: string }[] }
    expect(index.pages.length).toBeGreaterThan(30)
    for (const p of index.pages) expect(existsSync(join(TARGET, p.file)), p.file).toBe(true)
  })
})
