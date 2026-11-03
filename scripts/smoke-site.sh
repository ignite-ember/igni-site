#!/usr/bin/env bash
# Check a deployed site serves this build: the root and several deep
# links answer 200 with the index.html that references this build's
# script, and that script loads.
#
#   scripts/smoke-site.sh https://ignite-ember.sh [dist]
#
# Retries for up to ~5 minutes while the CDN invalidation lands. Each
# request carries a query string the CDN has not cached.
set -euo pipefail

SITE=${1:?site url}
DIST=${2:-dist}
SITE=${SITE%/}

js=$(grep -o 'assets/index-[^"]*\.js' "$DIST/index.html" | head -1)
[ -n "$js" ] || { echo "no assets/index-*.js in $DIST/index.html" >&2; exit 1; }
echo "expecting /$js"

paths="/ /fleet /factory /compare/agentcore /docs /docs/fleet /codeindex"
bust="smoke=$(date +%s)"
fail=0
for p in $paths; do
  ok=
  for _ in $(seq 1 20); do
    code=$(curl -sS -o /tmp/smoke-body -w '%{http_code}' "$SITE$p?$bust" || true)
    if [ "$code" = 200 ] && grep -q "$js" /tmp/smoke-body; then ok=1; break; fi
    sleep 15
  done
  if [ -n "$ok" ]; then echo "ok   $p  200, this build"; else echo "FAIL $p  last status $code" >&2; fail=1; fi
done

if [ -f "$DIST/schema/extension-manifest-1.json" ]; then
  code=$(curl -sS -o /dev/null -w '%{http_code}' "$SITE/schema/extension-manifest-1.json?$bust")
  if [ "$code" = 200 ]; then echo "ok   /schema/extension-manifest-1.json 200"; else echo "FAIL /schema/extension-manifest-1.json $code" >&2; fail=1; fi
fi

code=$(curl -sS -o /dev/null -w '%{http_code}' "$SITE/$js")
if [ "$code" = 200 ]; then echo "ok   /$js 200"; else echo "FAIL /$js $code" >&2; fail=1; fi
cc=$(curl -sSI "$SITE/$js" | tr -d '\r' | grep -i '^cache-control' || true)
echo "     $cc"
exit $fail
