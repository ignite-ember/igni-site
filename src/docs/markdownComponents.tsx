/**
 * How a documentation article's markdown becomes React.
 *
 * Extracted from `DocArticlePage` so a test can import the component
 * map and render markdown through the real pipeline. It cannot live
 * beside the page component: exporting a non-component from a module
 * that defines components breaks fast refresh, and the portal's lint
 * gate treats that as an error.
 *
 * Three things are customised, each for a reason found in the rendered
 * output rather than in the source:
 *
 * - **headings** get ids that match what the table of contents slugs,
 * - **blockquotes** starting `**Tip:**` / `**Note:**` become callouts,
 * - **`igni-diagram` fences** become figures, and in-site links route
 *   client-side instead of reloading the bundle.
 */

import { type Components } from 'react-markdown'
import { Link } from 'react-router-dom'

import { Callout } from './Callout'
import { headingId } from './docsManifest'
import { DocDiagram } from './DocDiagram'

/**
 * The plain text of a heading's children.
 *
 * `String(children)` was used here, and it does not flatten React
 * nodes: for `## Managing servers (\`/mcp\`)` the children are
 * `['Managing servers (', <code>/mcp</code>, ')']` and `String` of that
 * is `Managing servers (,[object Object],)`. The id became
 * `managing-servers-object-object` while the table of contents — which
 * slugs the *raw markdown* — linked to `#managing-servers-mcp`, so the
 * entry did nothing when clicked and the DOM carried a nonsense id.
 *
 * Recursive because a heading can nest: bold inside a link inside a
 * heading is one string to a reader and three nodes here.
 */
function childrenToText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(childrenToText).join('')
  if (typeof node === 'object' && 'props' in node) {
    return childrenToText((node as { props?: { children?: React.ReactNode } }).props?.children)
  }
  return ''
}

export const markdownComponents: Components = {
  h2({ children }) {
    return <h2 id={headingId(childrenToText(children))}>{children}</h2>
  },
  h3({ children }) {
    return <h3 id={headingId(childrenToText(children))}>{children}</h3>
  },
  blockquote({ children }) {
    return <Callout>{children}</Callout>
  },
  /**
   * In-site links route client-side; `#heading` links stay on the page.
   *
   * A bare `<a href="/docs/...">` is a full page load: the whole bundle
   * is fetched again to render an article the browser already has.
   * Anything with a scheme or a `//` prefix is somebody else's site and
   * is left alone, with the usual `noreferrer` treatment.
   */
  /**
   * ```igni-diagram\nlineage``` renders a figure, not a code block.
   *
   * Hooked on the fence rather than on raw HTML because
   * `react-markdown` strips HTML by default, and turning that off to
   * get two pictures would open every article to it.
   *
   * Handled on `pre` rather than on `code` for two reasons, both found
   * by looking at the rendered page. `rehype-highlight` rewrites the
   * class to `hljs language-igni-diagram`, so an equality test on
   * `className` silently never matches; and replacing the `code` alone
   * would leave a `<figure>` inside a `<pre>`, which is not legal HTML.
   * Replacing the whole block avoids both.
   */
  pre({ node, children }) {
    const child = node?.children?.[0]
    if (child?.type === 'element' && child.tagName === 'code') {
      const classes = child.properties?.className
      const named = Array.isArray(classes) ? classes.map(String) : []
      if (named.includes('language-igni-diagram')) {
        const body = child.children?.[0]
        const name = body?.type === 'text' ? body.value : ''
        return <DocDiagram name={name} />
      }
    }
    return <pre>{children}</pre>
  },
  a({ href, children }) {
    const to = href ?? ''
    // A heading on the same page: the browser jumps to it. Opening it in
    // a new tab, as the external-link branch below would, loses the place.
    if (to.startsWith('#')) {
      return <a href={to}>{children}</a>
    }
    if (to.startsWith('/') && !to.startsWith('//')) {
      return <Link to={to} onClick={() => window.scrollTo(0, 0)}>{children}</Link>
    }
    return <a href={to} target="_blank" rel="noopener noreferrer">{children}</a>
  },
}
