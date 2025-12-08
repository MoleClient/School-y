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
    <div className="flex flex-col border-b border-primary/20 bg-card/50 backdrop-blur-md">
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors cursor-pointer" data-testid="button-close" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors cursor-pointer" data-testid="button-minimize" />
            <div className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-500 transition-colors cursor-pointer" data-testid="button-maximize" />
          </div>
        </div>
        
        <div className="flex items-center gap-1 ml-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={onBack}
            disabled={!canGoBack}
            data-testid="button-back"
            className="h-8 w-8 text-muted-foreground hover:text-primary disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onForward}
            disabled={!canGoForward}
            data-testid="button-forward"
            className="h-8 w-8 text-muted-foreground hover:text-primary disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onReload}
            data-testid="button-reload"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 mx-2">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <div className="relative flex items-center">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {view === "webpage" ? (
                  <Globe className="h-4 w-4 text-primary" />
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
                placeholder="Search or enter URL..."
                className="pl-10 pr-28 h-9 bg-background/80 border-primary/20 rounded-xl font-mono text-sm focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/40"
                data-testid="input-address-bar"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/50 pointer-events-none hidden sm:block">
                Press Enter
              </span>
            </div>
          </div>
        </form>

        <div className="hidden md:flex items-center gap-2">
          <span className="text-xs font-bold text-primary tracking-widest">SCHOOL-Y</span>
        </div>
      </div>
    </div>
  );
}
