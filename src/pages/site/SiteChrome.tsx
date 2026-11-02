import { useCallback, useEffect, useState } from 'react'
import { ChevronDownIcon, MarkGithubIcon } from '@primer/octicons-react'
import { IgniLogo } from '../../components/IgniLogo'
import { CALENDLY_URL, COMPARE_AGENTCORE, CONTACT_EMAIL, GITHUB_REPO, PRODUCT_GROUPS, PRODUCTS, mailto } from './siteData'

function productsIn(slugs: string[]) {
  return slugs.map((slug) => PRODUCTS.find((p) => p.slug === slug)!).filter(Boolean)
}

/* ── The public site's nav and footer ─────────────────────────────
 *
 * Shared by the landing page and the product pages. On the landing page
 * the section links are in-page anchors; on a product page they point
 * back to the landing page's sections.
 */

const SECTIONS: { id: string; label: string }[] = [
  { id: 'security', label: 'Security' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'start', label: 'How you buy' },
  { id: 'partners', label: 'For integrators' },
]

function sectionHref(id: string, home: boolean): string {
  return home ? `#${id}` : `/#${id}`
}

export function SiteNav({ home = false }: { home?: boolean }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), [])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1060px)')
    const handler = () => { if (mq.matches) setMobileNavOpen(false) }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <>
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <a href="/" className="landing-nav-brand">
            <IgniLogo size={32} />
            <h1>igni</h1>
          </a>
          <ul className="landing-nav-links lp-nav-center">
            {/* Opens on hover and on keyboard focus; no state to get stuck. */}
            <li className="lp-nav-products">
              <button type="button" className="lp-nav-products-btn" aria-haspopup="true">
                Products <ChevronDownIcon size={12} />
              </button>
              {/* One column per kind of product, side by side. */}
              <div className="lp-nav-menu">
                {PRODUCT_GROUPS.map((g) => (
                  <div key={g.label} className="lp-nav-menu-group">
                    <span className="lp-nav-menu-label">{g.label}</span>
                    <span className="lp-nav-menu-note">{g.note}</span>
                    {productsIn(g.slugs).map((p) => (
                      <a key={p.slug} href={`/${p.slug}`}>
                        <strong>{p.name}</strong>
                        <span>{p.line}</span>
                      </a>
                    ))}
                  </div>
                ))}
              </div>
            </li>
            {SECTIONS.map((n) => (
              <li key={n.id}><a href={sectionHref(n.id, home)}>{n.label}</a></li>
            ))}
            <li><a href="/docs">Docs</a></li>
          </ul>
          {/* The bar is three parts: the logo, the links centred on the
              page, and these two buttons at the right edge.
              No Sign in: the public site is the landing page's alone, and
              Ignite Ember hosts nothing a visitor could sign in to. */}
          <ul className="landing-nav-links lp-nav-actions">
            <li>
              <a
                href={CALENDLY_URL}
                className="landing-btn-primary lp-nav-cta"
                target="_blank"
                rel="noopener noreferrer"
              >
                Schedule a call
              </a>
            </li>
            <li>
              {/* A plain link, no live star count: the count was a call
                  to api.github.com from a page sold to air-gapped buyers,
                  and a small number read as a small company. */}
              <a href={`https://github.com/${GITHUB_REPO}`} className="landing-nav-github">
                <MarkGithubIcon size={16} /> Source
              </a>
            </li>
          </ul>
          <button
            className="landing-nav-hamburger"
            onClick={() => setMobileNavOpen((o) => !o)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileNavOpen}
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {mobileNavOpen && (
        <div className="landing-mobile-nav-overlay" onClick={closeMobileNav}>
          <div className="landing-mobile-nav" onClick={(e) => e.stopPropagation()}>
            {PRODUCT_GROUPS.map((g) => (
              <div key={g.label} className="lp-mobile-nav-group">
                <span className="lp-nav-menu-label">{g.label}</span>
                {productsIn(g.slugs).map((p) => (
                  <a key={p.slug} href={`/${p.slug}`} onClick={closeMobileNav}>{p.name}</a>
                ))}
              </div>
            ))}
            {SECTIONS.map((n) => (
              <a key={n.id} href={sectionHref(n.id, home)} onClick={closeMobileNav}>{n.label}</a>
            ))}
            <a href="/docs" onClick={closeMobileNav}>Docs</a>
            <a
              href={CALENDLY_URL}
              onClick={closeMobileNav}
              className="landing-btn-primary"
              target="_blank"
              rel="noopener noreferrer"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Schedule a call
            </a>
          </div>
        </div>
      )}
    </>
  )
}

export function SiteFooter({ home = false }: { home?: boolean }) {
  return (
    <footer className="landing-footer">
      <span className="landing-footer-text">
        &copy; {new Date().getFullYear()} Ignite Ember, the Netherlands. The igni base
        platform is open source under Apache-2.0.
      </span>
      <ul className="landing-footer-links">
        {PRODUCTS.map((p) => (
          <li key={p.slug}><a href={`/${p.slug}`}>{p.name}</a></li>
        ))}
        {SECTIONS.map((n) => (
          <li key={n.id}><a href={sectionHref(n.id, home)}>{n.label}</a></li>
        ))}
        <li><a href="/docs">Docs</a></li>
        <li><a href={COMPARE_AGENTCORE}>igni vs AgentCore</a></li>
        <li>
          <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer">
            Schedule a call
          </a>
        </li>
        <li>
          <a href={mailto('igni')}>{CONTACT_EMAIL}</a>
        </li>
      </ul>
    </footer>
  )
}
