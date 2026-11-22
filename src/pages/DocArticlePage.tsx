import { useMemo } from 'react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useParams, useNavigate, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'
import {
  Breadcrumbs,
  Button,
  Heading,
  Stack,
  Text,
} from '@primer/react'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookIcon,
} from '@primer/octicons-react'
import { Blankslate } from '@primer/react/experimental'
import {
  articleContent,
  articlesOf,
  docHrefAt,
  docPackage,
  extractSections,
  findArticle,
  packageHrefAt,
  resolveVersion,
} from '../docs/docsManifest'
import { VersionBanner, VersionSelector } from '../docs/VersionSelector'
import { markdownComponents } from '../docs/markdownComponents'
import { MobileTableOfContents, TableOfContents } from '../docs/DocToc'
import { useActiveSectionId } from '../docs/useActiveSectionId'
import './DocsPage.css'

/** Strip the H1 title line from markdown content. */
function stripH1(content: string): string {
  return content.replace(/^# .+\n?/, '')
}

/**
 * `/docs/<package>[/<version>]/<slug>` — one article at a version (the
 * newest when the version segment is omitted or `latest`). The header
 * carries the version selector; a banner appears off-latest; prev/next
 * and the breadcrumb stay within the version being read.
 */
export function DocArticlePage(props?: { package?: string; version?: string; slug?: string }) {
  const params = useParams<{ package: string; version: string; slug: string }>()
  const pkgSlug = props?.package ?? params.package
  const rawVersion = props?.version ?? params.version
  const slug = props?.slug ?? params.slug
  const navigate = useNavigate()
  // Everything derived from the (stable) URL parts in one memo, so the
  // table-of-contents observer sees a stable `sectionIds` across renders.
  const view = useMemo(() => {
    const pkg = docPackage(pkgSlug)
    const version = resolveVersion(pkg, rawVersion)
    const siblings = articlesOf(pkgSlug)
    const docIndex = siblings.findIndex((d) => d.slug === slug)
    const doc = docIndex >= 0 ? siblings[docIndex] : findArticle(pkgSlug, slug)
    const content = articleContent(pkgSlug, version, slug)
    const toc = content ? extractSections(content) : []
    return {
      pkg,
      version,
      doc,
      body: content ? stripH1(content) : '',
      toc,
      sectionIds: toc.map((s) => s.id),
      prevDoc: docIndex > 0 ? siblings[docIndex - 1] : null,
      nextDoc: docIndex >= 0 && docIndex < siblings.length - 1 ? siblings[docIndex + 1] : null,
      found: !!doc && !!content,
    }
  }, [pkgSlug, rawVersion, slug])
  const { pkg, version, doc, body, toc, prevDoc, nextDoc } = view
  useDocumentTitle(doc ? `${doc.title} — Docs` : 'Documentation', doc?.description)
  const activeSectionId = useActiveSectionId(view.sectionIds)

  if (!view.found || !doc) {
    return (
      <Blankslate spacious>
        <Blankslate.Visual><BookIcon size={24} /></Blankslate.Visual>
        <Blankslate.Heading>Article not found</Blankslate.Heading>
        <Blankslate.Description>
          The documentation page you're looking for doesn't exist.
        </Blankslate.Description>
        <Blankslate.PrimaryAction href="/docs">Back to docs</Blankslate.PrimaryAction>
      </Blankslate>
    )
  }

  return (
    <div className="docs-public-wrapper">
    <div className="doc-article-layout">
      <div className="doc-article-main">
        <Stack gap="normal">
          <Breadcrumbs className="doc-breadcrumbs">
            <Breadcrumbs.Item as={Link} to="/">igni</Breadcrumbs.Item>
            <Breadcrumbs.Item as={Link} to="/docs">Docs</Breadcrumbs.Item>
            {pkg && (
              <Breadcrumbs.Item as={Link} to={packageHrefAt(pkg, version)}>{pkg.title}</Breadcrumbs.Item>
            )}
            <Breadcrumbs.Item selected>{doc.title}</Breadcrumbs.Item>
          </Breadcrumbs>

          <div>
            <Stack direction="horizontal" align="center" justify="space-between" wrap="wrap">
              <Heading as="h1" className="doc-article-title">{doc.title}</Heading>
              {pkg && (
                <VersionSelector pkg={pkg} version={version} rawVersion={rawVersion} article={doc} />
              )}
            </Stack>
            <Text className="docs-muted">{doc.description}</Text>
          </div>

          {pkg && <VersionBanner pkg={pkg} version={version} article={doc} />}

          {toc.length > 2 && <MobileTableOfContents sections={toc} />}

          <div className="doc-article-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={markdownComponents}>{body}</ReactMarkdown>
          </div>

          <nav className="doc-prev-next">
            {prevDoc ? (
              <Button
                variant="default"
                size="large"
                leadingVisual={ArrowLeftIcon}
                onClick={() => { navigate(docHrefAt(prevDoc, version)) }}
              >
                {prevDoc.title}
              </Button>
            ) : <span />}
            {nextDoc ? (
              <Button
                variant="default"
                size="large"
                trailingVisual={ArrowRightIcon}
                onClick={() => { navigate(docHrefAt(nextDoc, version)) }}
              >
                {nextDoc.title}
              </Button>
            ) : <span />}
          </nav>
        </Stack>
      </div>

      {toc.length > 2 && (
        <TableOfContents sections={toc} activeSectionId={activeSectionId} />
      )}
    </div>
    </div>
  )
}
