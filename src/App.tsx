import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { BaseStyles, ThemeProvider } from "@primer/react";
import { LandingPage } from "./pages/LandingPage";
import { ProductPage } from "./pages/ProductPage";
import { DownloadPage } from "./pages/DownloadPage";
import { DocsPage } from "./pages/DocsPage";
import { DocPackagePage } from "./pages/DocPackagePage";
import { DocArticlePage } from "./pages/DocArticlePage";
import { AgentCorePage } from "./pages/AgentCorePage";
import { SdkLandingPage } from "./pages/SdkLandingPage";
import { SdkArticlePage } from "./pages/SdkArticlePage";
import { ScrollToTop } from "./components/ScrollToTop";
import { LEGACY_REDIRECTS, docPackage, isKnownVersion } from "./docs/docsManifest";

/**
 * Redirect a retired single-segment `/docs/<slug>` URL to its new
 * per-package path, keeping any `#anchor` the visitor arrived with so a
 * deep link into an article still lands on its section.
 */
function LegacyDocRedirect({ to }: { to: string }) {
  const { hash } = useLocation();
  return <Navigate to={`${to}${hash}`} replace />;
}

/**
 * `/docs/<package>/<seg>` is ambiguous: `<seg>` is a version (so this is
 * a package landing pinned to it, e.g. `/docs/server/0.8`) or an
 * article slug at the latest version (e.g. `/docs/server/inference-
 * backends`). The manifest's version list decides which, so the two
 * two-segment forms can share one route.
 */
function DocSecondSegment() {
  const { package: pkg, seg } = useParams<{ package: string; seg: string }>();
  if (isKnownVersion(docPackage(pkg), seg)) {
    return <DocPackagePage package={pkg} version={seg} />;
  }
  return <DocArticlePage package={pkg} slug={seg} />;
}

/**
 * The public site — what igni.sh (and ignite-ember.sh) serves.
 *
 * Landing page, one page per paid module, a comparison with AWS Bedrock
 * AgentCore, and the documentation. It
 * was a build flag (`VITE_PUBLIC_SITE=1`) inside the igni server
 * portal until 2026-10-31, when it moved to its own repository so the
 * server could be published without the price list in it.
 *
 * The catch-all sends `/dashboard`, `/login` and the rest to `/`: a
 * sign-in form that cannot sign in, or a dashboard that loads for ever
 * against an API that does not exist here, is worse than not being
 * there. A customer's portal is their own deployment, not this site.
 */
export default function App() {
  return (
    <ThemeProvider colorMode="auto">
      <BaseStyles>
        <BrowserRouter>
          {/* A new page opens at its own top, not where the last one
              was left. */}
          <ScrollToTop />
          <Routes>
            <Route index element={<LandingPage />} />
            {/* One page per paid module. */}
            <Route path="codeindex" element={<ProductPage slug="codeindex" />} />
            <Route path="artifacts" element={<ProductPage slug="artifacts" />} />
            <Route path="fleet" element={<ProductPage slug="fleet" />} />
            <Route path="factory" element={<ProductPage slug="factory" />} />
            {/* Comparisons with other platforms, one page each. */}
            <Route path="compare/agentcore" element={<AgentCorePage />} />
            {/* The documentation, per package (Phase 1 of the docs
            versioning plan): a product grid at /docs, then each
            package's own index and its articles. */}
            <Route path="docs" element={<DocsPage />} />
            {/* The SDKs' documentation, generated in igni-sdk and
            copied into src/docs/sdk/ (scripts/sync-docs.mjs sdk).
            Declared before the generic docs/:package routes; React
            Router ranks the static `sdk` segment above the parameter
            either way. */}
            <Route path="docs/sdk" element={<SdkLandingPage />} />
            <Route path="docs/sdk/:pkg" element={<SdkArticlePage />} />
            <Route path="docs/sdk/:pkg/:page" element={<SdkArticlePage />} />
            {/* Retired single-segment /docs/<slug> URLs redirect to their
            new per-package path, so every old link keeps resolving. The
            single-page packages (fleet, artifacts, codeindex) keep their
            own /docs/<slug> URL and are served by docs/:package below. */}
            {Object.entries(LEGACY_REDIRECTS).map(([slug, to]) => (
              <Route
                key={slug}
                path={`docs/${slug}`}
                element={<LegacyDocRedirect to={to} />}
              />
            ))}
            {/* Per-package, per-version docs (Phase 2). `/docs/<package>`
            is the newest version; `/docs/<package>/<version>` and
            `/docs/<package>/latest` pin the landing; the three-segment
            forms pin an article. `<version>` carries a dot (0.8), which
            React Router matches in a single segment. `DocSecondSegment`
            tells a version from an article slug. */}
            <Route path="docs/:package" element={<DocPackagePage />} />
            <Route path="docs/:package/:seg" element={<DocSecondSegment />} />
            <Route path="docs/:package/:version/:slug" element={<DocArticlePage />} />
            {/* Unlisted: nothing links here, it is absent from
            the sitemap and disallowed in robots.txt. A
            finished page waiting on the decision to launch
            it, reachable by URL in the meantime. */}
            <Route path="download" element={<DownloadPage />} />
            {/* DEC-12. `/old` served the previous per-seat page:
            a "Public Beta" badge, a "Download Windows" button
            shown to macOS visitors, and a "Pricing" nav item —
            against a live page saying igni is free. Two public
            pages contradicting each other, one of them reachable
            by anyone who guessed the URL.

            Decided: redirect now, delete later. The page file
            was deleted on 2026-10-31; the redirect stays, so an
            old shared link still lands somewhere correct. */}
            <Route path="/old" element={<Navigate to="/" replace />} />
            {/* /alt was this page's address while it was in
            review — redirect so shared links keep working. */}
            <Route path="/alt" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </BaseStyles>
    </ThemeProvider>
  );
}
