/** Types for `sync-sdk-docs.mjs`, plain node like the sitemap generator. */

export declare const TARGET: string
export declare function sdkDir(): string
export declare function sourceDir(dir?: string): string
export declare function diff(source?: string): { changed: string[]; removed: string[] }
export declare function main(argv?: string[]): number
