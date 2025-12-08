import { Search, Shield, Zap, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, KeyboardEvent } from "react";

interface HomepageProps {
  onSearch: (query: string) => void;
  onNavigate: (url: string) => void;
}

const quickLinks = [
  { name: "Google", url: "https://www.google.com", icon: "G", gradient: "from-blue-500 to-blue-600" },
  { name: "YouTube", url: "https://www.youtube.com", icon: "▶", gradient: "from-red-500 to-red-600" },
  { name: "Wikipedia", url: "https://www.wikipedia.org", icon: "W", gradient: "from-gray-600 to-gray-700" },
  { name: "GitHub", url: "https://github.com", icon: "⌘", gradient: "from-gray-700 to-gray-800" },
  { name: "Reddit", url: "https://www.reddit.com", icon: "R", gradient: "from-orange-500 to-orange-600" },
  { name: "Twitter", url: "https://twitter.com", icon: "𝕏", gradient: "from-gray-800 to-black" },
  { name: "Discord", url: "https://discord.com", icon: "D", gradient: "from-indigo-500 to-indigo-600" },
  { name: "Twitch", url: "https://www.twitch.tv", icon: "T", gradient: "from-purple-500 to-purple-600" },
];

const gameLinks = [
  { name: "Slither.io", url: "https://slither.io", gradient: "from-green-500 to-emerald-600" },
  { name: "Agar.io", url: "https://agar.io", gradient: "from-cyan-500 to-blue-600" },
  { name: "Krunker", url: "https://krunker.io", gradient: "from-orange-500 to-red-600" },
  { name: "1v1.LOL", url: "https://1v1.lol", gradient: "from-purple-500 to-pink-600" },
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
    <div className="h-full flex flex-col items-center justify-start p-8 overflow-auto gradient-gaming">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />
      </div>
      
      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center pt-12">
        <div className="text-center mb-10">
          <h1 className="text-6xl md:text-7xl font-black tracking-tight mb-3">
            <span className="bg-gradient-to-r from-primary via-pink-500 to-purple-500 bg-clip-text text-transparent neon-text">
              SCHOOL-Y
            </span>
          </h1>
          <p className="text-muted-foreground text-lg font-medium tracking-wide">
            THE UNBLOCKED BROWSER
          </p>
        </div>

        <div className="w-full max-w-2xl mb-12">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary via-pink-500 to-purple-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity" />
            <div className="relative glass rounded-2xl p-1">
              <div className="relative flex items-center">
                <Search className="absolute left-5 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search the web or enter a URL..."
                  className="w-full h-14 pl-14 pr-4 text-lg bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
                  data-testid="input-homepage-search"
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span>Bypass Filters</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span>Fast Proxy</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <span>Unblocked</span>
            </div>
          </div>
        </div>

        <div className="w-full mb-10">
          <h2 className="text-sm font-bold text-primary uppercase tracking-widest mb-4 text-center">
            Quick Access
          </h2>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {quickLinks.map((link) => (
              <button
                key={link.name}
                onClick={() => onNavigate(link.url)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl glass hover-elevate active-elevate-2 transition-all group"
                data-testid={`link-quick-${link.name.toLowerCase()}`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${link.gradient} flex items-center justify-center text-white text-xl font-bold shadow-lg group-hover:scale-110 transition-transform`}>
                  {link.icon}
                </div>
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors truncate max-w-full">
                  {link.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="w-full mb-10">
          <h2 className="text-sm font-bold text-primary uppercase tracking-widest mb-4 text-center">
            Popular Games
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {gameLinks.map((link) => (
              <button
                key={link.name}
                onClick={() => onNavigate(link.url)}
                className="glass rounded-xl p-4 hover-elevate active-elevate-2 transition-all group"
                data-testid={`link-game-${link.name.toLowerCase().replace(/\./g, '-')}`}
              >
                <div className={`h-16 rounded-lg bg-gradient-to-br ${link.gradient} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                  <span className="text-2xl font-black text-white">{link.name.split('.')[0].toUpperCase()}</span>
                </div>
                <span className="text-sm font-medium text-foreground">{link.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="text-center pb-8">
          <p className="text-sm text-muted-foreground">
            Type a search query or paste a URL to get started
          </p>
          <p className="text-xs text-muted-foreground/60 mt-2">
            Powered by advanced proxy technology
          </p>
        </div>
      </div>
    </div>
  );
}
