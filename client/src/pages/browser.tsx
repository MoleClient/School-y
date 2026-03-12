import { useState, useCallback } from "react";
import { SearchResults } from "@/components/search-results";
import { WebpageViewer } from "@/components/webpage-viewer";
import { Homepage } from "@/components/homepage";
import { SearchResult } from "@shared/schema";

export type BrowserView = "home" | "search" | "webpage";

export default function Browser() {
  const [view, setView] = useState<BrowserView>("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUrl, setCurrentUrl] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setView("search");
  }, []);

  const handleResultClick = useCallback((result: SearchResult) => {
    const newHistory = [...history.slice(0, historyIndex + 1), result.url];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCurrentUrl(result.url);
    setView("webpage");
  }, [history, historyIndex]);

  const handleNavigateToUrl = useCallback((url: string) => {
    const newHistory = [...history.slice(0, historyIndex + 1), url];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCurrentUrl(url);
    setView("webpage");
  }, [history, historyIndex]);

  const handleIframeUrlChange = useCallback((newUrl: string) => {
    setCurrentUrl(newUrl);
    const newHistory = [...history.slice(0, historyIndex + 1), newUrl];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  return (
    <div className="h-screen w-screen bg-background flex flex-col overflow-hidden">
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
          <WebpageViewer url={currentUrl} onUrlChange={handleIframeUrlChange} />
        )}
      </div>
    </div>
  );
}
