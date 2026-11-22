/**
 * Bring a package's documentation into the site, per version.
 *
 *     node scripts/sync-docs.mjs sdk              # copy the SDK docs from an
 *     node scripts/sync-docs.mjs sdk --check      #   igni-sdk checkout (or --check)
 *     node scripts/sync-docs.mjs <pkg> snapshot <version>
 *                                                 # freeze a new version folder
 *
 * Phase 2 of the docs-versioning plan generalised `sync-sdk-docs.mjs` into
 * this. There are two kinds of documentation package:
 *
 *  - **The SDK** (`sdk`) is generated in igni-sdk (`make sdk-docs`, into
 *    `docs/site/`) and copied here into `src/docs/sdk/`, the way igni-core's
 *    published contracts are copied in. That generator does not version its
 *    output — it emits the current release — so the copy stays flat under
 *    `src/docs/sdk/` and carries the per-package version in its `index.json`.
 *    `src/test/sdkDocsSync.test.ts` runs the `--check` when a checkout is there.
 *
 *  - **The hand-written packages** (core, app, server, fleet, …) are authored
 *    in this repository under `src/docs/content/<package>/<version>/`. A
 *    release freezes a new snapshot: `snapshot <version>` copies the current
 *    latest folder to a new version folder (which is then edited for the new
 *    release and never touched again). Until the docs move next to their code
 *    (Phase 3), this is the release-time stamping step. See `src/docs/README.md`.
 */

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative, resolve } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

// ── The SDK: copy from an igni-sdk checkout ───────────────────────────

/** Where the SDK copies live. */
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

function syncSdk(argv) {
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

// ── The hand-written packages: freeze a version snapshot ──────────────

const CONTENT = join(ROOT, 'src/docs/content')

/** The versions of a hand-written package, newest-first, from its content
 *  folders — the folder names, sorted the way directory listing gives them
 *  then reversed is not reliable, so this is only used to find "latest" as
 *  the single current entry callers pass explicitly. */
function versionFolders(pkg) {
  const dir = join(CONTENT, pkg)
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
}

/**
 * Freeze a new version: copy `content/<pkg>/<from>` to `content/<pkg>/<to>`.
 * Refuses to overwrite an existing snapshot — snapshots are immutable.
 */
export function snapshot(pkg, to, from) {
  const existing = versionFolders(pkg)
  if (existing.length === 0) {
    console.error(`no documentation package "${pkg}" under src/docs/content/`)
    return 2
  }
  const source = from ?? existing[0]
  if (!existsSync(join(CONTENT, pkg, source))) {
    console.error(`no snapshot src/docs/content/${pkg}/${source} to copy from`)
    return 2
  }
  const dest = join(CONTENT, pkg, to)
  if (existsSync(dest)) {
    console.error(`src/docs/content/${pkg}/${to} already exists; snapshots are immutable`)
    return 1
  }
  cpSync(join(CONTENT, pkg, source), dest, { recursive: true })
  console.log(`froze src/docs/content/${pkg}/${to} from ${source}`)
  console.log(`next: prepend '${to}' to ${pkg}'s \`versions\` in src/docs/docsManifest.ts,`)
  console.log(`      edit the prose under src/docs/content/${pkg}/${to}/, then run \`npm run sitemap\``)
  return 0
}

export function main(argv = process.argv.slice(2)) {
  const [pkg, ...rest] = argv
  if (!pkg) {
    console.error('usage: sync-docs.mjs <package> [--check] | <package> snapshot <version>')
    return 2
  }
  if (pkg === 'sdk') return syncSdk(rest)
  if (rest[0] === 'snapshot') {
    const version = rest[1]
    if (!version) {
      console.error('usage: sync-docs.mjs <package> snapshot <version>')
      return 2
    }
    return snapshot(pkg, version, rest[2])
  }
  console.error(`nothing to sync for "${pkg}"; it is authored in this repository. Use \`${pkg} snapshot <version>\` to freeze a release.`)
  return 2
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = main()
}
