import { useQuery } from "@tanstack/react-query";
import { SearchResult } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Loader2, Search, ExternalLink, Globe } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SearchResultsProps {
  query: string;
  onResultClick: (result: SearchResult) => void;
}

export function SearchResults({ query, onResultClick }: SearchResultsProps) {
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
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Search className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Welcome to School-y
        </h2>
        <p className="text-muted-foreground max-w-md">
          Search the web or enter a URL to browse websites right here without leaving the platform.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-4 space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <Search className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          No results found
        </h2>
        <p className="text-muted-foreground max-w-md">
          Try searching for something else or check your spelling.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4 md:p-6 gradient-gaming">
      <div className="max-w-5xl mx-auto">
        <p className="text-sm text-muted-foreground mb-4">
          <span className="text-primary font-bold">{results.length}</span> results for "<span className="text-foreground">{query}</span>"
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {results.map((result, index) => (
            <Card
              key={index}
              className="p-4 hover-elevate active-elevate-2 cursor-pointer transition-all group glass border-primary/10 hover:border-primary/30"
              onClick={() => onResultClick(result)}
              data-testid={`card-result-${index}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1 group-hover:bg-primary/20 transition-colors">
                  {result.favicon ? (
                    <img
                      src={result.favicon}
                      alt=""
                      className="w-5 h-5"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const parent = target.parentElement;
                        if (parent) {
                          const icon = document.createElement("div");
                          icon.innerHTML = `<svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;
                          parent.appendChild(icon.firstElementChild!);
                        }
                      }}
                    />
                  ) : (
                    <Globe className="w-5 h-5 text-primary" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground text-base mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                    {result.title}
                  </h3>
                  <p className="text-xs text-primary/70 mb-2 truncate font-mono">
                    {result.url}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {result.description}
                  </p>
                </div>

                <ExternalLink className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
