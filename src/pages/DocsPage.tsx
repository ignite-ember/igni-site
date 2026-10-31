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
import './DocsPage.css'

function DocCard({ slug, title, description }: { slug: string; title: string; description: string }) {
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
          <Heading as="h3" className="doc-card-title">{title}</Heading>
          <ArrowRightIcon size={16} className="doc-card-arrow" />
        </Stack>
        <Text size="small" className="docs-muted">{description}</Text>
      </Stack>
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

  return (
    <main className="docs-public-wrapper">
    <div className="docs-page-stack">
      <div className="docs-page-header">
        <Breadcrumbs>
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

      {filtered.length === 0 ? (
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
        </div>
      )}
    </div>
    </main>
  )
}
