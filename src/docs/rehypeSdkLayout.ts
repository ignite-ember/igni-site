/**
 * What the SDK pages' tables and code need to read on a phone, added to
 * the rendered tree (a rehype plugin, run after `rehype-highlight`).
 *
 * **Tables.** A parameter or field table is four columns, and on a phone
 * the fourth — what the thing means — was off the screen. Below the
 * table breakpoint `SdkDocs.css` shows each row as a card instead. For
 * that every cell carries its column's name in a `.sdk-cell-label`
 * (hidden from screen readers, which hear the real header), and the
 * table, its rows and cells carry explicit ARIA roles, because a table
 * whose CSS `display` changes loses its table semantics in some
 * browsers; with the roles a screen reader still reads a table.
 *
 * **Code.** Each line of a code block becomes a `.code-line` that knows
 * its indentation, so on a phone a long line can wrap and its
 * continuation hangs under its own indentation instead of the margin —
 * a signature written one parameter a line keeps its shape.
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

function isElement(node: Node, tag?: string): node is Element {
  return node.type === 'element' && (tag === undefined || node.tagName === tag)
}

function textOf(node: Node): string {
  if (node.type === 'text') return node.value
  if ('children' in node && node.children) return node.children.map(textOf).join('')
  return ''
}

function walk(node: Node, visit: (el: Element) => void) {
  if (isElement(node)) visit(node)
  if ('children' in node && node.children) for (const child of node.children) walk(child, visit)
}

function withRole(el: Element, role: string) {
  el.properties = { ...el.properties, role }
}

function labelTable(table: Element) {
  withRole(table, 'table')
  const headers: string[] = []
  walk(table, (el) => {
    if (el.tagName === 'thead' || el.tagName === 'tbody') withRole(el, 'rowgroup')
    if (el.tagName === 'tr') withRole(el, 'row')
    if (el.tagName === 'th') {
      withRole(el, 'columnheader')
      headers.push(textOf(el).trim())
    }
  })
  walk(table, (el) => {
    if (el.tagName !== 'tr') return
    let column = 0
    for (const cell of el.children) {
      if (!isElement(cell, 'td')) continue
      withRole(cell, 'cell')
      const label = headers[column++] ?? ''
      if (!textOf(cell).trim()) {
        // Nothing to say: as a card it would be a label over nothing.
        cell.properties = { ...cell.properties, className: ['sdk-cell-empty'] }
      } else if (label) {
        cell.children.unshift({
          type: 'element',
          tagName: 'span',
          properties: { className: ['sdk-cell-label'], ariaHidden: 'true' },
          children: [{ type: 'text', value: label }],
        })
      }
    }
  })
}

/** `nodes` cut at each newline into lines, nested highlight spans cloned on either side. */
function splitLines(nodes: Node[]): Node[][] {
  const lines: Node[][] = [[]]
  for (const node of nodes) {
    if (node.type === 'text') {
      const parts = node.value.split('\n')
      parts.forEach((part, i) => {
        if (i > 0) lines.push([])
        if (part) lines[lines.length - 1].push({ type: 'text', value: part })
      })
    } else if (isElement(node)) {
      const inner = splitLines(node.children)
      inner.forEach((children, i) => {
        if (i > 0) lines.push([])
        if (children.length) lines[lines.length - 1].push({ ...node, children })
      })
    } else {
      lines[lines.length - 1].push(node)
    }
  }
  return lines
}

function leadingSpaces(line: Node[]): number {
  const text = line.map(textOf).join('')
  return text.length - text.trimStart().length
}

function lineCode(code: Element) {
  const lines = splitLines(code.children)
  if (lines.length > 1 && lines[lines.length - 1].length === 0) lines.pop()
  code.children = lines.map((children) => ({
    type: 'element',
    tagName: 'span',
    properties: {
      className: ['code-line'],
      style: `--indent: ${leadingSpaces(children)}ch`,
    },
    // An empty line still takes a line.
    children: children.length ? children : [{ type: 'text', value: ' ' }],
  }))
}

export function rehypeSdkLayout() {
  return (tree: Node) => {
    walk(tree, (el) => {
      if (el.tagName === 'table') labelTable(el)
      if (el.tagName === 'pre') {
        const code = el.children.find((c): c is Element => isElement(c, 'code'))
        if (code) lineCode(code)
      }
    })
  }
}
