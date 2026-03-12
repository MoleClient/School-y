import { useState, KeyboardEvent } from "react";
import { Search } from "lucide-react";
import { SchoolyLogo } from "./schooly-logo";

interface HomepageProps {
  onSearch: (query: string) => void;
  onNavigate: (url: string) => void;
}

export function Homepage({ onSearch, onNavigate }: HomepageProps) {
  const [searchValue, setSearchValue] = useState("");

  const handleSubmit = () => {
    const trimmed = searchValue.trim();
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
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <header className="flex items-center justify-end gap-4 px-4 py-2">
        <a href="#" className="text-[13px] text-foreground/80 hover:underline">About</a>
        <a href="#" className="text-[13px] text-foreground/80 hover:underline">Store</a>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center -mt-16">
        <div className="mb-8">
          <SchoolyLogo size="large" />
        </div>

        <div className="w-full max-w-[584px] px-4">
          <div className="flex items-center rounded-full border border-[#dfe1e5] shadow-sm hover:shadow-md transition-shadow px-5 py-3 gap-3 bg-background">
            <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search the web or enter a URL"
              className="flex-1 bg-transparent outline-none text-base text-foreground placeholder:text-muted-foreground"
              data-testid="input-homepage-search"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-center gap-3 mt-7">
            <button
              onClick={handleSubmit}
              className="px-4 py-2 text-sm bg-[#f8f9fa] text-[#3c4043] rounded-md border border-[#f8f9fa] hover:border-[#dadce0] hover:shadow-sm transition-all"
              data-testid="button-schooly-search"
            >
              School-y Search
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 text-sm bg-[#f8f9fa] text-[#3c4043] rounded-md border border-[#f8f9fa] hover:border-[#dadce0] hover:shadow-sm transition-all"
              data-testid="button-feeling-lucky"
            >
              I'm Feeling Lucky
            </button>
          </div>
        </div>
      </div>

      <footer className="border-t border-border bg-[#f2f2f2]">
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
