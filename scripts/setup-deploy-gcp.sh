#!/usr/bin/env bash
# One-time Google Cloud setup for the site's GitHub deploys. Idempotent:
# each resource is created only if it is missing, and IAM bindings are
# additive. Prints every gcloud command before running it.
#
#   scripts/setup-deploy-gcp.sh                     # WIF + service accounts + roles
#   scripts/setup-deploy-gcp.sh --https-redirect    # also HTTP→HTTPS redirect + HSTS
#   DRY_RUN=1 scripts/setup-deploy-gcp.sh …         # print the commands only
#
# What it sets up:
#   * Workload Identity pool `github`, OIDC provider `igni-site` trusting
#     GitHub Actions tokens from ignite-ember/igni-site only.
#   * igni-site-deploy-stage: objectAdmin on the stage bucket only; usable
#     only by runs on refs/heads/main.
#   * igni-site-deploy-prod: objectAdmin on the prod bucket only; usable
#     only by runs on a refs/tags/release-v* ref.
#   * Custom role igniSiteCdnInvalidator (compute.urlMaps.invalidateCache,
#     compute.urlMaps.get) for both, at project level: CDN invalidation
#     has no narrower scope than the project.
set -euo pipefail

PROJECT=${PROJECT:-ember-prod-491411}
REPO=${REPO:-ignite-ember/igni-site}
STAGE_BUCKET=${STAGE_BUCKET:-igni-public-site-stage}
PROD_BUCKET=${PROD_BUCKET:-igni-public-site}
POOL=github
PROVIDER=igni-site
STAGE_SA_NAME=igni-site-deploy-stage
PROD_SA_NAME=igni-site-deploy-prod
ROLE_ID=igniSiteCdnInvalidator
# --https-redirect
HTTP_PROXY=${HTTP_PROXY:-igni-public-http-proxy}
REDIRECT_MAP=${REDIRECT_MAP:-igni-public-http-redirect}
BACKENDS=${BACKENDS:-igni-public-backend igni-stage-backend}
HSTS=${HSTS:-max-age=31536000}

HTTPS_REDIRECT=
for a in "$@"; do
  case "$a" in
    --https-redirect) HTTPS_REDIRECT=1 ;;
    *) echo "unknown argument: $a" >&2; exit 2 ;;
  esac
done

run() {
  printf '+ %s\n' "$*"
  [ -n "${DRY_RUN:-}" ] || "$@"
}
# A describe that may fail: true if the resource exists. In a dry run,
# report it as missing so every create is printed.
exists() {
  [ -z "${DRY_RUN:-}" ] && "$@" >/dev/null 2>&1
}

G=(gcloud --project="$PROJECT")
STAGE_SA="$STAGE_SA_NAME@$PROJECT.iam.gserviceaccount.com"
PROD_SA="$PROD_SA_NAME@$PROJECT.iam.gserviceaccount.com"

echo "== project"
if [ -n "${DRY_RUN:-}" ]; then
  PROJECT_NUMBER=${PROJECT_NUMBER:-429289688144}
  echo "(dry run: project number assumed $PROJECT_NUMBER)"
else
  PROJECT_NUMBER=$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')
fi
POOL_ID="projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL"

run "${G[@]}" services enable iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com

echo "== workload identity pool and provider"
if ! exists "${G[@]}" iam workload-identity-pools describe "$POOL" --location=global; then
  run "${G[@]}" iam workload-identity-pools create "$POOL" --location=global \
    --display-name="GitHub Actions"
fi

MAPPING="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref,attribute.release=assertion.ref.startsWith('refs/tags/release-v') ? 'true' : 'false'"
CONDITION="assertion.repository=='$REPO'"
if exists "${G[@]}" iam workload-identity-pools providers describe "$PROVIDER" --location=global --workload-identity-pool="$POOL"; then
  run "${G[@]}" iam workload-identity-pools providers update-oidc "$PROVIDER" --location=global \
    --workload-identity-pool="$POOL" \
    --attribute-mapping="$MAPPING" --attribute-condition="$CONDITION"
