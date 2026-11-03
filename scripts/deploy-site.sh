#!/usr/bin/env bash
# Upload a built dist/ to the site's Cloud Storage bucket and invalidate
# the CDN for the given hosts. Used by .github/workflows/deploy-site.yml;
# can be run by hand with gcloud signed in.
#
#   scripts/deploy-site.sh <bucket> <url-map> <host>[,<host>…]
#   DRY_RUN=1 scripts/deploy-site.sh …     # print the commands only
#
# Order matters, so no browser ever gets an index.html pointing at files
# that are not there yet:
#   1. dist/assets/* (hashed names): public, max-age=31536000, immutable.
#      Never deleted: a page cached before this release still finds its
#      files. Old hashes can be pruned later, by hand.
#   2. Other top-level files (favicon, og-image, robots, sitemap):
#      public, max-age=300.
#   3. A copy of index.html at every route (scripts/site-routes.mjs), as
#      object `fleet`, `compare/agentcore`, `docs/<slug>`…, text/html,
#      no-cache: the bucket has no object at those paths otherwise, and a
#      deep link or reload would be a 404.
#   4. index.html itself, no-cache.
#   5. CDN invalidation of /* for each host (async).
set -euo pipefail

BUCKET=${1:?bucket}
URL_MAP=${2:?url map}
HOSTS=${3:?host[,host…]}
DIST=${DIST:-dist}
HERE=$(cd "$(dirname "$0")" && pwd)

run() {
  if [ -n "${DRY_RUN:-}" ]; then printf '+ %s\n' "$*"; else "$@"; fi
}

[ -f "$DIST/index.html" ] || { echo "no $DIST/index.html: build first" >&2; exit 1; }
[ -d "$DIST/assets" ] || { echo "no $DIST/assets" >&2; exit 1; }

echo "== 1. hashed assets → gs://$BUCKET/assets (immutable, nothing deleted)"
run gcloud storage rsync "$DIST/assets" "gs://$BUCKET/assets" --recursive \
  --cache-control='public, max-age=31536000, immutable'

echo "== 2. other static files (short cache)"
for f in "$DIST"/*; do
  [ -f "$f" ] || continue
  [ "$(basename "$f")" = index.html ] && continue
  run gcloud storage cp "$f" "gs://$BUCKET/$(basename "$f")" --cache-control='public, max-age=300'
done

echo "== 3. index.html at every route"
routes=$(node "$HERE/site-routes.mjs")
[ -n "$routes" ] || { echo "site-routes.mjs listed nothing" >&2; exit 1; }
for r in $routes; do
  run gcloud storage cp "$DIST/index.html" "gs://$BUCKET/$r" \
    --content-type='text/html; charset=utf-8' --cache-control='no-cache'
done

echo "== 4. index.html"
run gcloud storage cp "$DIST/index.html" "gs://$BUCKET/index.html" \
  --content-type='text/html; charset=utf-8' --cache-control='no-cache'

echo "== 5. CDN invalidation"
IFS=, read -r -a hosts <<< "$HOSTS"
for h in "${hosts[@]}"; do
  run gcloud compute url-maps invalidate-cdn-cache "$URL_MAP" --global \
    --host="$h" --path='/*' --async
done
echo "done"
