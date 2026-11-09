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
  SDK_PACKAGES,
  sdkPagesOf,
  sdkPath,
  type SdkCategory,
} from './sdkManifest'

function PageList({ pkg, current }: { pkg: string; current: string }) {
  const pages = sdkPagesOf(pkg)
  const categories: SdkCategory[] = ['guide', 'reference']
  return (
    <NavList aria-label={`${pkg} pages`}>
      {categories.map((category) => {
        const inCategory = pages.filter((p) => p.category === category)
        if (inCategory.length === 0) return null
        return (
          <NavList.Group key={category} title={SDK_CATEGORY_LABEL[category]}>
            {inCategory.map((page) => (
              <NavList.Item
                key={page.slug}
                as={Link}
                to={sdkPath(pkg, page.slug)}
                aria-current={page.slug === current ? 'page' : undefined}
              >
                {page.title}
              </NavList.Item>
            ))}
          </NavList.Group>
        )
      })}
      <NavList.Group title="Other SDKs">
        {SDK_PACKAGES.filter((p) => p.name !== pkg).map((p) => (
          <NavList.Item key={p.name} as={Link} to={sdkPath(p.name)}>
            <NavList.LeadingVisual><PackageIcon /></NavList.LeadingVisual>
            {p.name}
          </NavList.Item>
        ))}
      </NavList.Group>
    </NavList>
  )
}

/** The column beside the article, on wide screens. */
export function SdkSidebar({ pkg, current }: { pkg: string; current: string }) {
  return (
    <nav className="sdk-sidebar" aria-label={`${pkg} documentation`}>
      <Link className="sdk-sidebar-package" to={sdkPath(pkg)}>
        <PackageIcon size={16} /> {pkg}
      </Link>
      <PageList pkg={pkg} current={current} />
    </nav>
  )
}

/** The same pages, collapsed, above the article on narrow screens. */
export function SdkSidebarMobile({ pkg, current, title }: { pkg: string; current: string; title: string }) {
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
          {pkg} <span className="docs-muted">· {title}</span>
        </span>
      </summary>
      <PageList pkg={pkg} current={current} />
    </details>
  )
}
