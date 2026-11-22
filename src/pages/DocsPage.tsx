import { useState, useMemo } from 'react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useNavigate } from 'react-router-dom'
import {
  Breadcrumbs,
  Heading,
  Label,
  PageHeader,
  Stack,
  Text,
  TextInput,
} from '@primer/react'
import { Link } from 'react-router-dom'
import {
  ArrowRightIcon,
  BookIcon,
  PackageIcon,
  SearchIcon,
} from '@primer/octicons-react'
import { Blankslate } from '@primer/react/experimental'
import {
  DOCS,
  PACKAGES,
  docHref,
  docPackage,
  packageHref,
  packageVersionLabel,
  type DocArticle,
  type DocPackage,
} from '../docs/docsManifest'
import { searchSdk } from '../docs/sdkManifest'
import './DocsPage.css'
import './SdkDocs.css'

/**
 * A product card on the `/docs` grid: a package's title, its current
 * version and a one-line description, linking into that package's docs.
 */
function PackageCard({ pkg }: { pkg: DocPackage }) {
  const navigate = useNavigate()
  const to = packageHref(pkg)
  const version = packageVersionLabel(pkg)
  return (
    <div
      className="doc-card product-card"
      onClick={() => navigate(to)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(to) }}
    >
      <Stack gap="condensed">
        <Stack direction="horizontal" align="center" justify="space-between">
          <Heading as="h3" className="product-card-title">{pkg.title}</Heading>
          {version && <Label>{version}</Label>}
        </Stack>
        <Text size="small" className="docs-muted">{pkg.tagline}</Text>
      </Stack>
    </div>
  )
}

/** A card for a single article, shown while searching. */
function ArticleCard({ article }: { article: DocArticle }) {
  const navigate = useNavigate()
  const to = docHref(article)
  const pkg = docPackage(article.package)
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
        <Text size="small" className="docs-muted">
          {pkg ? `${pkg.title} · ` : ''}{article.description}
        </Text>
      </Stack>
    </div>
  )
}

/**
 * The SDK, shown as a product card in the grid and — while searching —
 * as the SDK pages, methods and models that match.
 */
function SdkSection({ query, hits }: { query: string; hits: ReturnType<typeof searchSdk> }) {
  if (query.trim() && hits.length === 0) return null
  return (
    <div className="docs-category-section">
      <div>
        <Heading as="h2" className="docs-sdk-title">SDK</Heading>
        <Text size="small" className="docs-muted">
          The Python and TypeScript SDKs: drive an igni, build an extension, run its service, build a page.{' '}
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
          <SdkCard />
        </div>
      )}
    </div>
  )
}

function SdkCard() {
  const navigate = useNavigate()
  return (
    <div
      className="doc-card product-card"
      onClick={() => navigate('/docs/sdk')}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate('/docs/sdk') }}
    >
      <Stack gap="condensed">
        <Stack direction="horizontal" align="center" justify="space-between">
          <Heading as="h3" className="product-card-title">
            <PackageIcon size={16} /> SDKs
          </Heading>
          <ArrowRightIcon size={16} className="doc-card-arrow" />
        </Stack>
        <Text size="small" className="docs-muted">
          Six published packages — igni-client, igni-service, igni-extension and the three TypeScript page packages — with the full generated reference.
        </Text>
      </Stack>
    </div>
  )
}

export function DocsPage() {
  useDocumentTitle('Documentation', 'Documentation for igni, per package: core, the app, the server, Fleet, Artifacts, CodeIndex and the SDKs.')
  const [query, setQuery] = useState('')

  const matches = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return DOCS.filter(
      (d) => d.title.toLowerCase().includes(q) || d.description.toLowerCase().includes(q),
    )
  }, [query])
  const sdkHits = useMemo(() => searchSdk(query, 12), [query])

  const searching = query.trim().length > 0

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
            <Text size="medium">Pick a product, or search across every package</Text>
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

      {searching ? (
        matches.length === 0 && sdkHits.length === 0 ? (
          <Blankslate spacious>
            <Blankslate.Visual><BookIcon size={24} /></Blankslate.Visual>
            <Blankslate.Heading>No results found</Blankslate.Heading>
            <Blankslate.Description>Try a different search term.</Blankslate.Description>
          </Blankslate>
        ) : (
          <div className="docs-categories-stack">
            {matches.length > 0 && (
              <div className="docs-category-section">
                <div>
                  <Heading as="h2" className="doc-category-title">Articles</Heading>
                  <Text size="small" className="docs-muted">Matching documentation across every package</Text>
                </div>
                <div className="docs-card-grid">
                  {matches.map((doc) => (
                    <ArticleCard key={`${doc.package}/${doc.slug}`} article={doc} />
                  ))}
                </div>
              </div>
            )}
            <SdkSection query={query} hits={sdkHits} />
          </div>
        )
      ) : (
        <div className="docs-categories-stack">
          <div className="docs-category-section">
            <div>
              <Heading as="h2" className="doc-category-title">Products</Heading>
              <Text size="small" className="docs-muted">Each package has its own documentation</Text>
            </div>
            <div className="docs-card-grid">
              {PACKAGES.map((pkg) => (
                <PackageCard key={pkg.slug} pkg={pkg} />
              ))}
              <SdkCard />
            </div>
          </div>
        </div>
      )}
    </div>
    </main>
  )
}
