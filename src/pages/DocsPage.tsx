import { useState, useMemo } from 'react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useNavigate } from 'react-router-dom'
import {
  Breadcrumbs,
  Heading,
  PageHeader,
  Stack,
  Text,
  TextInput,
} from '@primer/react'
import { Link } from 'react-router-dom'
import {
  ArrowRightIcon,
  BookIcon,
  SearchIcon,
} from '@primer/octicons-react'
import { Blankslate } from '@primer/react/experimental'
import { DOCS, CATEGORY_META, CATEGORY_ORDER } from '../docs/docsManifest'
import { SDK_PACKAGES, SDK_ROLES, sdkPath, searchSdk } from '../docs/sdkManifest'
import './DocsPage.css'
import './SdkDocs.css'

function DocCard({ slug, title, description, titleClass = 'doc-card-title' }: { slug: string; title: string; description: string; titleClass?: string }) {
  const navigate = useNavigate()

  return (
    <div
      className="doc-card"
      onClick={() => navigate(`/docs/${slug}`)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/docs/${slug}`) }}
    >
      <Stack gap="condensed">
        <Stack direction="horizontal" align="center" justify="space-between">
          <Heading as="h3" className={titleClass}>{title}</Heading>
          <ArrowRightIcon size={16} className="doc-card-arrow" />
        </Stack>
        <Text size="small" className="docs-muted">{description}</Text>
      </Stack>
    </div>
  )
}

/**
 * The SDKs, after the articles: a card per package, or — while searching —
 * the SDK pages, methods and models that match. Its heading has a class
 * of its own: the category headings above are the manifest's categories,
 * and a test holds them to it.
 */
function SdkSection({ query, hits }: { query: string; hits: ReturnType<typeof searchSdk> }) {
  if (query.trim() && hits.length === 0) return null
  return (
    <div className="docs-category-section">
      <div>
        <Heading as="h2" className="docs-sdk-title">SDK</Heading>
        <Text size="small" className="docs-muted">
          The Python SDKs: drive an igni, build an extension, run its service.{' '}
          <Link to="/docs/sdk">All SDK documentation</Link>
        </Text>
      </div>
      {query.trim() ? (
        <ul className="sdk-hits" aria-label="SDK search results">
          {hits.map((hit) => (
            <li key={hit.path}>
              <Link to={hit.path} className="sdk-hit">
                <span className="sdk-hit-title">{hit.title}</span>
                <span className="docs-muted sdk-hit-context">{hit.context}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="docs-card-grid">
          {SDK_PACKAGES.map((pkg) => (
            <DocCard
              key={pkg.name}
              slug={sdkPath(pkg.name).replace(/^\/docs\//, '')}
              title={pkg.name}
              description={SDK_ROLES[pkg.name]?.forWhat ?? pkg.description}
              titleClass="sdk-card-title"
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function DocsPage() {
  useDocumentTitle('Documentation', 'Guides for igni: onboarding, agents, tools, orchestration, CodeIndex, configuration, and migration from Claude Code.')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query.trim()) return DOCS
    const q = query.toLowerCase()
    return DOCS.filter(
      (d) => d.title.toLowerCase().includes(q) || d.description.toLowerCase().includes(q),
    )
  }, [query])
  // The SDKs' pages are searched too, down to a method or a model.
  const sdkHits = useMemo(() => searchSdk(query, 12), [query])

  return (
    <main className="docs-public-wrapper">
    <div className="docs-page-stack">
      <div className="docs-page-header">
        <Breadcrumbs className="doc-breadcrumbs">
          <Breadcrumbs.Item as={Link} to="/">igni</Breadcrumbs.Item>
          <Breadcrumbs.Item selected>Docs</Breadcrumbs.Item>
        </Breadcrumbs>
        <PageHeader>
          <PageHeader.TitleArea>
            <PageHeader.LeadingVisual><BookIcon size={24} /></PageHeader.LeadingVisual>
            <PageHeader.Title as="h1">Documentation</PageHeader.Title>
          </PageHeader.TitleArea>
          <PageHeader.Description>
            <Text size="medium">Guides and references for igni</Text>
          </PageHeader.Description>
        </PageHeader>

        <TextInput
          leadingVisual={SearchIcon}
          aria-label="Search documentation"
          placeholder="Search documentation..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="docs-search"
        />
      </div>

      {filtered.length === 0 && sdkHits.length === 0 ? (
        <Blankslate spacious>
          <Blankslate.Visual><BookIcon size={24} /></Blankslate.Visual>
          <Blankslate.Heading>{DOCS.length === 0 ? 'No documentation yet' : 'No results found'}</Blankslate.Heading>
          {DOCS.length > 0 && (
            <Blankslate.Description>Try a different search term.</Blankslate.Description>
          )}
        </Blankslate>
      ) : (
        <div className="docs-categories-stack">
          {CATEGORY_ORDER.map((catKey) => {
            const meta = CATEGORY_META[catKey]
            const articles = filtered.filter((d) => d.category === catKey)
            if (articles.length === 0) return null

            return (
              <div key={catKey} className="docs-category-section">
                <div>
                  <Heading as="h2" className="doc-category-title">{meta.label}</Heading>
                  <Text size="small" className="docs-muted">{meta.description}</Text>
                </div>
                <div className="docs-card-grid">
                  {articles.map((doc) => (
                    <DocCard
                      key={doc.slug}
                      slug={doc.slug}
                      title={doc.title}
                      description={doc.description}
                    />
                  ))}
                </div>
              </div>
            )
          })}
          <SdkSection query={query} hits={sdkHits} />
        </div>
      )}
    </div>
    </main>
  )
}
