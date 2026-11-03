import { useMemo, useCallback, useState, useEffect, useRef } from 'react'
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
  ListUnorderedIcon,
} from '@primer/octicons-react'
import { Blankslate } from '@primer/react/experimental'
import { DOCS, extractSections } from '../docs/docsManifest'
import { markdownComponents } from '../docs/markdownComponents'
import './DocsPage.css'

/** Strip the H1 title line from markdown content. */
function stripH1(content: string): string {
  return content.replace(/^# .+\n?/, '')
}

/** Track which H2 section is currently visible. */
function useActiveSectionId(sectionIds: string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (sectionIds.length === 0) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
            break
          }
        }
      },
      { rootMargin: '0px 0px -70% 0px', threshold: 0 },
    )

    for (const id of sectionIds) {
      const el = document.getElementById(id)
      if (el) observerRef.current.observe(el)
    }

    return () => observerRef.current?.disconnect()
  }, [sectionIds])

  return activeId
}

/** The same list for screens too narrow for the right-hand column. */
function MobileTableOfContents({ sections }: { sections: { id: string; title: string }[] }) {
  const ref = useRef<HTMLDetailsElement>(null)
  const scrollTo = useCallback((id: string) => {
    if (ref.current) ref.current.open = false
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <details className="doc-toc-mobile" ref={ref}>
      <summary><ListUnorderedIcon size={14} /> On this page</summary>
      <ol>
        {sections.map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`} onClick={(e) => { e.preventDefault(); scrollTo(s.id) }}>{s.title}</a>
          </li>
        ))}
      </ol>
    </details>
  )
}

function TableOfContents({ sections, activeSectionId }: { sections: { id: string; title: string }[]; activeSectionId: string | null }) {
  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <nav className="doc-toc">
      <Stack gap="none">
        <Text size="small" weight="semibold" className="doc-toc-heading">
          <ListUnorderedIcon size={12} /> On this page
        </Text>
        {sections.map((s) => (
          <a
            key={s.id}
            className={`doc-toc-link ${activeSectionId === s.id ? 'doc-toc-link-active' : ''}`}
            href={`#${s.id}`}
            onClick={(e) => { e.preventDefault(); scrollTo(s.id) }}
          >
            {s.title}
          </a>
        ))}
      </Stack>
    </nav>
  )
}

export function DocArticlePage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const docIndex = DOCS.findIndex((d) => d.slug === slug)
  const doc = docIndex >= 0 ? DOCS[docIndex] : undefined
  useDocumentTitle(doc ? `${doc.title} — Docs` : 'Documentation', doc?.description)
  const prevDoc = docIndex > 0 ? DOCS[docIndex - 1] : null
  const nextDoc = docIndex >= 0 && docIndex < DOCS.length - 1 ? DOCS[docIndex + 1] : null

  const body = useMemo(() => doc ? stripH1(doc.content) : '', [doc])

  const toc = useMemo(
    () => doc ? extractSections(doc.content) : [],
    [doc],
  )

  const sectionIds = useMemo(() => toc.map((s) => s.id), [toc])
  const activeSectionId = useActiveSectionId(sectionIds)

  if (!doc) {
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
            <Breadcrumbs.Item selected>{doc.title}</Breadcrumbs.Item>
          </Breadcrumbs>

          <div>
            <Heading as="h1" className="doc-article-title">{doc.title}</Heading>
            <Text className="docs-muted">{doc.description}</Text>
          </div>

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
                onClick={() => { navigate(`/docs/${prevDoc.slug}`); window.scrollTo(0, 0) }}
              >
                {prevDoc.title}
              </Button>
            ) : <span />}
            {nextDoc ? (
              <Button
                variant="default"
                size="large"
                trailingVisual={ArrowRightIcon}
                onClick={() => { navigate(`/docs/${nextDoc.slug}`); window.scrollTo(0, 0) }}
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
