import { useQuery } from "@tanstack/react-query";
import { SearchResult } from "@shared/schema";
import { Search, Globe, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SearchResultsProps {
  query: string;
  onResultClick: (result: SearchResult) => void;
  onSearch: (query: string) => void;
}

function AIOverview({ query }: { query: string }) {
  return (
    <div className="mb-6 rounded-lg border border-border bg-background p-5" data-testid="section-ai-overview">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-medium text-foreground">AI Overview</h2>
        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Beta</span>
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed">
        <p>AI Overview for "{query}" will appear here once you provide your API key and model name. This feature uses AI to generate a helpful summary of the search topic.</p>
      </div>
    </div>
  );
}

function SearchBar({ query, onSearch }: { query: string; onSearch: (q: string) => void }) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = form.elements.namedItem("search") as HTMLInputElement;
    const val = input.value.trim();
    if (val) onSearch(val);
  };

  return (
    <div className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3">
      <div className="max-w-[692px] mx-auto flex items-center gap-4">
        <svg viewBox="0 0 272 92" className="w-[92px] h-[30px] flex-shrink-0 cursor-pointer" onClick={() => window.location.reload()} aria-label="Google">
          <path d="M115.75 47.18c0 12.77-9.99 22.18-22.25 22.18s-22.25-9.41-22.25-22.18C71.25 34.32 81.24 25 93.5 25s22.25 9.32 22.25 22.18zm-9.74 0c0-7.98-5.79-13.44-12.51-13.44S80.99 39.2 80.99 47.18c0 7.9 5.79 13.44 12.51 13.44s12.51-5.55 12.51-13.44z" fill="#EA4335"/>
          <path d="M163.75 47.18c0 12.77-9.99 22.18-22.25 22.18s-22.25-9.41-22.25-22.18c0-12.85 9.99-22.18 22.25-22.18s22.25 9.32 22.25 22.18zm-9.74 0c0-7.98-5.79-13.44-12.51-13.44s-12.51 5.46-12.51 13.44c0 7.9 5.79 13.44 12.51 13.44s12.51-5.55 12.51-13.44z" fill="#FBBC05"/>
          <path d="M209.75 26.34v39.82c0 16.38-9.66 23.07-21.08 23.07-10.75 0-17.22-7.19-19.66-13.07l8.48-3.53c1.51 3.61 5.21 7.87 11.17 7.87 7.31 0 11.84-4.51 11.84-13v-3.19h-.34c-2.18 2.69-6.38 5.04-11.68 5.04-11.09 0-21.25-9.66-21.25-22.09 0-12.52 10.16-22.26 21.25-22.26 5.29 0 9.49 2.35 11.68 4.96h.34v-3.61h9.25zm-8.56 20.92c0-7.81-5.21-13.52-11.84-13.52-6.72 0-12.35 5.71-12.35 13.52 0 7.73 5.63 13.36 12.35 13.36 6.63 0 11.84-5.63 11.84-13.36z" fill="#4285F4"/>
          <path d="M225 3v65h-9.5V3h9.5z" fill="#34A853"/>
          <path d="M262.02 54.48l7.56 5.04c-2.44 3.61-8.32 9.83-18.48 9.83-12.6 0-22.01-9.74-22.01-22.18 0-13.19 9.49-22.18 20.92-22.18 11.51 0 17.14 9.16 18.98 14.11l1.01 2.52-29.65 12.28c2.27 4.45 5.8 6.72 10.75 6.72 4.96 0 8.4-2.44 10.92-6.14zm-23.27-7.98l19.82-8.23c-1.09-2.77-4.37-4.7-8.23-4.7-4.95 0-11.84 4.37-11.59 12.93z" fill="#EA4335"/>
          <path d="M35.29 41.19V32H67c.31 1.64.47 3.58.47 5.68 0 7.06-1.93 15.79-8.15 22.01-6.05 6.3-13.78 9.66-24.02 9.66C16.32 69.35.36 53.89.36 34.91.36 15.93 16.32.47 35.3.47c10.5 0 17.98 4.12 23.6 9.49l-6.64 6.64c-4.03-3.78-9.49-6.72-16.97-6.72-13.86 0-24.7 11.17-24.7 25.03 0 13.86 10.84 25.03 24.7 25.03 8.99 0 14.11-3.61 17.39-6.89 2.66-2.66 4.41-6.46 5.1-11.65l-22.49-.01z" fill="#4285F4"/>
        </svg>
        <form onSubmit={handleSubmit} className="flex-1">
          <div className="flex items-center rounded-full border border-border shadow-sm px-4 py-2 gap-2 bg-background hover:shadow-md transition-shadow">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <input
              name="search"
              type="text"
              defaultValue={query}
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
        <div className="max-w-[692px] mx-auto px-4 py-6">
          {isLoading ? (
            <div className="space-y-6">
              <div className="rounded-lg border border-border p-5 space-y-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-5 w-72" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
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
                About {results.length} results
              </p>

              <AIOverview query={query} />

              <div className="space-y-7">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className="group cursor-pointer"
                    onClick={() => onResultClick(result)}
                    data-testid={`card-result-${index}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                        {result.favicon ? (
                          <img
                            src={result.favicon}
                            alt=""
                            className="w-4 h-4"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-foreground/70 truncate">{result.url}</p>
                      </div>
                    </div>
                    <h3 className="text-xl text-primary group-hover:underline leading-snug mb-1">
                      {result.title}
                    </h3>
                    <p className="text-sm text-foreground/70 leading-relaxed line-clamp-2">
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
