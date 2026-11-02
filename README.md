# igni site

The public website at [ignite-ember.sh](https://ignite-ember.sh): the landing
page, one page per paid module (`/codeindex`, `/artifacts`, `/fleet`,
`/factory`), a comparison with AWS Bedrock AgentCore (`/compare/agentcore`)
and the documentation (`/docs`, `/docs/:slug`). `/download` is served but
unlisted.

Until 2026-10-31 this lived inside the igni server portal behind a
`VITE_PUBLIC_SITE=1` build flag. It moved here so the server can be published
as open source without the price list and sales copy in it. The server
portal links to the documentation here.

React, Vite, TypeScript and Primer, on the same versions as the portal.

## Run

```sh
npm install
npm run dev        # http://localhost:5173
```

## Check

```sh
npm test           # vitest
npm run typecheck  # tsc -b (a bare `tsc --noEmit` checks nothing here)
npm run lint
npm run build      # tsc -b && vite build, output in dist/
npm run test:e2e   # Playwright, against a dev server on :5174
```

## Documentation

Articles are Markdown in `src/docs/content/`, listed in
`src/docs/docsManifest.ts`. After adding or renaming one, regenerate the
sitemap — a test fails if the committed `public/sitemap.xml` is stale:

```sh
npm run sitemap
```

## Deploy

TBD. The build is a static bundle (`dist/`); every route is client-side, so
the host has to serve `index.html` for unknown paths.
