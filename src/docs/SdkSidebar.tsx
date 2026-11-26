/**
 * One SDK package's pages, for the left of its every page: its guide,
 * then its reference, the current page marked. On a narrow screen the
 * same list is a collapsed disclosure above the article.
 */
import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { NavList } from '@primer/react'
import { PackageIcon } from '@primer/octicons-react'

import {
  SDK_CATEGORY_LABEL,
  sdkLabel,
  sdkPackage,
  sdkPagesOf,
  sdkPath,
  type SdkCategory,
  type SdkDocs,
} from './sdkManifest'

interface SidebarProps {
  /** The release being read: its pages, and links that stay in it. */
  docs: SdkDocs
  pkg: string
  current: string
}

function PageList({ docs, pkg, current }: SidebarProps) {
  const pages = sdkPagesOf(pkg, docs)
  const at = docs.version
  const categories: SdkCategory[] = ['guide', 'reference']
  return (
    <NavList aria-label={`${sdkLabel(sdkPackage(pkg, docs))} pages`}>
      {categories.map((category) => {
        const inCategory = pages.filter((p) => p.category === category)
        if (inCategory.length === 0) return null
        return (
          <NavList.Group key={category} title={SDK_CATEGORY_LABEL[category]}>
            {inCategory.map((page) => (
              <NavList.Item
                key={page.slug}
                as={Link}
                to={sdkPath(pkg, page.slug, '', at)}
                aria-current={page.slug === current ? 'page' : undefined}
              >
                {page.title}
              </NavList.Item>
            ))}
          </NavList.Group>
        )
      })}
      <NavList.Group title="Other SDKs">
        {docs.packages.filter((p) => p.name !== pkg).map((p) => (
          <NavList.Item key={p.name} as={Link} to={sdkPath(p.name, 'overview', '', at)}>
            <NavList.LeadingVisual><PackageIcon /></NavList.LeadingVisual>
            {sdkLabel(p)}
          </NavList.Item>
        ))}
      </NavList.Group>
    </NavList>
  )
}

/** The column beside the article, on wide screens. */
export function SdkSidebar({ docs, pkg, current }: SidebarProps) {
  const label = sdkLabel(sdkPackage(pkg, docs))
  return (
    <nav className="sdk-sidebar" aria-label={`${label} documentation`}>
      <Link className="sdk-sidebar-package" to={sdkPath(pkg, 'overview', '', docs.version)}>
        <PackageIcon size={16} /> {label}
      </Link>
      <PageList docs={docs} pkg={pkg} current={current} />
    </nav>
  )
}

/** The same pages, collapsed, above the article on narrow screens. */
export function SdkSidebarMobile({ docs, pkg, current, title }: SidebarProps & { title: string }) {
  const ref = useRef<HTMLDetailsElement>(null)
  const location = useLocation()
  // Following a link closes it, so the next page opens on its article.
  useEffect(() => {
    if (ref.current) ref.current.open = false
  }, [location.pathname])
  return (
    <details className="sdk-sidebar-mobile" ref={ref}>
      <summary>
        <PackageIcon size={14} />
        <span className="sdk-sidebar-mobile-label">
          {sdkLabel(sdkPackage(pkg, docs))} <span className="docs-muted">· {title}</span>
        </span>
      </summary>
      <PageList docs={docs} pkg={pkg} current={current} />
    </details>
  )
}
