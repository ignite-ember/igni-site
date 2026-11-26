/**
 * Where somebody gets igni.
 *
 * Public: the landing page's app section links here, and it is in the
 * sitemap.
 *
 * ## Where the files come from
 *
 * The latest GitHub release, read at load. Asset names carry the
 * version, so there is no fixed URL to hardcode and a hand-written
 * list would be wrong on the day of every release — see
 * `downloadAssets.ts`, which does the sorting.
 *
 * The fetch can fail for reasons that have nothing to do with us:
 * GitHub rate-limits unauthenticated calls at 60/hour per IP, and a
 * blocked request is a normal state for a corporate network. So the
 * last good answer is cached, and the page still renders a route to
 * the files when both the fetch and the cache come up empty. It never
 * shows a dead end.
 *
 * ## The first-launch note is not filler
 *
 * The app provisions its own backend on first run — a pinned Python,
 * the package and an embedding model — which wants about a gigabyte
 * and a network connection *that one time*. Somebody deciding whether
 * to run this on a work laptop needs both facts before they download
 * 180 MB, not after.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertIcon,
  DesktopDownloadIcon,
  MarkGithubIcon,
  TerminalIcon,
} from '@primer/octicons-react'

import { useDocumentTitle } from '../hooks/useDocumentTitle'
import {
  classifyAssets,
  detectPlatform,
  humanSize,
  LATEST_API_URL,
  PLATFORM_LABELS,
  RELEASES_URL,
  type Download,
  type Platform,
  type ReleaseAsset,
} from './downloadAssets'
import { SiteFooter, SiteNav } from './site/SiteChrome'
import { SectionHead } from './site/Sections'
import './landing-shared.css'
import './LandingPage.css'
import './DownloadPage.css'

const CACHE_KEY = 'igni_latest_release'

interface Release {
  tag: string
  assets: ReleaseAsset[]
}

function readCache(): Release | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as Release) : null
  } catch {
    // Private mode, blocked storage, or something else wrote here.
    return null
  }
}

function useLatestRelease(): { release: Release | null; failed: boolean } {
  const [release, setRelease] = useState<Release | null>(readCache)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(LATEST_API_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data) => {
        if (cancelled) return
        const next: Release = {
          tag: String(data?.tag_name ?? ''),
          assets: Array.isArray(data?.assets) ? data.assets : [],
        }
        if (!next.assets.length) throw new Error('no assets')
        setRelease(next)
        setFailed(false)
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(next))
        } catch {
          /* the page works without it; it just refetches next time */
        }
      })
      .catch(() => {
        // Only a failure if there is nothing cached to show.
        if (!cancelled) setFailed((prev) => prev || readCache() === null)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { release, failed }
}

function DownloadRow({ download }: { download: Download }) {
  const size = humanSize(download.size)
  return (
    <a className="dl-row" href={download.url}>
      <span className="dl-row-label">{download.label}</span>
      <span className="dl-row-meta">
        <code>.{download.kind}</code>
        {size && <span className="dl-row-size">{size}</span>}
      </span>
    </a>
  )
}

function PlatformCard({
  platform,
  downloads,
  primary,
}: {
  platform: Platform
  downloads: Download[]
  primary: boolean
}) {
  if (!downloads.length) return null
  return (
    <section className={`dl-card ${primary ? 'dl-card-primary' : ''}`}>
      <h3>
        {PLATFORM_LABELS[platform]}
        {primary && <span className="dl-badge">your system</span>}
      </h3>
      <div className="dl-rows">
        {downloads.map((d) => (
          <DownloadRow key={d.url} download={d} />
        ))}
      </div>
    </section>
  )
}

export function DownloadPage() {
  useDocumentTitle('Download igni')

  const { release, failed } = useLatestRelease()
  const platform = useMemo(
    () => detectPlatform(typeof navigator === 'undefined' ? '' : navigator.userAgent),
    [],
  )

  const grouped = useMemo(() => classifyAssets(release?.assets ?? []), [release])

  // macOS is shown as one card pair: the detected Apple-silicon build
  // first, then Intel, because the browser cannot tell them apart.
  const order: Platform[] =
    platform === 'macos-arm'
      ? ['macos-arm', 'macos-intel', 'windows', 'linux']
      : platform === 'windows'
        ? ['windows', 'macos-arm', 'macos-intel', 'linux']
        : ['linux', 'macos-arm', 'macos-intel', 'windows']

  const primary = grouped[platform]?.[0]

  return (
    <main className="landing landing--main lp dl">
      <SiteNav />

      <section className="landing-hero dl-hero">
        <span className="landing-section-label">The igni app</span>
        <h2>
          Download <span className="landing-hero-gradient">igni</span>
        </h2>
        <p className="landing-hero-sub">
          One application. It brings its own backend — there is no Python to install, no CLI to set
          up, and no server address to type: you sign in with your work email and it finds your
          company's deployment.
        </p>

        <div className="lp-hero-cta">
          {primary ? (
            <a className="landing-btn-primary" href={primary.url}>
              <DesktopDownloadIcon size={20} /> Download for {PLATFORM_LABELS[platform]}
            </a>
          ) : (
            <a className="landing-btn-primary" href={RELEASES_URL}>
              <DesktopDownloadIcon size={20} /> Get the latest release
            </a>
          )}
          <a className="landing-btn-secondary" href={RELEASES_URL}>
            <MarkGithubIcon size={16} /> All releases
          </a>
        </div>

        {primary && (
          <p className="lp-hero-note dl-hero-meta">
            {release?.tag && <span>{release.tag}</span>}
            {humanSize(primary.size) && <span>{humanSize(primary.size)}</span>}
            <code>.{primary.kind}</code>
          </p>
        )}

        {failed && (
          <p className="dl-warn">
            <AlertIcon size={16} />
            {/* One span, so the link sits inside the sentence rather than becoming a flex item of its own. */}
            <span>
              Could not reach GitHub to list the files — every build is on{' '}
              <a href={RELEASES_URL}>the releases page</a>.
            </span>
          </p>
        )}
      </section>

      <section className="landing-section dl-section dl-platforms">
        <SectionHead label="Every build" title="Pick your platform" />
        <div className="dl-grid">
          {order.map((p) => (
            <PlatformCard
              key={p}
              platform={p}
              downloads={grouped[p]}
              primary={p === platform && !!primary}
            />
          ))}
        </div>
        {!release && !failed && <p className="dl-lede">Looking up the latest release…</p>}
      </section>

      <section className="landing-section dl-section">
        <SectionHead label="First launch" title="What happens the first time you open it">
          The app installs its own backend: a pinned Python, the agent, and the model it uses to
          index your project. Two things worth knowing before you start.
        </SectionHead>
        <div className="dl-facts">
          <div className="lp-sec-card">
            <h4>About 1 GB of free disk</h4>
            <p>Checked before anything downloads, because failing at the start is kinder than failing halfway through.</p>
          </div>
          <div className="lp-sec-card">
            <h4>Network access, on the first run only</h4>
            <p>
              After that it starts from its own cache. Nothing about your code leaves your machine —
              the agent talks to the server your company runs, and to nothing else.
            </p>
          </div>
        </div>
        <p className="dl-lede">
          Then sign in with your work email. If your administrator has published where your igni
          server is, that is the whole setup;{' '}
          <Link to="/docs/administering-your-organisation">
            the admin guide covers publishing that record
          </Link>
          .
        </p>
      </section>

      <section className="landing-section dl-section">
        <SectionHead label="The CLI" title="There is also a command line">
          For CI, a pre-commit hook or a scripted batch — not for sitting down and working. It is a
          single command with three non-interactive modes.
        </SectionHead>
        <code className="dl-code">
          <TerminalIcon size={16} /> pip install igni-core
        </code>
        <p className="dl-lede">
          <Link to="/docs/core">Read the documentation</Link> for what it can do.
        </p>
      </section>

      <SiteFooter />
    </main>
  )
}
