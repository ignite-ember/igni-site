/** Types for `generate-sitemap.mjs`, which is plain node so that it can
 *  run outside the vite toolchain. Only the exports the tests
 *  import are declared. */

export declare const ORIGIN: string
export declare function docPackages(): { slug: string; single: boolean; versions: string[] }[]
export declare function docArticles(): { slug: string; package: string; category: string }[]
export declare function docCanonicalPaths(): string[]
export declare function legacyDocPaths(): string[]
export declare function docVersionedPaths(): string[]
export declare function sdkPaths(): string[]
export declare function sdkVersionedPaths(): string[]
export declare function buildSitemap(): string
