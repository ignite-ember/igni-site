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

/**
 * The version selector. A parked module shows its label; a versioned
 * package shows a native select offering "Latest" and each release.
 */
export function VersionSelector({ pkg, version, rawVersion, article }: VersionControlsProps) {
  const navigate = useNavigate()

  // A parked module has no version axis — just its label.
  if (pkg.versionLabel) {
    return <Label>{packageVersionLabel(pkg)}</Label>
  }

  // "latest" when the reader is on the canonical URL; the pinned version
  // otherwise.
  const selected = !rawVersion || rawVersion === 'latest' ? 'latest' : version

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value
    navigate(value === 'latest' ? latestHref(pkg, article) : pinnedHref(pkg, value, article))
  }

  return (
    <label className="doc-version-selector">
      <span className="doc-version-selector-label">Version</span>
      <select
        aria-label="Documentation version"
        value={selected}
        onChange={onChange}
        className="doc-version-select"
      >
        <option value="latest">Latest ({versionLabel(pkg, pkg.versions[0])})</option>
        {pkg.versions.map((v) => (
          <option key={v} value={v}>
            {versionLabel(pkg, v)}
          </option>
        ))}
      </select>
    </label>
  )
}

/**
 * Shown when the reader is on a version that is not the newest: it says
 * which version they are reading and links to the same page on latest.
 */
export function VersionBanner({ pkg, version, article }: VersionControlsProps) {
  const navigate = useNavigate()
  if (isLatest(pkg, version)) return null

  const latest = pkg.versions[0]
  return (
    <div className="doc-version-banner" role="status">
      <span>
        You’re reading <strong>{versionLabel(pkg, version)}</strong>; the latest is{' '}
        <strong>{versionLabel(pkg, latest)}</strong>.
      </span>
      <a
        href={latestHref(pkg, article)}
        onClick={(e) => {
          e.preventDefault()
          navigate(latestHref(pkg, article))
        }}
      >
        Go to the latest docs
      </a>
    </div>
  )
}
