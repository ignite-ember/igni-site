import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { BaseStyles, ThemeProvider } from "@primer/react";
import { LandingPage } from "./pages/LandingPage";
import { ProductPage } from "./pages/ProductPage";
import { DownloadPage } from "./pages/DownloadPage";
import { DocsPage } from "./pages/DocsPage";
import { DocArticlePage } from "./pages/DocArticlePage";
import { AgentCorePage } from "./pages/AgentCorePage";
import { SdkLandingPage } from "./pages/SdkLandingPage";
import { SdkArticlePage } from "./pages/SdkArticlePage";

/**
 * The public site — what ignite-ember.sh serves.
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
          <Routes>
            <Route index element={<LandingPage />} />
            {/* One page per paid module. */}
            <Route path="codeindex" element={<ProductPage slug="codeindex" />} />
            <Route path="artifacts" element={<ProductPage slug="artifacts" />} />
            <Route path="fleet" element={<ProductPage slug="fleet" />} />
            <Route path="factory" element={<ProductPage slug="factory" />} />
            {/* Comparisons with other platforms, one page each. */}
            <Route path="compare/agentcore" element={<AgentCorePage />} />
            <Route path="docs" element={<DocsPage />} />
            <Route path="docs/:slug" element={<DocArticlePage />} />
            {/* The SDKs' documentation, generated in igni-sdk and
            copied into src/docs/sdk/ (scripts/sync-sdk-docs.mjs). */}
            <Route path="docs/sdk" element={<SdkLandingPage />} />
            <Route path="docs/sdk/:pkg" element={<SdkArticlePage />} />
            <Route path="docs/sdk/:pkg/:page" element={<SdkArticlePage />} />
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
