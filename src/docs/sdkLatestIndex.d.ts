/**
 * `sdk-latest-index`: the newest SDK snapshot's `index.json`
 * (`src/docs/sdk/<latest>/index.json`), which vite.config.ts resolves by
 * reading the version folders. Typed loosely here; `sdkManifest.ts` gives
 * it its shape.
 */
declare module 'sdk-latest-index' {
  const index: { packages: unknown[]; pages: unknown[] }
  export default index
}
