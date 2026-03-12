import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchResult } from "@shared/schema";
import { Search, Globe } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SchoolyLogo } from "./schooly-logo";
import { AIOverview } from "./ai-overview";

interface SearchResultsProps {
  query: string;
  onResultClick: (result: SearchResult) => void;
  onSearch: (query: string) => void;
}

function SearchBar({ query, onSearch }: { query: string; onSearch: (q: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = inputRef.current?.value.trim();
    if (val) onSearch(val);
  };

  return (
    <div className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3">
      <div className="max-w-[720px] mx-auto flex items-center gap-5">
        <div className="flex-shrink-0">
          <SchoolyLogo size="small" onClick={() => onSearch("")} />
        </div>
        <form onSubmit={handleSubmit} className="flex-1">
          <div className="flex items-center rounded-full border border-[#dfe1e5] shadow-sm hover:shadow-md transition-shadow px-4 py-2 gap-2 bg-background">
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
  );
}

export function SearchResults({ query, onResultClick, onSearch }: SearchResultsProps) {
  const { data: results, isLoading } = useQuery<SearchResult[]>({
    queryKey: ["/api/search", query],
    queryFn: async () => {
      const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: !!query,
  });

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
      <SearchBar query={query} onSearch={onSearch} />

      <div className="flex-1 overflow-auto">
        <div className="py-6 max-w-[860px]" style={{ paddingLeft: "clamp(16px, 15vw, 200px)", paddingRight: "16px" }}>
          {isLoading ? (
            <div className="space-y-6">
              <div className="rounded-xl border border-border p-4 space-y-3">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
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
          ) : !results || results.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No results found for "{query}"</p>
              <p className="text-sm text-muted-foreground mt-1">Try different keywords or check your spelling.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-5" data-testid="text-result-count">
                About {results.length.toLocaleString()} results
              </p>

              <AIOverview query={query} results={results} />

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
                        {(() => {
                          try {
                            const u = new URL(result.url);
                            return u.hostname.replace("www.", "");
                          } catch { return result.url; }
                        })()}
                      </p>
                      <span className="text-[13px] text-[#70757a] truncate hidden sm:inline">
                        {(() => {
                          try {
                            const u = new URL(result.url);
                            return u.pathname || "";
                          } catch { return ""; }
                        })()}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
