import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Breadcrumbs, Heading, Label, PageHeader, Text, TextInput } from '@primer/react'
import { ArrowRightIcon, PackageIcon, SearchIcon } from '@primer/octicons-react'
import { Blankslate } from '@primer/react/experimental'

import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { SDK_PACKAGES, SDK_ROLES, sdkLabel, sdkPagesOf, sdkPath, searchSdk } from '../docs/sdkManifest'
import './DocsPage.css'
import './SdkDocs.css'

/**
 * `/docs/sdk`: the six published SDKs — three on PyPI, three on npm —
 * what each is for and where it runs, and a search over every page of
 * all six — down to a single method or model.
 */
export function SdkLandingPage() {
  useDocumentTitle(
    'SDK documentation',
    'igni-client, igni-extension, igni-service, extension-bridge, ui-react and ui-css: guides and the complete API reference of all six.',
  )
  const [query, setQuery] = useState('')
  const hits = useMemo(() => searchSdk(query, 30), [query])

  return (
    <main className="docs-public-wrapper">
      <div className="docs-page-stack">
        <div className="docs-page-header">
          <Breadcrumbs className="doc-breadcrumbs">
            <Breadcrumbs.Item as={Link} to="/">igni</Breadcrumbs.Item>
            <Breadcrumbs.Item as={Link} to="/docs">Docs</Breadcrumbs.Item>
            <Breadcrumbs.Item selected>SDK</Breadcrumbs.Item>
          </Breadcrumbs>
          <PageHeader>
            <PageHeader.TitleArea>
              <PageHeader.LeadingVisual><PackageIcon size={24} /></PageHeader.LeadingVisual>
              <PageHeader.Title as="h1">SDK documentation</PageHeader.Title>
            </PageHeader.TitleArea>
            <PageHeader.Description>
              <Text size="medium">
                Six packages, released together: three on PyPI, three on npm. Every method, model,
                event and component has its own entry, generated from the SDKs and igni’s contract.
              </Text>
            </PageHeader.Description>
          </PageHeader>
          <TextInput
            leadingVisual={SearchIcon}
            aria-label="Search the SDK documentation"
            placeholder="Search pages, methods and models…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="docs-search"
          />
        </div>

        {query.trim() ? (
          hits.length === 0 ? (
            <Blankslate spacious>
              <Blankslate.Heading>No results found</Blankslate.Heading>
              <Blankslate.Description>Try a method’s name, like scheduler.list.</Blankslate.Description>
            </Blankslate>
          ) : (
            <ul className="sdk-hits" aria-label="Search results">
              {hits.map((hit) => (
                <li key={hit.path}>
                  <Link to={hit.path} className="sdk-hit">
                    <span className="sdk-hit-title">{hit.title}</span>
                    <span className="docs-muted sdk-hit-context">{hit.context}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : (
          <div className="sdk-packages">
            {SDK_PACKAGES.map((pkg) => {
              const role = SDK_ROLES[pkg.name]
              const pages = sdkPagesOf(pkg.name)
              const quick = pages.find((p) => p.slug === 'quick-start')
              const reference = pages.find((p) => p.category === 'reference')
              return (
                <section key={pkg.name} className="sdk-package-card" aria-labelledby={`sdk-${pkg.name}`}>
                  <div className="sdk-package-head">
                    <Heading as="h2" id={`sdk-${pkg.name}`} className="sdk-package-title">
                      <PackageIcon size={16} /> {sdkLabel(pkg)}
                    </Heading>
                    <Label>{pkg.version}</Label>
                  </div>
                  <Text as="p" className="sdk-package-for">{role?.forWhat ?? pkg.description}</Text>
                  {role && (
                    <Text as="p" size="small" className="docs-muted">
                      <strong>Where it runs:</strong> {role.runsWhere}
                    </Text>
                  )}
                  <Text as="p" size="small" className="docs-muted">
                    <code>{pkg.install}</code> ·{' '}
                    <code>
                      {pkg.registry === 'PyPI' ? `import ${pkg.importName}` : `from "${pkg.importName}"`}
                    </code>
                  </Text>
                  <Text as="p" size="small" className="docs-muted">
                    On{' '}
                    <a href={pkg.registryUrl} target="_blank" rel="noopener noreferrer">
                      {pkg.registry}
                    </a>{' '}
                    ·{' '}
                    <a href={pkg.source} target="_blank" rel="noopener noreferrer">
                      source
                    </a>
                  </Text>
                  <div className="sdk-package-links">
                    <Link to={sdkPath(pkg.name)} className="sdk-package-link">
                      Overview <ArrowRightIcon size={14} />
                    </Link>
                    {quick && (
                      <Link to={sdkPath(pkg.name, quick.slug)} className="sdk-package-link">
                        Quick start <ArrowRightIcon size={14} />
                      </Link>
                    )}
                    {reference && (
                      <Link to={sdkPath(pkg.name, reference.slug)} className="sdk-package-link">
                        Reference <ArrowRightIcon size={14} />
                      </Link>
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
