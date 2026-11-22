/**
 * Adjacent language code blocks become one language-tab group.
 *
 * The SDK docs emit an example in both languages as two fenced blocks
 * back to back — ```` ```python ```` then ```` ```typescript ````. On
 * their own each is a plain code block; together they are one example a
 * reader switches between. This rehype plugin — run after
 * `rehype-highlight`, which tags each block with its `language-*` class,
 * and after `rehypeSdkLayout`, which has already shaped the lines — finds
 * a run of two or more consecutive code blocks whose languages are
 * distinct and known (Python and TypeScript) and wraps them in a single
 * `div.code-group`, tagging each `<pre>` with `code-lang-<language>`. The
 * renderer turns that into one toggle (see `CodeLanguage.tsx`). A lone
 * block, or one in any other language, is left exactly as it was — so a
 * block with only one language has no toggle.
 *
 * The convention is purely positional: no special fence info-string is
 * needed, the generator just emits the two blocks in order. Two paired
 * examples back to back ([py, ts, py, ts]) split into two groups, because
 * a run ends as soon as a language repeats.
 */

interface Text {
  type: 'text'
  value: string
}

interface Element {
  type: 'element'
  tagName: string
  properties?: Record<string, unknown>
  children: Node[]
}

interface Other {
  type: 'root' | 'comment' | 'doctype' | 'raw'
  children?: Node[]
}

type Node = Text | Element | Other

/** Python and TypeScript, with the fence aliases `rehype-highlight` may leave. */
const KNOWN_LANGUAGES: Record<string, string> = {
  python: 'python',
  py: 'python',
  typescript: 'typescript',
  ts: 'typescript',
}

function isElement(node: Node, tag?: string): node is Element {
  return node.type === 'element' && (tag === undefined || node.tagName === tag)
}

function isBlankText(node: Node): boolean {
  return node.type === 'text' && node.value.trim() === ''
}

function classNames(el: Element): string[] {
  const classes = el.properties?.className
  return Array.isArray(classes) ? classes.map(String) : []
}

/** The language of a `<pre>`'s code block, normalised, or `null` when it is not one to group. */
function codeLanguage(pre: Element): string | null {
  const code = pre.children.find((child): child is Element => isElement(child, 'code'))
  if (!code) return null
  for (const name of classNames(code)) {
    if (name.startsWith('language-')) {
      const lang = name.slice('language-'.length).toLowerCase()
      if (lang in KNOWN_LANGUAGES) return KNOWN_LANGUAGES[lang]
    }
  }
  return null
}

/** The children of one parent, with each run of paired code blocks wrapped. */
function regroup(children: Node[]): Node[] {
  const out: Node[] = []
  let index = 0
  while (index < children.length) {
    const child = children[index]
    if (!(isElement(child, 'pre') && codeLanguage(child))) {
      out.push(child)
      index += 1
      continue
    }
    // Collect the run: consecutive `<pre>` blocks (blank text between them
    // ignored) whose languages stay distinct.
    const run: Element[] = []
    const seen = new Set<string>()
    let at = index
    while (at < children.length) {
      let next = at
      while (next < children.length && isBlankText(children[next])) next += 1
      const candidate = children[next]
      if (!candidate || !isElement(candidate, 'pre')) break
      const lang = codeLanguage(candidate)
      if (!lang || seen.has(lang)) break
      run.push(candidate)
      seen.add(lang)
      at = next + 1
    }
    if (run.length < 2) {
      out.push(child)
      index += 1
      continue
    }
    for (const pre of run) {
      pre.properties = {
        ...pre.properties,
        className: [...classNames(pre), `code-lang-${codeLanguage(pre)!}`],
      }
    }
    out.push({
      type: 'element',
      tagName: 'div',
      properties: { className: ['code-group'] },
      children: run,
    })
    index = at
  }
  return out
}

function walk(node: Node): void {
  if ('children' in node && node.children) {
    // Depth-first into the original children, then group siblings at this
    // level. The wrapper `div.code-group` is not walked again — its `<pre>`
    // children were already visited — so grouping never re-wraps itself.
    for (const child of node.children) walk(child)
    node.children = regroup(node.children)
  }
}

export function rehypeCodeGroups() {
  return (tree: Node) => {
    walk(tree)
  }
}
