import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchResult } from "@shared/schema";
import { Search, Globe, Clock, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SchoolyLogo } from "./schooly-logo";
import { AIOverview } from "./ai-overview";
import { AIMode } from "./ai-mode";

interface SearchResultsProps {
  query: string;
  onResultClick: (result: SearchResult) => void;
  onSearch: (query: string) => void;
}

// Gemini sparkle for AI Mode tab
function GeminiTabIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 28 28" fill="none" className="flex-shrink-0">
      <defs>
        <linearGradient id="gti" x1="0" y1="0" x2="28" y2="28">
          <stop offset="0%" stopColor="#4285F4" />
          <stop offset="50%" stopColor="#9B72CF" />
          <stop offset="100%" stopColor="#D96570" />
        </linearGradient>
      </defs>
      <path d="M14 2C14 2 15.5 8.5 20 13C24.5 17.5 26 14 26 14C26 14 20.5 14.5 16 19C11.5 23.5 14 26 14 26C14 26 12.5 19.5 8 15C3.5 10.5 2 14 2 14C2 14 7.5 13.5 12 9C16.5 4.5 14 2 14 2Z" fill="url(#gti)" />
    </svg>
  );
}

type Tab = "ai" | "all" | "images" | "video" | "news";

const TABS: { id: Tab; label: string; icon?: React.ReactNode }[] = [
  { id: "ai", label: "AI Mode", icon: <GeminiTabIcon /> },
  { id: "all", label: "All" },
  { id: "images", label: "Images" },
  { id: "video", label: "Video" },
  { id: "news", label: "News" },
];

