import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Search, MessageSquare } from "lucide-react";
import { SchoolyLogo } from "./schooly-logo";
import { LuckyWheel } from "./lucky-wheel";
import { SpringScene } from "./spring-scene";
import { AccountMenu } from "./account-menu";
import { AuthModal } from "./auth-modal";
import { StorePopup } from "./store-popup";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

interface HomepageProps {
  onSearch: (query: string) => void;
  onNavigate: (url: string) => void;
}

export function Homepage({ onSearch, onNavigate }: HomepageProps) {
  const { user } = useAuth();
  const [searchValue, setSearchValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [showWheel, setShowWheel] = useState(false);
  const [showStore, setShowStore] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [pendingSearch, setPendingSearch] = useState<string | null>(null);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  // When auth modal closes and user is now logged in + there's a pending search, execute it
  useEffect(() => {
    if (!showAuth && pendingSearch && user) {
      const q = pendingSearch;
      setPendingSearch(null);
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      if (urlPattern.test(q)) {
        onNavigate(q.startsWith("http") ? q : `https://${q}`);
      } else {
        onSearch(q);
      }
    }
  }, [showAuth, pendingSearch, user]);

  const navigate = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSearch(trimmed);
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
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx(i => Math.max(i - 1, -1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (selectedIdx >= 0) {
          pickSuggestion(suggestions[selectedIdx]);
        } else {
          setShowSuggestions(false);
          navigate(searchValue);
        }
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
        setSelectedIdx(-1);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      navigate(searchValue);
    }
  };

  const pickSuggestion = (s: string) => {
    setSearchValue(s);
    setShowSuggestions(false);
    setSelectedIdx(-1);
    navigate(s);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setSelectedIdx(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isOpen = showSuggestions && suggestions.length > 0;

  return (
    <div className="h-full flex flex-col bg-background">
      {showWheel && <LuckyWheel onClose={() => setShowWheel(false)} />}
      {showStore && <StorePopup onClose={() => setShowStore(false)} />}
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} initialMode={authMode} />

      <header className="flex items-center justify-end gap-3 px-4 py-2">
        <button
          onClick={() => setLocation("/about")}
          className="text-[13px] text-foreground/80 hover:underline bg-transparent border-none"
          data-testid="button-about"
        >
          About
        </button>
        <button
          onClick={() => setShowStore(true)}
          className="text-[13px] text-foreground/80 hover:underline bg-transparent border-none"
          data-testid="button-store"
        >
          Store
        </button>
        {/* School Messages with NEW badge */}
        <button
          onClick={() => setLocation("/messages")}
          className="flex items-center gap-1.5 text-[13px] text-[#4285F4] hover:underline bg-transparent border-none font-medium"
          data-testid="button-messages"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Messages</span>
          <span className="px-1 py-px text-[9px] font-bold bg-[#EA4335] text-white rounded-full uppercase tracking-wide leading-none">NEW</span>
        </button>
        <AccountMenu />
      </header>

      <div className="flex-1 flex flex-col">
        <div className="flex flex-col items-center justify-center" style={{ flex: "0 0 auto", paddingTop: "clamp(32px, 8vh, 80px)", paddingBottom: 16 }}>
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

            {/* Sign-in nudge for non-logged-in users */}
            {!user && (
              <div className="mt-5 text-center text-[12px] text-muted-foreground">
                <button
                  onClick={() => { setAuthMode("register"); setShowAuth(true); }}
                  className="text-[#4285F4] hover:underline"
                  data-testid="button-join-schooly"
                >
                  Join Schooly
                </button>
                {" to save your history & chat"}
                {" · "}
                <button
                  onClick={() => { setAuthMode("login"); setShowAuth(true); }}
                  className="text-[#4285F4] hover:underline"
                  data-testid="button-sign-in-nudge"
                >
                  Sign in
                </button>
              </div>
            )}
          </div>
        </div>

        <SpringScene />
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
