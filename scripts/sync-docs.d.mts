/** Types for `sync-docs.mjs`, plain node like the sitemap generator. */

export declare const TARGET: string
export declare function sdkDir(): string
export declare function sourceDir(dir?: string): string
export declare function compareVersionsDesc(a: string, b: string): number
export declare function sdkVersions(target?: string): string[]
export declare function latestSdkDir(target?: string): string
export declare function generatedVersion(dir: string): string
export declare function diff(source?: string, version?: string): { changed: string[]; removed: string[] }
export declare function serverDir(): string
export declare function serverSourceDir(dir?: string): string
export declare function serverVersions(source?: string): string[]
export declare function serverDiff(
  version: string,
  source?: string,
): { changed: string[]; removed: string[] }
export declare function fleetDir(): string
export declare function fleetSourceDir(dir?: string): string
export declare function fleetVersions(source?: string): string[]
export declare function fleetDiff(
  version: string,
  source?: string,
): { changed: string[]; removed: string[] }
export declare function snapshot(pkg: string, to: string, from?: string): number
export declare function main(argv?: string[]): number
