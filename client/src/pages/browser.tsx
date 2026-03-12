import { useState, useCallback, useRef, useEffect } from "react";
import { SearchResults } from "@/components/search-results";
import { WebpageViewer } from "@/components/webpage-viewer";
import { Homepage } from "@/components/homepage";
import { SearchResult } from "@shared/schema";
import { Search, RefreshCw, X, ArrowLeft, ExternalLink } from "lucide-react";

export type BrowserView = "home" | "search" | "webpage";

const URL_PATTERN = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.\-?=&#%+]*)*\/?$/i;

function isUrlLike(val: string) {
  return URL_PATTERN.test(val.trim());
}

function BrowserBar({
  currentUrl,
  onNavigate,
  onSearch,
  onBack,
  canGoBack,
  onReload,
}: {
  currentUrl: string;
  onNavigate: (url: string) => void;
  onSearch: (query: string) => void;
  onBack: () => void;
  canGoBack: boolean;
  onReload: () => void;
}) {
  const [inputVal, setInputVal] = useState(currentUrl);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focused) setInputVal(currentUrl);
  }, [currentUrl, focused]);

  const commit = useCallback(() => {
    const val = inputVal.trim();
    if (!val) return;
    setFocused(false);
    inputRef.current?.blur();
    if (isUrlLike(val)) {
      onNavigate(val.startsWith("http") ? val : `https://${val}`);
    } else {
      onSearch(val);
    }
  }, [inputVal, onNavigate, onSearch]);

  const displayVal = focused ? inputVal : (() => {
    try { return new URL(currentUrl).hostname || currentUrl; } catch { return currentUrl; }
  })();

  return (
    <div className="h-11 flex items-center gap-1.5 px-2 bg-background border-b border-border flex-shrink-0">
      <button
        onClick={onBack}
        disabled={!canGoBack}
        className="flex-shrink-0 p-1.5 rounded-full text-muted-foreground disabled:opacity-30 hover:bg-secondary hover:text-foreground transition-colors"
        data-testid="button-browser-back"
        title="Go back"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      <button
        onClick={onReload}
        className="flex-shrink-0 p-1.5 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        data-testid="button-browser-reload"
        title="Reload"
      >
        <RefreshCw className="w-3.5 h-3.5" />
      </button>

      <div className="flex-1 flex items-center min-w-0">
        <div className="relative w-full">
          <div className={`flex items-center gap-2 bg-[#f1f3f4] dark:bg-[#303134] rounded-full px-3 py-1.5 transition-all ${focused ? "ring-2 ring-[#4285F4]/50 bg-background dark:bg-background" : "hover:bg-[#e8eaed] dark:hover:bg-[#3c3f44]"}`}>
            <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={focused ? inputVal : displayVal}
              onChange={e => setInputVal(e.target.value)}
              onFocus={() => { setFocused(true); setInputVal(currentUrl); setTimeout(() => inputRef.current?.select(), 0); }}
              onBlur={() => { setFocused(false); }}
              onKeyDown={e => {
                if (e.key === "Enter") { e.preventDefault(); commit(); }
                if (e.key === "Escape") { setFocused(false); setInputVal(currentUrl); inputRef.current?.blur(); }
              }}
              className="flex-1 bg-transparent outline-none text-sm text-foreground min-w-0"
              data-testid="input-browser-address"
              autoComplete="off"
              spellCheck={false}
            />
            {focused && inputVal && (
              <button
                onMouseDown={e => { e.preventDefault(); setInputVal(""); }}
                className="p-0.5 rounded-full text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={() => { try { window.open(currentUrl, '_blank'); } catch {} }}
        className="flex-shrink-0 p-1.5 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        data-testid="button-browser-external"
        title="Open in new tab"
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function Browser() {
  const [view, setView] = useState<BrowserView>("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [proxyTargetUrl, setProxyTargetUrl] = useState("");
  const [currentUrl, setCurrentUrl] = useState("");
  const [prevView, setPrevView] = useState<BrowserView>("home");
  const [prevQuery, setPrevQuery] = useState("");
  const [reloadCount, setReloadCount] = useState(0);

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
    setCurrentUrl(result.url);
    setView("webpage");
  }, [view, searchQuery]);

  const handleNavigateToUrl = useCallback((url: string) => {
    const full = url.startsWith("http") ? url : `https://${url}`;
    setPrevView(view);
    setPrevQuery(searchQuery);
    setProxyTargetUrl(full);
    setCurrentUrl(full);
    setView("webpage");
  }, [view, searchQuery]);

  const handleIframeNavigation = useCallback((newUrl: string) => {
    if (newUrl && newUrl.startsWith("http")) {
      setCurrentUrl(newUrl);
    }
  }, []);

  const handleBack = useCallback(() => {
    if (prevView === "search" && prevQuery) {
      setView("search");
      setSearchQuery(prevQuery);
    } else {
      setView("home");
    }
  }, [prevView, prevQuery]);

  const handleReload = useCallback(() => {
    setReloadCount(c => c + 1);
  }, []);

  const reloadKey = view === "webpage" ? `${proxyTargetUrl}::${reloadCount}` : proxyTargetUrl;

  return (
    <div className="h-screen w-screen bg-background flex flex-col overflow-hidden">
      {view === "webpage" && (
        <BrowserBar
          currentUrl={currentUrl}
          onNavigate={handleNavigateToUrl}
          onSearch={handleSearch}
          onBack={handleBack}
          canGoBack={true}
          onReload={handleReload}
        />
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
          <WebpageViewer
            key={reloadKey}
            url={proxyTargetUrl}
            onUrlChange={handleIframeNavigation}
            onNavigate={handleNavigateToUrl}
          />
        )}
      </div>
    </div>
  );
}
