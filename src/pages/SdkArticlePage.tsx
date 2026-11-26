import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'
import { Breadcrumbs, Button, Heading, Label, Stack, Text } from '@primer/react'
import { ArrowLeftIcon, ArrowRightIcon, BookIcon } from '@primer/octicons-react'
import { Blankslate } from '@primer/react/experimental'

import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { markdownComponentsWith } from '../docs/markdownComponents'
import { CodeLanguageProvider } from '../docs/CodeLanguage'
import { rehypeCodeGroups } from '../docs/rehypeCodeGroups'
import { rehypeSdkLayout } from '../docs/rehypeSdkLayout'
import { MobileTableOfContents, TableOfContents } from '../docs/DocToc'
import { useActiveSectionId } from '../docs/useActiveSectionId'
import { SdkSidebar, SdkSidebarMobile } from '../docs/SdkSidebar'
import {
  SDK_CATEGORY_LABEL,
  loadSdkContent,
  resolveSdkVersion,
  sdkLabel,
  sdkLandingPath,
  sdkLinkAt,
  sdkPackage,
  sdkPage,
  sdkPagesOf,
  sdkPath,
  sdkToc,
} from '../docs/sdkManifest'
import { useSdkDocs } from '../docs/useSdkDocs'
import { SdkVersionBanner, SdkVersionSelector } from '../docs/VersionSelector'
import './DocsPage.css'
import './SdkDocs.css'

/**
 * One page of an SDK's documentation: `/docs/sdk/<package>` (its
 * overview) and `/docs/sdk/<package>/<page>`.
 *
 * The pages are igni-sdk's, copied by `scripts/sync-docs.mjs sdk`; this
 * renders them with the documentation's own renderer, between the
 * package's page list and the page's table of contents. Every method of
 * igni-client is a `##` heading, so it has an anchor and a place in the
 * table of contents; `/docs/sdk/igni-client/scheduler#session-scheduler-list`
 * opens at it.
 *
 * `/docs/sdk/<version>/<package>[/<page>]` (or `latest` for `<version>`) is
 * the same page at a pinned release: the sidebar, prev/next and the page's
 * own SDK links stay in that release. A page the release does not have is
 * "Page not found", as an article missing from a documentation package's
 * older version is.
 */
