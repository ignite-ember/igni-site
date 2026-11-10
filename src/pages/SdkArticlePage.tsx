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
import { markdownComponents } from '../docs/markdownComponents'
import { rehypeSdkLayout } from '../docs/rehypeSdkLayout'
import { MobileTableOfContents, TableOfContents } from '../docs/DocToc'
import { useActiveSectionId } from '../docs/useActiveSectionId'
import { SdkSidebar, SdkSidebarMobile } from '../docs/SdkSidebar'
import { SDK_CATEGORY_LABEL, loadSdkContent, sdkPackage, sdkPage, sdkPagesOf, sdkPath, sdkToc } from '../docs/sdkManifest'
import './DocsPage.css'
import './SdkDocs.css'

/**
 * One page of an SDK's documentation: `/docs/sdk/<package>` (its
 * overview) and `/docs/sdk/<package>/<page>`.
 *
 * The pages are igni-sdk's, copied by `scripts/sync-sdk-docs.mjs`; this
 * renders them with the documentation's own renderer, between the
 * package's page list and the page's table of contents. Every method of
 * igni-client is a `##` heading, so it has an anchor and a place in the
 * table of contents; `/docs/sdk/igni-client/scheduler#session-scheduler-list`
 * opens at it.
 */
export function SdkArticlePage() {
  const { pkg, page: slug } = useParams<{ pkg: string; page?: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const meta = sdkPackage(pkg)
  const page = sdkPage(pkg, slug)
  useDocumentTitle(
    page ? `${page.title} — ${page.package} — Docs` : 'SDK documentation',
    page?.description,
  )

  // The page's markdown is a chunk of its own, fetched on arrival.
  const [loaded, setLoaded] = useState<{ file: string; body: string } | null>(null)
  useEffect(() => {
    if (!page) return
    let live = true
    loadSdkContent(page).then((content) => {
      if (live) setLoaded({ file: page.file, body: content.replace(/^# .+\n?/, '') })
    })
    return () => {
      live = false
    }
  }, [page])
  const body = page && loaded?.file === page.file ? loaded.body : ''
  const toc = useMemo(() => (page ? sdkToc(page) : []), [page])
  const sectionIds = useMemo(() => toc.map((s) => s.id), [toc])
  const activeSectionId = useActiveSectionId(sectionIds)

  const pages = page ? sdkPagesOf(page.package) : []
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

  if (!meta || !page) {
    return (
      <Blankslate spacious>
        <Blankslate.Visual><BookIcon size={24} /></Blankslate.Visual>
        <Blankslate.Heading>Page not found</Blankslate.Heading>
        <Blankslate.Description>
          There is no such page in the SDK documentation.
        </Blankslate.Description>
        <Blankslate.PrimaryAction href="/docs/sdk">SDK documentation</Blankslate.PrimaryAction>
      </Blankslate>
    )
  }

  const go = (to: string) => {
    navigate(to)
    window.scrollTo(0, 0)
  }

  return (
    <div className="docs-public-wrapper sdk-wrapper">
      <div className="sdk-layout">
        <SdkSidebar pkg={meta.name} current={page.slug} />

        <div className="doc-article-main">
          <Stack gap="normal">
            <Breadcrumbs className="doc-breadcrumbs">
              <Breadcrumbs.Item as={Link} to="/">igni</Breadcrumbs.Item>
              <Breadcrumbs.Item as={Link} to="/docs">Docs</Breadcrumbs.Item>
              <Breadcrumbs.Item as={Link} to="/docs/sdk">SDK</Breadcrumbs.Item>
              {page.slug === 'overview'
                ? <Breadcrumbs.Item selected>{meta.name}</Breadcrumbs.Item>
                : [
                    <Breadcrumbs.Item key="pkg" as={Link} to={sdkPath(meta.name)}>{meta.name}</Breadcrumbs.Item>,
                    <Breadcrumbs.Item key="page" selected>{page.title}</Breadcrumbs.Item>,
                  ]}
            </Breadcrumbs>

            <SdkSidebarMobile pkg={meta.name} current={page.slug} title={page.title} />

            <div>
              <div className="sdk-article-kicker">
                <Label variant="accent">{meta.name} {meta.version}</Label>
                <Text size="small" className="docs-muted">{SDK_CATEGORY_LABEL[page.category]}</Text>
              </div>
              <Heading as="h1" className="doc-article-title">
                {page.slug === 'overview' ? meta.name : page.title}
              </Heading>
              <Text className="docs-muted">{page.description}</Text>
            </div>

            {toc.length > 2 && <MobileTableOfContents sections={toc} />}

            <div className="doc-article-body sdk-article-body">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight, rehypeSdkLayout]}
                components={markdownComponents}
              >
                {body}
              </ReactMarkdown>
            </div>

            <nav className="doc-prev-next" aria-label="Previous and next page">
              {prev ? (
                <Button variant="default" size="large" leadingVisual={ArrowLeftIcon} onClick={() => go(sdkPath(prev.package, prev.slug))}>
                  {prev.title}
                </Button>
              ) : <span />}
              {next ? (
                <Button variant="default" size="large" trailingVisual={ArrowRightIcon} onClick={() => go(sdkPath(next.package, next.slug))}>
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
