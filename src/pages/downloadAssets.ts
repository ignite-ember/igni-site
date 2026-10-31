/**
 * Turning a GitHub release into a download page.
 *
 * The release workflow publishes a dozen files per tag and their
 * names carry the version — `igni_1.0.3_aarch64.dmg` — so there is no
 * stable `/releases/latest/download/<name>` URL to hardcode. Nor is
 * there a hand-maintained list worth keeping: it would be wrong on
 * the day of every release. The page reads the latest release and
 * sorts the assets here.
 *
 * Kept as pure functions, apart from the page that renders them, so
 * the classification can be tested against the real asset names
 * without a DOM or a network.
 *
 * ## What is deliberately not offered
 *
 * `.sig` files are signatures, `latest.json` is the updater manifest,
 * and `*.app.tar.gz` is the macOS updater payload — three things the
 * app reads and nobody downloads. Listing them would be eleven
 * confusing rows next to the four a person wants.
 */

export const GITHUB_REPO = 'ignite-ember/igni'
export const RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`
export const LATEST_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`

/**
 * The JetBrains plugin is published; the VS Code one is not.
 *
 * Checked rather than assumed, because a download page that links a
 * 404 is worse than one that does not mention the thing. The plugin
 * resolves at this URL and reports real downloads; a marketplace
 * query for `ignite-ember.igni-vscode` returns zero extensions, so
 * the VSIX is offered from the release instead, with the one command
 * that installs it. Swap that for a marketplace link once the
 * extension is actually published.
 */
export const JETBRAINS_URL = 'https://plugins.jetbrains.com/plugin/32377-igni'

export type Platform = 'macos-arm' | 'macos-intel' | 'windows' | 'linux'

export interface ReleaseAsset {
  name: string
  browser_download_url: string
  size?: number
}

export interface Download {
  /** What a person recognises: "Apple silicon", "Windows installer". */
  label: string
  /** The file extension, shown so they know what they are getting. */
  kind: string
  url: string
  size?: number
  platform: Platform
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  'macos-arm': 'macOS — Apple silicon',
  'macos-intel': 'macOS — Intel',
  windows: 'Windows',
  linux: 'Linux',
}

/** Files the app consumes and a person never should. */
function isMachineOnly(name: string): boolean {
  return name.endsWith('.sig') || name === 'latest.json' || name.endsWith('.app.tar.gz')
}

/**
 * One asset → one row, or null if it is not a desktop download.
 *
 * Matched on the extension and the architecture token rather than on
 * the whole filename, because the version sits in the middle of every
 * name and a pattern containing it would stop matching at the next
 * release.
 */
export function classifyAsset(asset: ReleaseAsset): Download | null {
  const name = asset.name
  if (isMachineOnly(name)) return null

  const base = { url: asset.browser_download_url, size: asset.size }

  if (name.endsWith('.dmg')) {
    const arm = /aarch64|arm64/.test(name)
    return {
      ...base,
      platform: arm ? 'macos-arm' : 'macos-intel',
      label: arm ? 'Apple silicon' : 'Intel',
      kind: 'dmg',
    }
  }
  // Labels name the *variant*, never the platform: the card is
  // already headed "Windows", and a row inside it reading "Windows"
  // tells a reader nothing about which of the two files to take.
  if (name.endsWith('.msi')) return { ...base, platform: 'windows', label: 'Installer (MSI)', kind: 'msi' }
  if (name.endsWith('.exe')) return { ...base, platform: 'windows', label: 'Installer (setup)', kind: 'exe' }
  if (name.endsWith('.AppImage')) return { ...base, platform: 'linux', label: 'AppImage', kind: 'AppImage' }
  if (name.endsWith('.deb')) return { ...base, platform: 'linux', label: 'Debian / Ubuntu', kind: 'deb' }
  if (name.endsWith('.rpm')) return { ...base, platform: 'linux', label: 'Fedora / RHEL', kind: 'rpm' }

  return null
}

/**
 * Which file to offer first within a platform.
 *
 * The release lists assets alphabetically, which put `.rpm` at the
 * top of the Linux card — the narrowest of the three above the one
 * that runs anywhere. Ordered by how likely it is to be the right
 * answer instead; anything unlisted sorts last rather than vanishing.
 */
const KIND_ORDER = ['dmg', 'exe', 'msi', 'AppImage', 'deb', 'rpm']

/** Every desktop download in a release, grouped by platform. */
export function classifyAssets(assets: ReleaseAsset[]): Record<Platform, Download[]> {
  const grouped: Record<Platform, Download[]> = {
    'macos-arm': [],
    'macos-intel': [],
    windows: [],
    linux: [],
  }
  for (const asset of assets) {
    const download = classifyAsset(asset)
    if (download) grouped[download.platform].push(download)
  }
  const rank = (kind: string) => {
    const at = KIND_ORDER.indexOf(kind)
    return at === -1 ? KIND_ORDER.length : at
  }
  for (const list of Object.values(grouped)) list.sort((a, b) => rank(a.kind) - rank(b.kind))
  return grouped
}

/**
 * Which build to put under the big button.
 *
 * A browser will not tell you whether a Mac has an Apple chip — the
 * user agent says `Intel Mac OS X` on both, and the high-entropy
 * hints that would answer it are async and not universally
 * implemented. So macOS resolves to Apple silicon, which is the
 * overwhelmingly likelier machine on a new install, and the Intel
 * build is always one visible row away rather than hidden behind the
 * guess.
 */
export function detectPlatform(userAgent: string): Platform {
  const ua = userAgent || ''
  if (/Windows|Win32|Win64/i.test(ua)) return 'windows'
  if (/Mac OS X|Macintosh/i.test(ua)) return 'macos-arm'
  if (/Linux|X11|CrOS/i.test(ua)) return 'linux'
  // Everything else — a phone, an unknown shell — gets the list
  // rather than a wrong guess under a primary button.
  return 'linux'
}

export interface EditorDownloads {
  /** The packaged VS Code extension, when the release carries one. */
  vsix?: Download
  /** The JetBrains plugin zip — a fallback; the marketplace is better. */
  jetbrains?: Download
}

/**
 * The two editor builds, which are release assets rather than
 * platform downloads and so are kept out of the grouping above.
 */
export function classifyEditorAssets(assets: ReleaseAsset[]): EditorDownloads {
  const found: EditorDownloads = {}
  for (const asset of assets) {
    const base = { url: asset.browser_download_url, size: asset.size, platform: 'linux' as Platform }
    if (asset.name.endsWith('.vsix')) {
      found.vsix = { ...base, label: 'VS Code extension', kind: 'vsix' }
    } else if (asset.name.includes('jetbrains') && asset.name.endsWith('.zip')) {
      found.jetbrains = { ...base, label: 'JetBrains plugin', kind: 'zip' }
    }
  }
  return found
}

/** `184232345` → `176 MB`. */
export function humanSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return ''
  const mb = bytes / (1024 * 1024)
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
  return `${Math.round(mb)} MB`
}
