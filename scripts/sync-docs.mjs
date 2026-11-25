/**
 * Bring a package's documentation into the site, per version.
 *
 *     node scripts/sync-docs.mjs sdk              # copy the SDK docs from an
 *     node scripts/sync-docs.mjs sdk --check      #   igni-sdk checkout (or --check)
 *     node scripts/sync-docs.mjs server           # copy the server docs from an
 *     node scripts/sync-docs.mjs server --check   #   igni-server checkout (or --check)
 *     node scripts/sync-docs.mjs fleet            # copy the Fleet docs from an
 *     node scripts/sync-docs.mjs fleet --check    #   igni__cloudvm checkout (or --check)
 *     node scripts/sync-docs.mjs <pkg> snapshot <version>
 *                                                 # freeze a new version folder
 *
 * Phase 2 of the docs-versioning plan generalised `sync-sdk-docs.mjs` into
 * this. There are two kinds of documentation package:
 *
 *  - **Generated-next-to-code** (`sdk`, `server`, `fleet`) is generated in the
 *    package's own repository and copied here. The SDK (`sdk`) is generated in
 *    igni-sdk (`make sdk-docs`, into `docs/site/`) and copied into
 *    `src/docs/sdk/<version>/`, the way igni-core's published contracts are
 *    copied in; its generator emits the current release flat and carries the
 *    version in its `index.json` (one for all six packages, released together),
 *    which names the folder. `--check` compares the checkout with the latest
 *    snapshot; a past release's folder is never written again. The server (`server`) is generated in igni-server
 *    (`make docs-site`, into `docs/site/server/<version>/`) and copied into
 *    `src/docs/content/server/<version>/`; Fleet (`fleet`) is generated the same
 *    way in igni__cloudvm (`python3 tools/site_docs.py`, into
 *    `docs/site/fleet/<version>/`) and copied into `src/docs/content/fleet/<version>/`
 *    — the same hand-written layout the site already renders, so nothing
 *    downstream changes; each generator stamps the current release into its own
 *    version folder, which lands here as that release's frozen snapshot. Only the
 *    version folders the checkout emits are touched; past snapshots are left
 *    alone. `src/test/sdkDocsSync.test.ts`, `src/test/serverDocsSync.test.ts` and
 *    `src/test/fleetDocsSync.test.ts` run the `--check` when a checkout is there.
 *
 *  - **The hand-written packages** (core, app, …) are authored in this
 *    repository under `src/docs/content/<package>/<version>/`. A release freezes
 *    a new snapshot: `snapshot <version>` copies the current latest folder to a
 *    new version folder (which is then edited for the new release and never
 *    touched again). Phase 3 moved `server` out of this group and next to its
 *    code (the pilot), then `fleet` followed; core and app stay here for now. See
 *    `src/docs/README.md`.
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

/** Where the SDK snapshots live: one folder per release, `src/docs/sdk/<version>/`. */
export const TARGET = join(ROOT, 'src/docs/sdk')

/** The igni-sdk checkout: `IGNI_SDK_DIR`, else `../igni-sdk` beside this repository. */
export function sdkDir() {
  return resolve(ROOT, process.env.IGNI_SDK_DIR || '../igni-sdk')
}

/** The generated pages in that checkout. */
export function sourceDir(dir = sdkDir()) {
  return join(dir, 'docs/site')
}

/** Order two `x.y.z` versions newest first; a pre-release sorts below its release. */
export function compareVersionsDesc(a, b) {
  const parse = (v) => {
    const [core, pre = ''] = v.split('-', 2)
    return { nums: core.split('.').map((n) => Number.parseInt(n, 10) || 0), pre }
  }
  const x = parse(a)
  const y = parse(b)
  for (let i = 0; i < Math.max(x.nums.length, y.nums.length); i++) {
    const d = (y.nums[i] ?? 0) - (x.nums[i] ?? 0)
    if (d) return d
  }
  if (x.pre === y.pre) return 0
  if (!x.pre) return -1
  if (!y.pre) return 1
  return y.pre < x.pre ? -1 : 1
}

/** The SDK snapshots here, newest first: every `src/docs/sdk/<version>/` with an `index.json`. */
export function sdkVersions(target = TARGET) {
  if (!existsSync(target)) return []
  return readdirSync(target, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(target, e.name, 'index.json')))
    .map((e) => e.name)
    .sort(compareVersionsDesc)
}

