/**
 * One SDK release's documentation for a page: the latest at once, a past
 * release once its index has been fetched (`undefined` until then).
 */
import { useEffect, useState } from 'react'

import { loadSdkDocs, sdkDocsAt, type SdkDocs } from './sdkManifest'

export function useSdkDocs(version: string): SdkDocs | undefined {
  const [, setFetched] = useState<string | null>(null)
  const docs = sdkDocsAt(version)
  useEffect(() => {
    if (docs) return
    let live = true
    loadSdkDocs(version).then(() => {
      if (live) setFetched(version)
    })
    return () => {
      live = false
    }
  }, [version, docs])
  return docs
}
