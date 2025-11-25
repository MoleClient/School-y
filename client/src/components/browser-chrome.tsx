import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, RotateCw, Search, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BrowserView } from "@/pages/browser";

interface BrowserChromeProps {
  currentUrl: string;
  searchQuery: string;
  onSearch: (query: string) => void;
  onNavigate: (url: string) => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  view: BrowserView;
}

export function BrowserChrome({
  currentUrl,
  searchQuery,
  onSearch,
  onNavigate,
  onBack,
  onForward,
  onReload,
  canGoBack,
  canGoForward,
  view,
}: BrowserChromeProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (view === "webpage") {
      setInputValue(currentUrl);
    } else {
      setInputValue(searchQuery);
    }
  }, [currentUrl, searchQuery, view]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    
    if (urlPattern.test(trimmed)) {
      const url = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
      onNavigate(url);
    } else {
      onSearch(trimmed);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col border-b border-border/50 bg-card/30 backdrop-blur-sm">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30">
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 hover-elevate active-elevate-2" data-testid="button-close" />
            <div className="w-3 h-3 rounded-full bg-yellow-500 hover-elevate active-elevate-2" data-testid="button-minimize" />
            <div className="w-3 h-3 rounded-full bg-green-500 hover-elevate active-elevate-2" data-testid="button-maximize" />
          </div>
        </div>
        
        <div className="flex items-center gap-1 ml-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={onBack}
            disabled={!canGoBack}
            data-testid="button-back"
            className="h-8 w-8"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onForward}
            disabled={!canGoForward}
            data-testid="button-forward"
            className="h-8 w-8"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onReload}
            data-testid="button-reload"
            className="h-8 w-8"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 mx-2">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {view === "webpage" ? (
                <Globe className="h-4 w-4" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </div>
            <Input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search or enter website URL"
              className="pl-10 pr-4 h-9 bg-background/60 border-border/50 rounded-lg font-mono text-sm focus-visible:ring-2 focus-visible:ring-primary/20"
              data-testid="input-address-bar"
            />
          </div>
        </form>
      </div>
    </div>
  );
}