/** The folder of the newest SDK snapshot, the one `/docs/sdk/...` shows. */
export function latestSdkDir(target = TARGET) {
  const [latest] = sdkVersions(target)
  if (!latest) throw new Error(`no SDK snapshot under ${target}`)
  return join(target, latest)
}

/**
 * The release a generated tree is: the version its `index.json` gives every
 * package. The six are released together, so they must agree.
 */
export function generatedVersion(dir) {
  const index = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8'))
  const versions = [...new Set(index.packages.map((p) => p.version))]
  if (versions.length !== 1) {
    throw new Error(`the SDK packages in ${dir}/index.json disagree on their version: ${versions.join(', ')}`)
  }
  return versions[0]
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
 * What differs between the checkout and a snapshot folder (by default the
 * latest): files to add or change, and copies igni-sdk no longer generates.
 */
export function diff(source = sourceDir(), version = sdkVersions()[0]) {
  const to = join(TARGET, version ?? '')
  const wanted = files(source)
  const have = new Set(version ? files(to) : [])
  const changed = wanted.filter(
    (f) => !have.has(f) || readFileSync(join(source, f), 'utf8') !== readFileSync(join(to, f), 'utf8'),
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
  const version = generatedVersion(source)
  const versions = sdkVersions()
  const latest = versions[0]
  const check = argv.includes('--check')
  if (check) {
    // The check is against the latest snapshot: a checkout that generates a
    // newer release is a sync not yet run, an older one is the wrong checkout.
    const { changed, removed } = diff(source, latest)
    if (version !== latest) {
      console.log(`the checkout generates SDK ${version}; the site's latest snapshot is ${latest ?? 'missing'}`)
    }
    for (const f of changed) console.log(`stale: src/docs/sdk/${latest}/${f}`)
    for (const f of removed) console.log(`left over: src/docs/sdk/${latest}/${f}`)
    return version !== latest || changed.length || removed.length ? 1 : 0
  }
  if (versions.includes(version) && version !== latest) {
    console.error(`src/docs/sdk/${version} is a past release's snapshot; snapshots are immutable`)
    return 1
  }
  const { changed, removed } = diff(source, version)
  const to = join(TARGET, version)
  for (const f of changed) {
    mkdirSync(dirname(join(to, f)), { recursive: true })
    writeFileSync(join(to, f), readFileSync(join(source, f), 'utf8'))
  }
  for (const f of removed) rmSync(join(to, f))
  for (const f of changed) console.log(`copied: src/docs/sdk/${version}/${f}`)
  for (const f of removed) console.log(`removed: src/docs/sdk/${version}/${f}`)
  if (changed.length || removed.length) {
    console.log('now run `npm run sitemap`: the sitemap lists every page of the latest SDK snapshot')
  }
  return 0
}

// ── The server: copy generated snapshots from an igni-server checkout ──

const CONTENT = join(ROOT, 'src/docs/content')

/** The igni-server checkout: `IGNI_SERVER_DIR`, else `../igni-server` beside this repository. */
export function serverDir() {
  return resolve(ROOT, process.env.IGNI_SERVER_DIR || '../igni-server')
}

/** The generated server docs in that checkout: one folder per version. */
export function serverSourceDir(dir = serverDir()) {
  return join(dir, 'docs/site/server')
}

/** The version folders igni-server generates, from its `docs/site/server/`. */
export function serverVersions(source = serverSourceDir()) {
  if (!existsSync(source)) return []
  return readdirSync(source, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
}

/**
 * What differs for one generated version: files to add or change, and copies
 * igni-server no longer generates for THAT version. Only the versions the
 * checkout emits are compared; frozen past snapshots under
 * `src/docs/content/server/` are never touched.
 */
export function serverDiff(version, source = serverSourceDir()) {
  const from = join(source, version)
  const to = join(CONTENT, 'server', version)
  const wanted = files(from)
  const have = new Set(files(to))
  const changed = wanted.filter(
    (f) => !have.has(f) || readFileSync(join(from, f), 'utf8') !== readFileSync(join(to, f), 'utf8'),
  )
  const removed = [...have].filter((f) => !wanted.includes(f))
  return { changed, removed }
}

function syncServer(argv) {
  if (argv[0] === 'snapshot') {
    console.error(
      'server docs are generated next to the code now (Phase 3): run `make docs-site` in igni-server, then `node scripts/sync-docs.mjs server` here — do not snapshot by hand',
    )
    return 2
  }
  const source = serverSourceDir()
  const versions = serverVersions(source)
  if (versions.length === 0) {
    console.error(
      `no generated server docs at ${source} (set IGNI_SERVER_DIR to an igni-server checkout; run make docs-site there)`,
    )
    return 2
  }
  const check = argv.includes('--check')
  let changes = 0
  for (const version of versions) {
    const { changed, removed } = serverDiff(version, source)
    const from = join(source, version)
    const to = join(CONTENT, 'server', version)
    if (!check) {
      for (const f of changed) {
        mkdirSync(dirname(join(to, f)), { recursive: true })
        writeFileSync(join(to, f), readFileSync(join(from, f), 'utf8'))
      }
      for (const f of removed) rmSync(join(to, f))
    }
    for (const f of changed) console.log(`${check ? 'stale' : 'copied'}: src/docs/content/server/${version}/${f}`)
    for (const f of removed) console.log(`${check ? 'left over' : 'removed'}: src/docs/content/server/${version}/${f}`)
    changes += changed.length + removed.length
  }
  if (!check && changes) {
    console.log("if this added a version, prepend it to server's `versions` in src/docs/docsManifest.ts, then run `npm run sitemap`")
  }
  return check && changes ? 1 : 0
}

// ── Fleet: copy generated snapshots from an igni__cloudvm checkout ─────

/** The igni__cloudvm checkout: `IGNI_CLOUDVM_DIR`, else `../igni__cloudvm`
 *  beside this repository. Its default branch is `master`. */
export function fleetDir() {
  return resolve(ROOT, process.env.IGNI_CLOUDVM_DIR || '../igni__cloudvm')
}

/** The generated Fleet docs in that checkout: one folder per version. */
export function fleetSourceDir(dir = fleetDir()) {
  return join(dir, 'docs/site/fleet')
}

/** The version folders igni__cloudvm generates, from its `docs/site/fleet/`. */
export function fleetVersions(source = fleetSourceDir()) {
  if (!existsSync(source)) return []
  return readdirSync(source, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
}

/**
 * What differs for one generated version: files to add or change, and copies
 * igni__cloudvm no longer generates for THAT version. Only the versions the
 * checkout emits are compared; frozen past snapshots under
 * `src/docs/content/fleet/` are never touched.
 */
export function fleetDiff(version, source = fleetSourceDir()) {
  const from = join(source, version)
  const to = join(CONTENT, 'fleet', version)
  const wanted = files(from)
  const have = new Set(files(to))
  const changed = wanted.filter(
    (f) => !have.has(f) || readFileSync(join(from, f), 'utf8') !== readFileSync(join(to, f), 'utf8'),
  )
  const removed = [...have].filter((f) => !wanted.includes(f))
  return { changed, removed }
}

function syncFleet(argv) {
  if (argv[0] === 'snapshot') {
    console.error(
      'fleet docs are generated next to the code now (Phase 3): run `python3 tools/site_docs.py` in igni__cloudvm, then `node scripts/sync-docs.mjs fleet` here — do not snapshot by hand',
    )
    return 2
  }
  const source = fleetSourceDir()
  const versions = fleetVersions(source)
  if (versions.length === 0) {
    console.error(
      `no generated fleet docs at ${source} (set IGNI_CLOUDVM_DIR to an igni__cloudvm checkout; run python3 tools/site_docs.py there)`,
    )
    return 2
  }
  const check = argv.includes('--check')
  let changes = 0
  for (const version of versions) {
    const { changed, removed } = fleetDiff(version, source)
    const from = join(source, version)
    const to = join(CONTENT, 'fleet', version)
    if (!check) {
      for (const f of changed) {
        mkdirSync(dirname(join(to, f)), { recursive: true })
        writeFileSync(join(to, f), readFileSync(join(from, f), 'utf8'))
      }
      for (const f of removed) rmSync(join(to, f))
    }
    for (const f of changed) console.log(`${check ? 'stale' : 'copied'}: src/docs/content/fleet/${version}/${f}`)
    for (const f of removed) console.log(`${check ? 'left over' : 'removed'}: src/docs/content/fleet/${version}/${f}`)
    changes += changed.length + removed.length
  }
  if (!check && changes) {
    console.log("if this added or removed an article, update fleet's entries in src/docs/docsManifest.ts, then run `npm run sitemap`")
  }
  return check && changes ? 1 : 0
}

// ── The hand-written packages: freeze a version snapshot ──────────────

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
  if (pkg === 'server') return syncServer(rest)
  if (pkg === 'fleet') return syncFleet(rest)
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