export function SdkArticlePage(props: { version?: string; pkg?: string; page?: string } = {}) {
  const params = useParams<{ version?: string; pkg: string; page?: string }>()
  // The ambiguous routes (SdkRoutes) say what each segment is; the
  // three-segment route's own parameters do.
  const { version: rawVersion, pkg, page: slug } = props.pkg !== undefined ? props : params
  const version = resolveSdkVersion(rawVersion)
  const docs = useSdkDocs(version)
  const navigate = useNavigate()
  const location = useLocation()
  const meta = docs && sdkPackage(pkg, docs)
  const page = docs && sdkPage(pkg, slug, docs)
  useDocumentTitle(
    page ? `${page.title} — ${sdkLabel(meta) || page.package} — Docs` : 'SDK documentation',
    page?.description,
  )

  // The page's markdown is a chunk of its own, fetched on arrival.
  const [loaded, setLoaded] = useState<{ key: string; body: string } | null>(null)
  const key = page ? `${version}/${page.file}` : ''
  useEffect(() => {
    if (!page) return
    let live = true
    loadSdkContent(page, version).then((content) => {
      if (live) setLoaded({ key: `${version}/${page.file}`, body: content.replace(/^# .+\n?/, '') })
    })
    return () => {
      live = false
    }
  }, [page, version])
  const body = page && loaded?.key === key ? loaded.body : ''
  // On a pinned past release the page's own `/docs/sdk/...` links stay in it.
  const components = useMemo(() => markdownComponentsWith((href) => sdkLinkAt(href, version)), [version])
  const toc = useMemo(() => (page ? sdkToc(page) : []), [page])
  const sectionIds = useMemo(() => toc.map((s) => s.id), [toc])
  const activeSectionId = useActiveSectionId(sectionIds)

  const pages = page && docs ? sdkPagesOf(page.package, docs) : []
  const index = page ? pages.findIndex((p) => p.slug === page.slug) : -1
  const prev = index > 0 ? pages[index - 1] : null
  const next = index >= 0 && index < pages.length - 1 ? pages[index + 1] : null

  // A link to a heading opens at it: on arrival, and when a link on the
  // page goes to another heading of it or of another page.
  useEffect(() => {
    if (!location.hash) return
    const id = decodeURIComponent(location.hash.slice(1))
    document.getElementById(id)?.scrollIntoView({ block: 'start' })
  }, [location.pathname, location.hash, body])

  // A past release's index is still on its way.
  if (!docs) return <div className="docs-public-wrapper sdk-wrapper" aria-busy="true" />

  if (!meta || !page) {
    return (
      <Blankslate spacious>
        <Blankslate.Visual><BookIcon size={24} /></Blankslate.Visual>
        <Blankslate.Heading>Page not found</Blankslate.Heading>
        <Blankslate.Description>
          There is no such page in the SDK documentation.
        </Blankslate.Description>
        <Blankslate.PrimaryAction href={sdkLandingPath(version)}>SDK documentation</Blankslate.PrimaryAction>
      </Blankslate>
    )
  }

  // The scroll is reset by ScrollToTop on every route change, so this
  // only has to navigate.
  const go = (to: string) => {
    navigate(to)
  }

  return (
    <div className="docs-public-wrapper sdk-wrapper">
      <div className="sdk-layout">
        <SdkSidebar docs={docs} pkg={meta.name} current={page.slug} />

        <div className="doc-article-main">
          <Stack gap="normal">
            <Breadcrumbs className="doc-breadcrumbs">
              <Breadcrumbs.Item as={Link} to="/">igni</Breadcrumbs.Item>
              <Breadcrumbs.Item as={Link} to="/docs">Docs</Breadcrumbs.Item>
              <Breadcrumbs.Item as={Link} to={sdkLandingPath(version)}>SDK</Breadcrumbs.Item>
              {page.slug === 'overview'
                ? <Breadcrumbs.Item selected>{sdkLabel(meta)}</Breadcrumbs.Item>
                : [
                    <Breadcrumbs.Item key="pkg" as={Link} to={sdkPath(meta.name, 'overview', '', version)}>{sdkLabel(meta)}</Breadcrumbs.Item>,
                    <Breadcrumbs.Item key="page" selected>{page.title}</Breadcrumbs.Item>,
                  ]}
            </Breadcrumbs>

            <SdkSidebarMobile docs={docs} pkg={meta.name} current={page.slug} title={page.title} />

            <div>
              <Stack direction="horizontal" align="center" justify="space-between" wrap="wrap">
                <div className="sdk-article-kicker">
                  <Label variant="accent">{sdkLabel(meta)} {meta.version}</Label>
                  <Text size="small" className="docs-muted">{SDK_CATEGORY_LABEL[page.category]}</Text>
                </div>
                <SdkVersionSelector version={version} rawVersion={rawVersion} pkg={meta.name} page={page.slug} />
              </Stack>
              <Heading as="h1" className="doc-article-title">
                {page.slug === 'overview' ? sdkLabel(meta) : page.title}
              </Heading>
              <Text className="docs-muted">{page.description}</Text>
            </div>

            <SdkVersionBanner version={version} pkg={meta.name} page={page.slug} />

            {toc.length > 2 && <MobileTableOfContents sections={toc} />}

            <div className="doc-article-body sdk-article-body">
              <CodeLanguageProvider>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight, rehypeSdkLayout, rehypeCodeGroups]}
                  components={components}
                >
                  {body}
                </ReactMarkdown>
              </CodeLanguageProvider>
            </div>

            <nav className="doc-prev-next" aria-label="Previous and next page">
              {prev ? (
                <Button variant="default" size="large" leadingVisual={ArrowLeftIcon} onClick={() => go(sdkPath(prev.package, prev.slug, '', version))}>
                  {prev.title}
                </Button>
              ) : <span />}
              {next ? (
                <Button variant="default" size="large" trailingVisual={ArrowRightIcon} onClick={() => go(sdkPath(next.package, next.slug, '', version))}>
                  {next.title}
                </Button>
              ) : <span />}
            </nav>
          </Stack>
        </div>

        {toc.length > 2 && <TableOfContents sections={toc} activeSectionId={activeSectionId} />}
      </div>
    </div>
  )
}
