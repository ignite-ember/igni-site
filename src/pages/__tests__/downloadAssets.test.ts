/**
 * Sorting a real release into a download page.
 *
 * The fixture below is the asset list of `v1.0.3` verbatim, because
 * the classification is pattern-matching on filenames and the only
 * useful test of that is the filenames the release workflow actually
 * produces. Writing a tidier fixture by hand would test the patterns
 * against themselves.
 *
 * What it is guarding: three of those nineteen files are for the app,
 * not for a person — the `.sig` signatures, the updater's
 * `latest.json`, and the `.app.tar.gz` updater payload. Offering them
 * would put eleven rows on the page where four belong, and two of
 * them would download something that does nothing when opened.
 */

import { describe, expect, it } from 'vitest'

import {
  classifyAsset,
  classifyAssets,
  detectPlatform,
  humanSize,
  LATEST_API_URL,
  RELEASES_URL,
} from '../downloadAssets'

/** `gh release view v1.0.3 --json assets`, as published. */
const V103 = [
  'ember-code-jetbrains-1.0.3.zip',
  'ember-code-vscode-1.0.3.vsix',
  'igni-1.0.3-1.x86_64.rpm',
  'igni-1.0.3-1.x86_64.rpm.sig',
  'igni_1.0.3_aarch64.dmg',
  'igni_1.0.3_amd64.AppImage',
  'igni_1.0.3_amd64.AppImage.sig',
  'igni_1.0.3_amd64.deb',
  'igni_1.0.3_amd64.deb.sig',
  'igni_1.0.3_x64-setup.exe',
  'igni_1.0.3_x64-setup.exe.sig',
  'igni_1.0.3_x64.dmg',
  'igni_1.0.3_x64_en-US.msi',
  'igni_1.0.3_x64_en-US.msi.sig',
  'igni_aarch64.app.tar.gz',
  'igni_aarch64.app.tar.gz.sig',
  'igni_x64.app.tar.gz',
  'igni_x64.app.tar.gz.sig',
  'latest.json',
].map((name) => ({ name, browser_download_url: `https://example.test/${name}`, size: 1024 * 1024 }))

describe('classifying the v1.0.3 assets', () => {
  const grouped = classifyAssets(V103)

  it('puts every platform somewhere', () => {
    expect(grouped['macos-arm'].map((d) => d.kind)).toEqual(['dmg'])
    expect(grouped['macos-intel'].map((d) => d.kind)).toEqual(['dmg'])
    // Asserted in order, not sorted: the order is the feature. The
    // release lists assets alphabetically, which put `.rpm` first.
    expect(grouped.windows.map((d) => d.kind)).toEqual(['exe', 'msi'])
    expect(grouped.linux.map((d) => d.kind)).toEqual(['AppImage', 'deb', 'rpm'])
  })

  it('tells the two macOS builds apart', () => {
    expect(grouped['macos-arm'][0].url).toContain('aarch64')
    expect(grouped['macos-intel'][0].url).toContain('x64')
  })

  it('offers nothing a person cannot open', () => {
    const urls = Object.values(grouped)
      .flat()
      .map((d) => d.url)

    expect(urls.filter((u) => u.endsWith('.sig'))).toEqual([])
    expect(urls.filter((u) => u.includes('latest.json'))).toEqual([])
    expect(urls.filter((u) => u.includes('.app.tar.gz'))).toEqual([])
  })

  it('offers exactly the seven desktop files', () => {
    expect(Object.values(grouped).flat()).toHaveLength(7)
  })

  it('never offers the IDE plugin builds the release still carries', () => {
    // igni no longer supports the VS Code and JetBrains plugins; v1.0.3
    // still ships both files, and neither may reach the page.
    const urls = Object.values(grouped)
      .flat()
      .map((d) => d.url)

    expect(urls.filter((u) => u.endsWith('.vsix'))).toEqual([])
    expect(urls.filter((u) => u.includes('jetbrains'))).toEqual([])
  })
})

describe('a single asset', () => {
  it.each(['.sig', 'latest.json', '.app.tar.gz'])('refuses %s', (suffix) => {
    const name = suffix === 'latest.json' ? 'latest.json' : `igni_1.0.4_x64${suffix}`

    expect(classifyAsset({ name, browser_download_url: 'https://example.test/x' })).toBeNull()
  })

  it('does not depend on the version in the name', () => {
    // The whole reason for matching on the extension: next release,
    // every one of these filenames changes in the middle.
    const next = classifyAsset({
      name: 'igni_9.9.9_aarch64.dmg',
      browser_download_url: 'https://example.test/x',
    })

    expect(next?.platform).toBe('macos-arm')
  })
})

describe('detecting the visitor', () => {
  it.each([
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'macos-arm'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'windows'],
    ['Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36', 'linux'],
    ['Mozilla/5.0 (X11; CrOS x86_64 14541.0.0)', 'linux'],
  ])('%s', (ua, expected) => {
    expect(detectPlatform(ua)).toBe(expected)
  })

  it('falls back rather than guessing when it cannot tell', () => {
    expect(detectPlatform('')).toBe('linux')
  })

  it('reads a Mac as Apple silicon on purpose', () => {
    // The user agent says `Intel Mac OS X` on both machines, so this
    // is a choice about which build goes under the button — the other
    // is always a visible row away. See the note in the module.
    expect(detectPlatform('Macintosh; Intel Mac OS X 10_15_7')).toBe('macos-arm')
  })
})

describe('sizes', () => {
  it.each([
    [184 * 1024 * 1024, '184 MB'],
    [1536 * 1024 * 1024, '1.5 GB'],
    [0, ''],
    [undefined, ''],
  ])('%s → %s', (bytes, expected) => {
    expect(humanSize(bytes as number | undefined)).toBe(expected)
  })
})

describe('the links it hands out', () => {
  it('name the repository that exists', () => {
    // `ignite-ember/ember__code` was renamed; it 301s, which is
    // exactly the kind of thing that keeps working until it does not.
    expect(RELEASES_URL).toBe('https://github.com/ignite-ember/igni/releases')
    expect(LATEST_API_URL).toContain('/repos/ignite-ember/igni/releases/latest')
  })
})
