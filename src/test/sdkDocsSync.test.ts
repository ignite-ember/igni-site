/**
 * `src/docs/sdk/<version>/` is igni-sdk's generated documentation, one
 * snapshot per release, copied — never edited here. With an igni-sdk
 * checkout beside this repository (or at `IGNI_SDK_DIR`) this fails when
 * the latest snapshot differs from what igni-sdk generates; run
 * `node scripts/sync-docs.mjs sdk`. Without one (as in this repository's
 * CI) the comparison is skipped and only the snapshots' own consistency is
 * checked.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  diff,
  generatedVersion,
  latestSdkDir,
  sdkDir,
  sdkVersions,
  sourceDir,
  TARGET,
} from '../../scripts/sync-docs.mjs'

const checkout = existsSync(join(sourceDir(sdkDir()), 'index.json'))

describe('the SDK pages', () => {
  it.skipIf(!checkout)('are what the igni-sdk checkout generates, in the latest snapshot', () => {
    expect(generatedVersion(sourceDir()), 'the checkout is a different release than the latest snapshot').toBe(
      sdkVersions()[0],
    )
    const { changed, removed } = diff()
    expect({ changed, removed }, 'run node scripts/sync-docs.mjs sdk').toEqual({ changed: [], removed: [] })
  })

  it('compare the checkout against the latest snapshot', () => {
    expect(latestSdkDir()).toBe(join(TARGET, sdkVersions()[0]))
  })

  it('are one snapshot per release, newest first, and nothing else', () => {
    const versions = sdkVersions()
    expect(versions).toEqual(expect.arrayContaining(['0.2.0', '0.2.1', '0.2.2', '0.2.3']))
    expect([...versions].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))).toEqual(versions)
    // No flat copy left from before the snapshots.
    expect(existsSync(join(TARGET, 'index.json'))).toBe(false)
  })

  it.each(sdkVersions().map((v) => [v] as const))('%s is the release its index says', (version) => {
    expect(generatedVersion(join(TARGET, version))).toBe(version)
  })

  it.each(sdkVersions().map((v) => [v] as const))('%s has every file its index names', (version) => {
    const dir = join(TARGET, version)
    const index = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')) as { pages: { file: string }[] }
    expect(index.pages.length).toBeGreaterThan(30)
    for (const p of index.pages) expect(existsSync(join(dir, p.file)), p.file).toBe(true)
  })
})
