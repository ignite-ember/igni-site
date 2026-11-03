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

### Where it is served today (checked 2026-11-03)

`ignite-ember.sh` and `www.ignite-ember.sh` resolve to `8.233.188.193`, a
Google Cloud external load balancer with a Cloud Storage backend bucket and
Cloud CDN (`x-goog-*` headers, `via: 1.1 google`, an `Age` header). It is not
in any repository: `ember-iac`'s GKE Gateway (`infra/helm/ingress`) already
redirects HTTP to HTTPS, but the domain does not point at it. The load
balancer was set up by hand, so its settings live in Google Cloud.

Two gaps on it:

- `http://ignite-ember.sh` serves the page (200) instead of redirecting to
  HTTPS.
- No `Strict-Transport-Security` header. `.sh` is not on the browsers' HSTS
  preload list, so nothing else forces HTTPS.

To fix both (`gcloud auth login` first; the project is probably
`ember-prod-491411`, confirm with the first command):

```sh
# 1. Find the load balancer's pieces by its IP.
gcloud compute forwarding-rules list --global \
  --filter="IPAddress=8.233.188.193" --format="table(name,portRange,target)"
# Note the port-80 rule's target: a target HTTP proxy, <HTTP_PROXY> below.
gcloud compute backend-buckets list --format="table(name,bucketName)"
# Note the backend bucket serving the site, <BACKEND_BUCKET> below.

# 2. A URL map that only redirects, then point the HTTP proxy at it.
#    Same IP, no downtime; port 443 is untouched.
cat > /tmp/site-http-redirect.yaml <<'EOF'
name: site-http-redirect
defaultUrlRedirect:
  httpsRedirect: true
  redirectResponseCode: MOVED_PERMANENTLY_DEFAULT
  stripQuery: false
EOF
gcloud compute url-maps import site-http-redirect --global \
  --source=/tmp/site-http-redirect.yaml
gcloud compute target-http-proxies update <HTTP_PROXY> --global \
  --url-map=site-http-redirect

# 3. HSTS on every HTTPS response. Start with five minutes; once the
#    redirect has run a day with nothing broken, raise it to a year
#    (max-age=31536000). Leave includeSubDomains off until every
#    subdomain (api, dev, stage, …) is HTTPS-only.
gcloud compute backend-buckets update <BACKEND_BUCKET> \
  --custom-response-header='Strict-Transport-Security: max-age=300'

# 4. Check.
curl -sI http://ignite-ember.sh/ | head -3          # 301, location: https://ignite-ember.sh/
curl -sI https://ignite-ember.sh/ | grep -i strict  # strict-transport-security: max-age=…
```

If the port-80 forwarding rule turns out to share the HTTPS URL map, step 2
is still right: only the HTTP proxy is repointed. In the console, the HSTS
header is under the backend bucket's Custom response headers.
