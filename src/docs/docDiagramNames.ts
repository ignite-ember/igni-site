/**
 * The diagrams an article may name in an `igni-diagram` fence.
 *
 * Its own module so the list can be imported by a test without
 * exporting a non-component from `DocDiagram.tsx`, which breaks fast
 * refresh and the portal's lint gate treats as an error.
 *
 * `DocDiagram` is typed against this, so adding a name here without
 * drawing it fails the typecheck rather than rendering nothing.
 */

export const DIAGRAM_NAMES = ['lineage', 'versioning'] as const

export type DiagramName = (typeof DIAGRAM_NAMES)[number]
