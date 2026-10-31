/**
 * A blockquote opening `**Tip:**`, `**Note:**` or `**Important:**`
 * renders as a callout rather than a quotation.
 *
 * Its own module because the component map beside it exports a
 * constant, and a file that exports both a component and a constant
 * breaks fast refresh.
 */

import { AlertIcon, InfoIcon, LightBulbIcon } from '@primer/octicons-react'

/** Detect callout blockquotes: > **Tip:** ... / > **Note:** ... / > **Important:** ... */
export function Callout({ children }: { children: React.ReactNode }) {
  const text = String(children)
  const tipMatch = text.match(/^\s*Tip:\s*/i)
  const noteMatch = text.match(/^\s*Note:\s*/i)
  const importantMatch = text.match(/^\s*Important:\s*/i)

  if (tipMatch) {
    return (
      <div className="doc-callout doc-callout-tip">
        <span className="doc-callout-icon"><LightBulbIcon size={16} /></span>
        <div><strong>Tip</strong><p>{text.replace(tipMatch[0], '')}</p></div>
      </div>
    )
  }
  if (noteMatch) {
    return (
      <div className="doc-callout doc-callout-note">
        <span className="doc-callout-icon"><InfoIcon size={16} /></span>
        <div><strong>Note</strong><p>{text.replace(noteMatch[0], '')}</p></div>
      </div>
    )
  }
  if (importantMatch) {
    return (
      <div className="doc-callout doc-callout-important">
        <span className="doc-callout-icon"><AlertIcon size={16} /></span>
        <div><strong>Important</strong><p>{text.replace(importantMatch[0], '')}</p></div>
      </div>
    )
  }

  return <blockquote>{children}</blockquote>
}

/** Custom heading components that add id attributes for anchor linking. */
