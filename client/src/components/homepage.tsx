import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, KeyboardEvent } from "react";

interface HomepageProps {
  onSearch: (query: string) => void;
  onNavigate: (url: string) => void;
}

const quickLinks = [
  { name: "Google", url: "https://www.google.com", color: "bg-blue-500", icon: "G" },
  { name: "YouTube", url: "https://www.youtube.com", color: "bg-red-500", icon: "▶" },
  { name: "Wikipedia", url: "https://www.wikipedia.org", color: "bg-gray-700", icon: "W" },
  { name: "GitHub", url: "https://github.com", color: "bg-gray-900 dark:bg-gray-700", icon: "⌘" },
  { name: "Reddit", url: "https://www.reddit.com", color: "bg-orange-500", icon: "R" },
  { name: "Twitter", url: "https://twitter.com", color: "bg-sky-500", icon: "𝕏" },
  { name: "Amazon", url: "https://www.amazon.com", color: "bg-amber-600", icon: "A" },
  { name: "Netflix", url: "https://www.netflix.com", color: "bg-red-600", icon: "N" },
];

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
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-background">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-2">
          School-y
        </h1>
        <p className="text-muted-foreground text-lg">
          Your Safari-style browser experience
        </p>
      </div>

      <div className="w-full max-w-2xl mb-12">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search the web or enter a URL..."
            className="w-full h-14 pl-12 pr-4 text-lg rounded-full border-2 border-border bg-card shadow-lg focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:border-primary"
            data-testid="input-homepage-search"
          />
        </div>
      </div>

      <div className="w-full max-w-3xl">
        <h2 className="text-sm font-medium text-muted-foreground mb-4 text-center">
          Quick Links
        </h2>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
          {quickLinks.map((link) => (
            <button
              key={link.name}
              onClick={() => onNavigate(link.url)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover-elevate active-elevate-2 transition-all group"
              data-testid={`link-quick-${link.name.toLowerCase()}`}
            >
              <div className={`w-12 h-12 rounded-xl ${link.color} flex items-center justify-center text-white text-xl font-bold shadow-md group-hover:scale-105 transition-transform`}>
                {link.icon}
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors truncate max-w-full">
                {link.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-16 text-center">
        <p className="text-sm text-muted-foreground">
          Type a search query or paste a URL above to get started
        </p>
      </div>
    </div>
  );
}
