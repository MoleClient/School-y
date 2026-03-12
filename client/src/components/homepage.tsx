import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Search } from "lucide-react";
import { SchoolyLogo } from "./schooly-logo";
import { LuckyWheel } from "./lucky-wheel";

interface HomepageProps {
  onSearch: (query: string) => void;
  onNavigate: (url: string) => void;
}

export function Homepage({ onSearch, onNavigate }: HomepageProps) {
  const [searchValue, setSearchValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [showWheel, setShowWheel] = useState(false);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const navigate = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    if (urlPattern.test(trimmed)) {
      onNavigate(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    } else {
      onSearch(trimmed);
    }
  };

  const handleChange = (value: string) => {
    setSearchValue(value);
    setSelectedIdx(-1);
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (value.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    suggestTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
        setShowSuggestions(true);
      } catch { setSuggestions([]); }
    }, 220);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx(i => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx(i => Math.max(i - 1, -1));
        return;
      }
      if (e.key === "Escape") { setShowSuggestions(false); setSelectedIdx(-1); return; }
    }
    if (e.key === "Enter") {
      const val = selectedIdx >= 0 ? suggestions[selectedIdx] : searchValue;
      setShowSuggestions(false);
      navigate(val);
    }
  };

  const pickSuggestion = (s: string) => {
    setSearchValue(s);
    setShowSuggestions(false);
    navigate(s);
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isOpen = showSuggestions && suggestions.length > 0;

  return (
    <div className="h-full flex flex-col bg-background">
      {showWheel && <LuckyWheel onClose={() => setShowWheel(false)} />}

      <header className="flex items-center justify-end gap-4 px-4 py-2">
        <a href="#" className="text-[13px] text-foreground/80 hover:underline">About</a>
        <a href="#" className="text-[13px] text-foreground/80 hover:underline">Store</a>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center -mt-16">
        <div className="mb-8">
          <SchoolyLogo size="large" />
        </div>

        <div className="w-full max-w-[584px] px-4">
          <div ref={containerRef} className="relative">
            <div
              className={`flex items-center border border-[#dfe1e5] shadow-sm hover:shadow-md transition-shadow px-5 py-3 gap-3 bg-background ${isOpen ? "rounded-t-2xl border-b-transparent shadow-md" : "rounded-full"}`}
            >
              <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => handleChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                placeholder="Search the web or enter a URL"
                className="flex-1 bg-transparent outline-none text-base text-foreground placeholder:text-muted-foreground"
                data-testid="input-homepage-search"
                autoFocus
                autoComplete="off"
              />
            </div>

            {/* Suggestions dropdown */}
            {isOpen && (
              <div className="absolute top-full left-0 right-0 bg-background border border-[#dfe1e5] border-t-0 rounded-b-2xl shadow-md z-50 overflow-hidden">
                <div className="h-px bg-[#e8eaed] mx-4" />
                {suggestions.map((s, i) => (
                  <div
                    key={s}
                    className={`flex items-center gap-3 px-5 py-2.5 cursor-pointer ${i === selectedIdx ? "bg-[#f8f9fa]" : "hover:bg-[#f8f9fa]"}`}
                    onMouseDown={() => pickSuggestion(s)}
                  >
                    <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-foreground">{s}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 mt-7">
            <button
              onClick={() => navigate(searchValue)}
              className="px-4 py-2 text-sm bg-[#f8f9fa] text-[#3c4043] rounded-md border border-[#f8f9fa] hover:border-[#dadce0] hover:shadow-sm transition-all dark:bg-[#303134] dark:text-[#e8eaed] dark:border-[#303134] dark:hover:border-[#5f6368]"
              data-testid="button-schooly-search"
            >
              School-y Search
            </button>
            <button
              onClick={() => setShowWheel(true)}
              className="px-4 py-2 text-sm bg-[#f8f9fa] text-[#3c4043] rounded-md border border-[#f8f9fa] hover:border-[#dadce0] hover:shadow-sm transition-all dark:bg-[#303134] dark:text-[#e8eaed] dark:border-[#303134] dark:hover:border-[#5f6368]"
              data-testid="button-feeling-lucky"
            >
              I'm Feeling Lucky
            </button>
          </div>
        </div>
      </div>

      <footer className="border-t border-border bg-[#f2f2f2] dark:bg-[#171717]">
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 text-[13px] text-[#70757a]">
          <div className="flex items-center gap-6">
            <span className="hover:underline cursor-pointer">Advertising</span>
            <span className="hover:underline cursor-pointer">Business</span>
            <span className="hover:underline cursor-pointer">How Search works</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="hover:underline cursor-pointer">Privacy</span>
            <span className="hover:underline cursor-pointer">Terms</span>
            <span className="hover:underline cursor-pointer">Settings</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