else
  run "${G[@]}" iam workload-identity-pools providers create-oidc "$PROVIDER" --location=global \
    --workload-identity-pool="$POOL" --display-name="igni-site" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="$MAPPING" --attribute-condition="$CONDITION"
fi

echo "== service accounts"
for name in "$STAGE_SA_NAME" "$PROD_SA_NAME"; do
  if ! exists "${G[@]}" iam service-accounts describe "$name@$PROJECT.iam.gserviceaccount.com"; then
    run "${G[@]}" iam service-accounts create "$name" --display-name="$name (GitHub deploy of the site)"
  fi
done

echo "== bucket access (each account on its own bucket only)"
run "${G[@]}" storage buckets add-iam-policy-binding "gs://$STAGE_BUCKET" \
  --member="serviceAccount:$STAGE_SA" --role=roles/storage.objectAdmin
run "${G[@]}" storage buckets add-iam-policy-binding "gs://$PROD_BUCKET" \
  --member="serviceAccount:$PROD_SA" --role=roles/storage.objectAdmin

echo "== CDN invalidation role"
PERMS=compute.urlMaps.invalidateCache,compute.urlMaps.get
if exists "${G[@]}" iam roles describe "$ROLE_ID"; then
  run "${G[@]}" iam roles update "$ROLE_ID" --permissions="$PERMS" --quiet
else
  run "${G[@]}" iam roles create "$ROLE_ID" --title="igni site CDN invalidator" \
    --description="Invalidate Cloud CDN on the site's URL map" --permissions="$PERMS" --stage=GA
fi
for sa in "$STAGE_SA" "$PROD_SA"; do
  run "${G[@]}" projects add-iam-policy-binding "$PROJECT" \
    --member="serviceAccount:$sa" --role="projects/$PROJECT/roles/$ROLE_ID" --condition=None
done

echo "== who may act as each account"
# The provider admits only $REPO; these bindings narrow each account to
# its ref: stage to main, prod to release tags.
run "${G[@]}" iam service-accounts add-iam-policy-binding "$STAGE_SA" \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/$POOL_ID/attribute.ref/refs/heads/main"
run "${G[@]}" iam service-accounts add-iam-policy-binding "$PROD_SA" \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/$POOL_ID/attribute.release/true"

if [ -n "$HTTPS_REDIRECT" ]; then
  echo "== HTTP → HTTPS redirect (HTTP proxy only; the HTTPS side is untouched)"
  tmp=$(mktemp)
  cat > "$tmp" <<EOF
name: $REDIRECT_MAP
defaultUrlRedirect:
  httpsRedirect: true
  redirectResponseCode: MOVED_PERMANENTLY_DEFAULT
  stripQuery: false
EOF
  run "${G[@]}" compute url-maps import "$REDIRECT_MAP" --global --source="$tmp" --quiet
  run "${G[@]}" compute target-http-proxies update "$HTTP_PROXY" --global --url-map="$REDIRECT_MAP"
  rm -f "$tmp"

  echo "== HSTS on the backend buckets"
  # --custom-response-header replaces the bucket's whole list; show what is there first.
  for b in $BACKENDS; do
    if [ -z "${DRY_RUN:-}" ]; then
      echo "   $b now: $("${G[@]}" compute backend-buckets describe "$b" --format='value(customResponseHeaders)')"
    fi
    run "${G[@]}" compute backend-buckets update "$b" \
      --custom-response-header="Strict-Transport-Security: $HSTS"
  done
fi

cat <<EOF

== values for the workflows (.github/workflows/deploy-site.yml, ci.yml, deploy.yml)
GCP_PROJECT_ID:      $PROJECT
GCP_PROJECT_NUMBER:  $PROJECT_NUMBER
GCP_WIF_PROVIDER:    $POOL_ID/providers/$PROVIDER
stage account:       $STAGE_SA
prod account:        $PROD_SA
stage bucket:        $STAGE_BUCKET
prod bucket:         $PROD_BUCKET
EOF
