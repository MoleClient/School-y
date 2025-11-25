import { useState } from "react";
import { BrowserChrome } from "@/components/browser-chrome";
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

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setView("search");
  };

  const handleResultClick = (result: SearchResult) => {
    const newHistory = [...history.slice(0, historyIndex + 1), result.url];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCurrentUrl(result.url);
    setView("webpage");
  };

  const handleNavigateToUrl = (url: string) => {
    const newHistory = [...history.slice(0, historyIndex + 1), url];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCurrentUrl(url);
    setView("webpage");
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCurrentUrl(history[newIndex]);
      setView("webpage");
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCurrentUrl(history[newIndex]);
      setView("webpage");
    }
  };

  const handleReload = () => {
    if (view === "webpage" && currentUrl) {
      const url = new URL(currentUrl);
      url.searchParams.set('_reload', Date.now().toString());
      setCurrentUrl(url.toString());
    }
  };

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  return (
    <div className="h-screen w-screen bg-background flex flex-col overflow-hidden">
      <BrowserChrome
        currentUrl={currentUrl}
        searchQuery={searchQuery}
        onSearch={handleSearch}
        onNavigate={handleNavigateToUrl}
        onBack={handleBack}
        onForward={handleForward}
        onReload={handleReload}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        view={view}
      />
      
      <div className="flex-1 overflow-hidden">
        {view === "home" ? (
          <Homepage onSearch={handleSearch} onNavigate={handleNavigateToUrl} />
        ) : view === "search" ? (
          <SearchResults 
            query={searchQuery} 
            onResultClick={handleResultClick}
          />
        ) : (
          <WebpageViewer url={currentUrl} />
        )}
      </div>
    </div>
  );
}
