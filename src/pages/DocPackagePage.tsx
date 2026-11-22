import { useMemo } from 'react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useParams, useNavigate, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'
import {
  Breadcrumbs,
  Heading,
  Label,
  PageHeader,
  Stack,
  Text,
} from '@primer/react'
import { ArrowRightIcon, BookIcon } from '@primer/octicons-react'
import { Blankslate } from '@primer/react/experimental'
import {
  articlesOf,
  CATEGORY_META,
  CATEGORY_ORDER,
  docHref,
  docPackage,
  extractSections,
  overviewArticle,
  packageVersionLabel,
  type DocArticle,
} from '../docs/docsManifest'
import { markdownComponents } from '../docs/markdownComponents'
import { MobileTableOfContents, TableOfContents } from '../docs/DocToc'
import { useActiveSectionId } from '../docs/useActiveSectionId'
import './DocsPage.css'

/** Strip the H1 title line from markdown content. */
function stripH1(content: string): string {
  return content.replace(/^# .+\n?/, '')
}

function ArticleCard({ article }: { article: DocArticle }) {
  const navigate = useNavigate()
  const to = docHref(article)
  return (
    <div
      className="doc-card"
      onClick={() => navigate(to)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(to) }}
    >
      <Stack gap="condensed">
        <Stack direction="horizontal" align="center" justify="space-between">
          <Heading as="h3" className="doc-card-title">{article.title}</Heading>
          <ArrowRightIcon size={16} className="doc-card-arrow" />
        </Stack>
        <Text size="small" className="docs-muted">{article.description}</Text>
      </Stack>
    </div>
  )
}

/**
 * `/docs/<package>` — a product's own documentation.
 *
 * A single-page package (Fleet, Artifacts, CodeIndex) renders its one
 * article inline here, so its original `/docs/<slug>` URL keeps showing
 * the content. A multi-page package (core, app, server) shows its index:
 * its articles, grouped by category, each a card.
 */
export function DocPackagePage() {
  const { package: pkgSlug } = useParams<{ package: string }>()
  const pkg = docPackage(pkgSlug)
  const overview = overviewArticle(pkgSlug)

  // Hooks must run unconditionally, before the early return below.
  const toc = useMemo(() => overview ? extractSections(overview.content) : [], [overview])
  const sectionIds = useMemo(() => toc.map((s) => s.id), [toc])
  const activeSectionId = useActiveSectionId(sectionIds)
  const body = useMemo(() => overview ? stripH1(overview.content) : '', [overview])
  const articles = useMemo(() => articlesOf(pkgSlug), [pkgSlug])

  useDocumentTitle(
    pkg ? `${pkg.title} — Docs` : 'Documentation',
    pkg?.tagline,
  )

  if (!pkg) {
    return (
      <Blankslate spacious>
        <Blankslate.Visual><BookIcon size={24} /></Blankslate.Visual>
        <Blankslate.Heading>Documentation not found</Blankslate.Heading>
        <Blankslate.Description>
          There is no documentation package by that name.
        </Blankslate.Description>
        <Blankslate.PrimaryAction href="/docs">Back to docs</Blankslate.PrimaryAction>
      </Blankslate>
    )
  }

  const versionLabel = packageVersionLabel(pkg)

  // ── Single-page package: render its one article inline ──────────────
  if (overview) {
    return (
      <div className="docs-public-wrapper">
        <div className="doc-article-layout">
          <div className="doc-article-main">
            <Stack gap="normal">
              <Breadcrumbs className="doc-breadcrumbs">
                <Breadcrumbs.Item as={Link} to="/">igni</Breadcrumbs.Item>
                <Breadcrumbs.Item as={Link} to="/docs">Docs</Breadcrumbs.Item>
                <Breadcrumbs.Item selected>{pkg.title}</Breadcrumbs.Item>
              </Breadcrumbs>

              <div>
                <Stack direction="horizontal" align="center" gap="condensed">
                  <Heading as="h1" className="doc-article-title">{overview.title}</Heading>
                  {versionLabel && <Label>{versionLabel}</Label>}
                </Stack>
                <Text className="docs-muted">{overview.description}</Text>
              </div>

              {toc.length > 2 && <MobileTableOfContents sections={toc} />}

              <div className="doc-article-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={markdownComponents}>{body}</ReactMarkdown>
              </div>
            </Stack>
          </div>

          {toc.length > 2 && (
            <TableOfContents sections={toc} activeSectionId={activeSectionId} />
          )}
        </div>
      </div>
    )
  }

  // ── Multi-page package: an index of its articles ────────────────────
  return (
    <main className="docs-public-wrapper">
      <div className="docs-page-stack">
        <div className="docs-page-header">
          <Breadcrumbs className="doc-breadcrumbs">
            <Breadcrumbs.Item as={Link} to="/">igni</Breadcrumbs.Item>
            <Breadcrumbs.Item as={Link} to="/docs">Docs</Breadcrumbs.Item>
            <Breadcrumbs.Item selected>{pkg.title}</Breadcrumbs.Item>
          </Breadcrumbs>
          <PageHeader>
            <PageHeader.TitleArea>
              <PageHeader.LeadingVisual><BookIcon size={24} /></PageHeader.LeadingVisual>
              <PageHeader.Title as="h1">{pkg.title}</PageHeader.Title>
            </PageHeader.TitleArea>
            <PageHeader.Description>
              <Stack direction="horizontal" align="center" gap="condensed">
                <Text size="medium">{pkg.tagline}</Text>
                {versionLabel && <Label>{versionLabel}</Label>}
              </Stack>
            </PageHeader.Description>
          </PageHeader>
        </div>

        <div className="docs-categories-stack">
          {CATEGORY_ORDER.map((catKey) => {
            const inCat = articles.filter((d) => d.category === catKey)
            if (inCat.length === 0) return null
            const meta = CATEGORY_META[catKey]
            return (
              <div key={catKey} className="docs-category-section">
                <div>
                  <Heading as="h2" className="doc-category-title">{meta.label}</Heading>
                  <Text size="small" className="docs-muted">{meta.description}</Text>
                </div>
                <div className="docs-card-grid">
                  {inCat.map((doc) => (
                    <ArticleCard key={`${doc.package}/${doc.slug}`} article={doc} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
