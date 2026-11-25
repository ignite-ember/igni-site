/**
 * The per-package version controls: a selector in the docs header and the
 * "you are not reading the latest" banner.
 *
 * Phase 2 of the docs-versioning plan. Each package's pages are frozen
 * snapshots (`src/docs/docsManifest.ts`); these let a reader move between
 * them. The selector offers "Latest" (the version-less canonical URL that
 * follows the newest release) and every released version (a pinned URL
 * that never moves). The banner appears only when the reader is on a
 * version that is not the newest, and links back to the same page on
 * latest.
 *
 * A parked module (Artifacts, CodeIndex) has no release number — it shows
 * its "Paid module" label instead of a selector, and never a banner.
 *
 * `VersionPicker` and `VersionNotice` are the controls themselves; the
 * documentation packages (`VersionSelector`, `VersionBanner`) and the SDK
 * (`SdkVersionSelector`, `SdkVersionBanner`, versioned by igni-sdk's
 * releases under `src/docs/sdk/<version>/`) only say what the versions are
 * and where each goes.
 */
import { useNavigate } from 'react-router-dom'
import { Label } from '@primer/react'
import {
  docHref,
  isLatest,
  packageHref,
  packageVersionLabel,
  versionLabel,
  type DocArticle,
  type DocPackage,
} from './docsManifest'
import { SDK_VERSIONS, sdkLandingPath, sdkPath, sdkPinnedPath } from './sdkManifest'
import '../pages/DocsPage.css'

interface VersionControlsProps {
  pkg: DocPackage
  /** The concrete version being viewed. */
  version: string
  /** The raw `:version` segment from the URL: `undefined` or `latest` when
   *  the reader is on the version-less canonical URL. */
  rawVersion?: string
  /** The article in view, so the selector keeps the page across versions.
   *  Omitted on a package landing. */
  article?: DocArticle
}

/** The pinned path for an explicit version — always carries the version,
 *  even when it is the latest (that is what "pin this version" means). */
function pinnedHref(pkg: DocPackage, version: string, article?: DocArticle): string {
  if (article && !pkg.single) return `/docs/${pkg.slug}/${version}/${article.slug}`
  return `/docs/${pkg.slug}/${version}`
}

/** The latest-tracking (version-less) path for this page. */
function latestHref(pkg: DocPackage, article?: DocArticle): string {
  return article ? docHref(article) : packageHref(pkg)
}

interface VersionPickerProps {
  /** Released versions, newest first. */
  versions: string[]
  /** `latest` on the version-less canonical URL, else the pinned version. */
  selected: string
  /** How a version is shown: `v0.8`. */
  label: (version: string) => string
  /** Where choosing an entry goes: `latest`, or a version. */
  hrefFor: (choice: string) => string
}

/**
 * A native select offering "Latest" (the canonical URL, which follows the
 * newest release) and every release (a pinned URL that never moves). Shared
 * by the hand-written and generated packages and by the SDK.
 */
export function VersionPicker({ versions, selected, label, hrefFor }: VersionPickerProps) {
  const navigate = useNavigate()
  return (
    <label className="doc-version-selector">
      <span className="doc-version-selector-label">Version</span>
      <select
        aria-label="Documentation version"
        value={selected}
        onChange={(e) => navigate(hrefFor(e.target.value))}
        className="doc-version-select"
      >
        <option value="latest">Latest ({label(versions[0])})</option>
        {versions.map((v) => (
          <option key={v} value={v}>
            {label(v)}
          </option>
        ))}
      </select>
    </label>
  )
}

interface VersionNoticeProps {
  /** The version being read. */
  version: string
  /** The newest version. */
  latest: string
  label: (version: string) => string
  /** The same page on latest. */
  latestHref: string
}

/**
 * Shown when the reader is on a version that is not the newest: it says
 * which version they are reading and links to the same page on latest.
 */
export function VersionNotice({ version, latest, label, latestHref }: VersionNoticeProps) {
  const navigate = useNavigate()
  if (version === latest) return null
  return (
    <div className="doc-version-banner" role="status">
      <span>
        You’re reading <strong>{label(version)}</strong>; the latest is <strong>{label(latest)}</strong>.
      </span>
      <a
        href={latestHref}
        onClick={(e) => {
          e.preventDefault()
          navigate(latestHref)
        }}
      >
        Go to the latest docs
      </a>
    </div>
  )
}

/** A selected value from the URL's version segment: `latest` on the canonical URL. */
function selectedOf(version: string, rawVersion: string | undefined): string {
  return !rawVersion || rawVersion === 'latest' ? 'latest' : version
}

/**
 * The version selector. A parked module shows its label; a versioned
 * package shows a native select offering "Latest" and each release.
 */
export function VersionSelector({ pkg, version, rawVersion, article }: VersionControlsProps) {
  // A parked module has no version axis — just its label.
  if (pkg.versionLabel) {
    return <Label>{packageVersionLabel(pkg)}</Label>
  }
  return (
    <VersionPicker
      versions={pkg.versions}
      selected={selectedOf(version, rawVersion)}
      label={(v) => versionLabel(pkg, v)}
      hrefFor={(v) => (v === 'latest' ? latestHref(pkg, article) : pinnedHref(pkg, v, article))}
    />
  )
}

/** The banner off the newest version of a documentation package. */
export function VersionBanner({ pkg, version, article }: VersionControlsProps) {
  if (isLatest(pkg, version)) return null
  return (
    <VersionNotice
      version={version}
      latest={pkg.versions[0]}
      label={(v) => versionLabel(pkg, v)}
      latestHref={latestHref(pkg, article)}
    />
  )
}

interface SdkVersionControlsProps {
  /** The concrete SDK version being viewed. */
  version: string
  /** The raw `:version` segment: `undefined` or `latest` on the canonical URL. */
  rawVersion?: string
  /** The package and page in view, so the selector keeps the page across
   *  versions. Omitted on the SDK landing. */
  pkg?: string
  page?: string
}

const sdkVersionLabel = (v: string) => `v${v}`

/** The SDK's version selector: the six packages are released together, so one axis. */
export function SdkVersionSelector({ version, rawVersion, pkg, page }: SdkVersionControlsProps) {
  return (
    <VersionPicker
      versions={SDK_VERSIONS}
      selected={selectedOf(version, rawVersion)}
      label={sdkVersionLabel}
      hrefFor={(v) =>
        v === 'latest' ? (pkg ? sdkPath(pkg, page) : sdkLandingPath()) : sdkPinnedPath(v, pkg, page)
      }
    />
  )
}

/** The banner off the newest SDK release. */
export function SdkVersionBanner({ version, pkg, page }: SdkVersionControlsProps) {
  return (
    <VersionNotice
      version={version}
      latest={SDK_VERSIONS[0]}
      label={sdkVersionLabel}
      latestHref={pkg ? sdkPath(pkg, page) : sdkLandingPath()}
    />
  )
}
