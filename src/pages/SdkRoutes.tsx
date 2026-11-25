/**
 * The SDK routes whose first segment is ambiguous: a released version (or
 * `latest`) or a package. The SDK's version list decides.
 */
import { useParams } from 'react-router-dom'

import { isSdkVersion } from '../docs/sdkManifest'
import { SdkArticlePage } from './SdkArticlePage'
import { SdkLandingPage } from './SdkLandingPage'

/**
 * `/docs/sdk/<seg>`: a released SDK version (or `latest`) is the SDK
 * landing pinned to it (`/docs/sdk/0.2.2`); anything else is a package's
 * overview at the latest (`/docs/sdk/igni-client`). A package name never
 * looks like a version.
 */
export function SdkFirstSegment() {
  const { seg } = useParams<{ seg: string }>()
  if (isSdkVersion(seg)) return <SdkLandingPage version={seg} />
  return <SdkArticlePage pkg={seg} />
}

/**
 * `/docs/sdk/<seg>/<page>`: a package's overview at a pinned version
 * (`/docs/sdk/0.2.2/igni-client`) when `<seg>` is a version, else a page at
 * the latest (`/docs/sdk/igni-client/scheduler`).
 */
export function SdkSecondSegment() {
  const { seg, page } = useParams<{ seg: string; page: string }>()
  if (isSdkVersion(seg)) return <SdkArticlePage version={seg} pkg={page} />
  return <SdkArticlePage pkg={seg} page={page} />
}
