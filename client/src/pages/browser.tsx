import { useState, useCallback } from "react";
import { SearchResults } from "@/components/search-results";
import { WebpageViewer } from "@/components/webpage-viewer";
import { Homepage } from "@/components/homepage";
import { SearchResult } from "@shared/schema";

export type BrowserView = "home" | "search" | "webpage";

export default function Browser() {
  const [view, setView] = useState<BrowserView>("home");
  const [searchQuery, setSearchQuery] = useState("");
  // proxyTargetUrl: the URL we actually load in the iframe (doesn't change on SPA navigation)
  const [proxyTargetUrl, setProxyTargetUrl] = useState("");
  const [prevView, setPrevView] = useState<BrowserView>("home");
  const [prevQuery, setPrevQuery] = useState("");

  const handleSearch = useCallback((query: string) => {
    if (!query) {
      setView("home");
      return;
    }
    setSearchQuery(query);
    setView("search");
  }, []);

  const handleResultClick = useCallback((result: SearchResult) => {
    setPrevView(view);
    setPrevQuery(searchQuery);
    setProxyTargetUrl(result.url);
    setView("webpage");
  }, [view, searchQuery]);

  const handleNavigateToUrl = useCallback((url: string) => {
    setPrevView(view);
    setPrevQuery(searchQuery);
    setProxyTargetUrl(url);
    setView("webpage");
  }, [view, searchQuery]);

  // Only updates displayed URL — does NOT reload the iframe.
  // The iframe already navigated internally; we just track the new URL.
  const handleIframeNavigation = useCallback((newUrl: string) => {
    // No-op: we intentionally do NOT push this back into proxyTargetUrl.
    // Changing proxyTargetUrl would rebuild proxyUrl and reload the iframe.
    // The iframe handles its own SPA navigation — we just let it run.
    void newUrl;
  }, []);

  const handleBackFromWebpage = useCallback(() => {
    if (prevView === "search" && prevQuery) {
      setView("search");
      setSearchQuery(prevQuery);
    } else {
      setView("home");
    }
  }, [prevView, prevQuery]);

  return (
    <div className="h-screen w-screen bg-background flex flex-col overflow-hidden">
      {view === "webpage" && (
        <button
          onClick={handleBackFromWebpage}
          className="fixed top-3 left-3 z-40 flex items-center gap-1.5 bg-background/90 backdrop-blur-sm border border-border text-foreground rounded-full px-3 py-1.5 text-sm shadow-md hover:shadow-lg transition-all hover:bg-secondary"
          data-testid="button-back-from-webpage"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          {prevView === "search" ? "Results" : "Home"}
        </button>
      )}

      <div className="flex-1 overflow-hidden">
        {view === "home" ? (
          <Homepage onSearch={handleSearch} onNavigate={handleNavigateToUrl} />
        ) : view === "search" ? (
          <SearchResults
            query={searchQuery}
            onResultClick={handleResultClick}
            onSearch={handleSearch}
          />
        ) : (
          <WebpageViewer url={proxyTargetUrl} onUrlChange={handleIframeNavigation} />
        )}
      </div>
    </div>
  );
}
