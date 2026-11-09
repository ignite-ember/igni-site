/**
 * Copy the SDKs' documentation pages from an igni-sdk checkout.
 *
 *     node scripts/sync-sdk-docs.mjs            # from ../igni-sdk, or IGNI_SDK_DIR
 *     node scripts/sync-sdk-docs.mjs --check    # exit 1 if a copy differs
 *
 * igni-sdk generates them (`make sdk-docs`, into its `docs/site/`): each
 * package README cut into pages, igni-client's reference from igni-core's
 * RPC contract, and igni-service's and igni-extension's from their code,
 * with an `index.json` saying what each page is. This site keeps copies in
 * `src/docs/sdk/` and renders them under `/docs/sdk/` — the same way
 * igni-sdk keeps copies of the contracts igni-core publishes. Nothing in
 * `src/docs/sdk/` is edited here: change igni-sdk, regenerate, sync.
 *
 * `src/test/sdkDocsSync.test.ts` runs the check when a checkout is there.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative, resolve } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Where the copies live. */
export const TARGET = join(ROOT, 'src/docs/sdk')

/** The igni-sdk checkout: `IGNI_SDK_DIR`, else `../igni-sdk` beside this repository. */
export function sdkDir() {
  return resolve(ROOT, process.env.IGNI_SDK_DIR || '../igni-sdk')
}

/** The generated pages in that checkout. */
export function sourceDir(dir = sdkDir()) {
  return join(dir, 'docs/site')
}

/** Every file under `dir`, as paths relative to it, sorted. */
function files(dir) {
  if (!existsSync(dir)) return []
  const out = []
  const walk = (at) => {
    for (const entry of readdirSync(at, { withFileTypes: true })) {
      const full = join(at, entry.name)
      if (entry.isDirectory()) walk(full)
      else out.push(relative(dir, full))
    }
  }
  walk(dir)
  return out.sort()
}

/**
 * What differs between the checkout and the copies: files to add or
 * change, and copies igni-sdk no longer generates.
 */
export function diff(source = sourceDir()) {
  const wanted = files(source)
  const have = new Set(files(TARGET))
  const changed = wanted.filter(
    (f) => !have.has(f) || readFileSync(join(source, f), 'utf8') !== readFileSync(join(TARGET, f), 'utf8'),
  )
  const removed = [...have].filter((f) => !wanted.includes(f))
  return { changed, removed }
}

export function main(argv = process.argv.slice(2)) {
  const source = sourceDir()
  if (!existsSync(join(source, 'index.json'))) {
    console.error(`no generated SDK docs at ${source} (set IGNI_SDK_DIR to an igni-sdk checkout; run make sdk-docs there)`)
    return 2
  }
  const check = argv.includes('--check')
  const { changed, removed } = diff(source)
  if (!check) {
    for (const f of changed) {
      mkdirSync(dirname(join(TARGET, f)), { recursive: true })
      writeFileSync(join(TARGET, f), readFileSync(join(source, f), 'utf8'))
    }
    for (const f of removed) rmSync(join(TARGET, f))
  }
  for (const f of changed) console.log(`${check ? 'stale' : 'copied'}: src/docs/sdk/${f}`)
  for (const f of removed) console.log(`${check ? 'left over' : 'removed'}: src/docs/sdk/${f}`)
  if (!check && (changed.length || removed.length)) {
    console.log('now run `npm run sitemap`: the sitemap lists every SDK page')
  }
  return check && (changed.length || removed.length) ? 1 : 0
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = main()
}