function SearchBar({
  query,
  onSearch,
  activeTab,
  onTabChange,
}: {
  query: string;
  onSearch: (q: string) => void;
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = inputRef.current?.value.trim();
    if (val) onSearch(val);
  };

  return (
    <div className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="px-4 pt-3 pb-0">
        <div className="max-w-[760px] flex items-center gap-4" style={{ marginLeft: "clamp(0px, 4vw, 40px)" }}>
          <div className="flex-shrink-0">
            <SchoolyLogo size="small" onClick={() => onSearch("")} />
          </div>
          <form onSubmit={handleSubmit} className="flex-1 max-w-[580px]">
            <div className="flex items-center rounded-full border border-[#dfe1e5] shadow-sm hover:shadow-md transition-shadow px-4 py-2.5 gap-2 bg-background">
              <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                defaultValue={query}
                key={query}
                className="flex-1 bg-transparent outline-none text-sm text-foreground"
                data-testid="input-search-bar"
              />
            </div>
          </form>
        </div>
      </div>
      <div className="flex items-center gap-0 px-4 mt-1" style={{ paddingLeft: "clamp(16px, 6vw, 100px)" }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-[13px] border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "border-[#1a73e8] text-[#1a73e8] font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
            data-testid={`button-tab-${tab.id}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ImageResults({ query, onImageClick }: { query: string; onImageClick: (url: string) => void }) {
  const { data, isLoading } = useQuery<Array<{ title: string; url: string; thumbnail: string; source: string }>>({
    queryKey: ["/api/search/images", query],
    queryFn: async () => {
      const res = await fetch(`/api/search/images?query=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!query,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="w-full aspect-video rounded-lg" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">No images found for "{query}"</div>;
  }

  return (
    <div className="p-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {data.map((img, i) => (
          <div
            key={i}
            className="group cursor-pointer rounded-lg overflow-hidden border border-border hover-elevate"
            onClick={() => onImageClick(img.url)}
            data-testid={`card-image-${i}`}
          >
            <div className="aspect-video bg-muted relative overflow-hidden">
              {img.thumbnail ? (
                <img
                  src={img.thumbnail}
                  alt={img.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${i}/300/200`; }}
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Globe className="w-8 h-8 text-muted-foreground/40" />
                </div>
              )}
            </div>
            <div className="px-2 py-1.5">
              <p className="text-[11px] text-muted-foreground truncate">{img.source}</p>
              <p className="text-xs text-foreground truncate leading-tight">{img.title}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VideoResults({ query, onVideoClick }: { query: string; onVideoClick: (url: string) => void }) {
  const videos = [
    { title: `${query} - YouTube Search`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, source: "youtube.com", duration: "" },
  ];

  return (
    <div className="py-6 max-w-[760px]" style={{ paddingLeft: "clamp(16px, 10vw, 160px)", paddingRight: "16px" }}>
      <div className="mb-4 p-4 rounded-xl border border-border flex items-center gap-4 cursor-pointer hover-elevate" onClick={() => onVideoClick(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`)}>
        <div className="w-20 h-14 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="#FF0000">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium text-[#1a0dab] hover:underline truncate">
            Search "{query}" on YouTube
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">youtube.com · Browse video results</p>
        </div>
        <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </div>
      <p className="text-sm text-muted-foreground">
        Click above to browse video results for "{query}" on YouTube via the School-y browser.
      </p>
    </div>
  );
}

function NewsResults({ query, onNewsClick }: { query: string; onNewsClick: (url: string) => void }) {
  const { data, isLoading } = useQuery<Array<{ title: string; url: string; description: string; age: string; thumbnail: string; source: string; favicon: string }>>({
    queryKey: ["/api/search/news", query],
    queryFn: async () => {
      const res = await fetch(`/api/search/news?query=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!query,
  });

  if (isLoading) {
    return (
      <div className="py-6 max-w-[760px] space-y-4" style={{ paddingLeft: "clamp(16px, 10vw, 160px)", paddingRight: "16px" }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </div>
            <Skeleton className="w-24 h-16 rounded-lg flex-shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">No news found for "{query}"</div>;
  }

  return (
    <div className="py-6 max-w-[760px] space-y-5" style={{ paddingLeft: "clamp(16px, 10vw, 160px)", paddingRight: "16px" }}>
      {data.map((item, i) => (
        <div
          key={i}
          className="group cursor-pointer flex gap-4 items-start"
          onClick={() => onNewsClick(item.url)}
          data-testid={`card-news-${i}`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {item.favicon ? (
                <img src={item.favicon} className="w-4 h-4 rounded-full" alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <Globe className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              )}
              <span className="text-[12px] text-muted-foreground">{item.source}</span>
              {item.age && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="flex items-center gap-0.5 text-[12px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {item.age}
                  </span>
                </>
              )}
            </div>
            <h3 className="text-base text-[#1a0dab] group-hover:underline leading-snug mb-1 font-normal">
              {item.title}
            </h3>
            <p className="text-sm text-[#4d5156] leading-relaxed line-clamp-2">{item.description}</p>
          </div>
          {item.thumbnail && (
            <div className="flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden bg-muted">
              <img
                src={item.thumbnail}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AllResults({
  query,
  results,
  isLoading,
  onResultClick,
}: {
  query: string;
  results?: SearchResult[];
  isLoading: boolean;
  onResultClick: (result: SearchResult) => void;
}) {
  const handleOpenUrl = (url: string) => {
    const fakeResult: SearchResult = { title: url, url, description: "", favicon: "" };
    onResultClick(fakeResult);
  };

  if (isLoading) {
    return (
      <div className="py-6 max-w-[860px] space-y-6" style={{ paddingLeft: "clamp(16px, 15vw, 200px)", paddingRight: "16px" }}>
        <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)" }}>
          <div className="px-5 py-4 space-y-2.5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded bg-white/10" />
              <div className="h-3.5 w-24 rounded bg-white/10" />
            </div>
            <div className="h-3 rounded-full w-full" style={{ background: "rgba(255,255,255,0.08)" }} />
            <div className="h-3 rounded-full w-5/6" style={{ background: "rgba(255,255,255,0.06)" }} />
            <div className="h-3 rounded-full w-4/5" style={{ background: "rgba(255,255,255,0.05)" }} />
          </div>
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="w-6 h-6 rounded-full" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        ))}
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No results found for "{query}"</p>
        <p className="text-sm text-muted-foreground mt-1">Try different keywords or check your spelling.</p>
      </div>
    );
  }

  return (
    <div className="py-6 max-w-[860px]" style={{ paddingLeft: "clamp(16px, 15vw, 200px)", paddingRight: "16px" }}>
      <p className="text-sm text-muted-foreground mb-5" data-testid="text-result-count">
        About {results.length.toLocaleString()} results
      </p>

      <AIOverview query={query} results={results} onResultClick={handleOpenUrl} />

      <div className="space-y-7">
        {results.map((result, index) => (
          <div
            key={index}
            className="group cursor-pointer"
            onClick={() => onResultClick(result)}
            data-testid={`card-result-${index}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-full bg-[#f1f3f4] flex items-center justify-center flex-shrink-0 overflow-hidden">
                {result.favicon ? (
                  <img
                    src={result.favicon}
                    alt=""
                    className="w-4 h-4 object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <Globe className="w-3 h-3 text-muted-foreground" />
                )}
              </div>
              <p className="text-[13px] text-[#202124] truncate">
                {(() => { try { return new URL(result.url).hostname.replace("www.", ""); } catch { return result.url; } })()}
              </p>
              <span className="text-[13px] text-[#70757a] truncate hidden sm:inline">
                {(() => { try { return new URL(result.url).pathname || ""; } catch { return ""; } })()}
              </span>
            </div>
            <h3 className="text-xl text-[#1a0dab] group-hover:underline leading-snug mb-1 font-normal">
              {result.title}
            </h3>
            <p className="text-sm text-[#4d5156] leading-relaxed line-clamp-2">
              {result.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SearchResults({ query, onResultClick, onSearch }: SearchResultsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("all");

  const { data: results, isLoading } = useQuery<SearchResult[]>({
    queryKey: ["/api/search", query],
    queryFn: async () => {
      const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: !!query,
  });

  const handleUrlOpen = (url: string) => {
    const fakeResult: SearchResult = { title: url, url, description: "", favicon: "" };
    onResultClick(fakeResult);
  };

  if (!query) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <Search className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <h2 className="text-xl text-foreground mb-2">Search the web</h2>
        <p className="text-muted-foreground text-sm">Enter a search term to get started.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <SearchBar
        query={query}
        onSearch={onSearch}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="flex-1 overflow-auto">
        {activeTab === "all" && (
          <AllResults
            query={query}
            results={results}
            isLoading={isLoading}
            onResultClick={onResultClick}
          />
        )}

        {activeTab === "ai" && (
          <AIMode
            query={query}
            searchResults={results}
            onResultClick={handleUrlOpen}
          />
        )}

        {activeTab === "images" && (
          <ImageResults query={query} onImageClick={handleUrlOpen} />
        )}

        {activeTab === "video" && (
          <VideoResults query={query} onVideoClick={handleUrlOpen} />
        )}

        {activeTab === "news" && (
          <NewsResults query={query} onNewsClick={handleUrlOpen} />
        )}
      </div>
    </div>
  );
}
