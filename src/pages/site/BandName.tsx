import { InfinityIcon } from '@primer/octicons-react'
import { UNLIMITED, bandLabel, bandShort } from './siteData'

/** A band in a table or quote: "≤ 50 people", or the infinity icon and "Unlimited people". */
export function BandName({ i, unit = 'people' }: { i: number; unit?: string }) {
  if (i !== UNLIMITED) return <>{bandLabel(i, unit)}</>
  // No wrapper element: the quote line styles its spans, and an icon and
  // text inline sit correctly in a table cell and a quote line alike.
  return (
    <>
      <InfinityIcon size={14} aria-hidden className="lp-band-icon" /> {bandLabel(i, unit)}
    </>
  )
}

/** A band on a picker button: "≤ 50", or the infinity icon. */
export function BandShort({ i }: { i: number }) {
  if (i !== UNLIMITED) return <>{bandShort(i)}</>
  return <InfinityIcon size={16} aria-hidden />
}
