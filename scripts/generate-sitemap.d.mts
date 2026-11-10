/** Types for `generate-sitemap.mjs`, which is plain node so that it can
 *  run outside the vite toolchain. Only the exports the tests
 *  import are declared. */

export declare const ORIGIN: string
export declare function docSlugs(): string[]
export declare function sdkPaths(): string[]
export declare function buildSitemap(): string
