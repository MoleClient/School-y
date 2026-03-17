import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { SchoolyLogo } from "@/components/schooly-logo";
import { Trash2, Globe, Clock, LogOut, User, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";

interface HistoryItem {
  id: string;
  url: string;
  title: string;
  favicon: string | null;
  visitedAt: string;
}

function getFavicon(url: string, favicon?: string | null) {
  if (favicon) return favicon;
  try {
    const { origin } = new URL(url);
    return `${origin}/favicon.ico`;
  } catch {
    return null;
  }
}

function getDomain(url: string) {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return url; }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

  const { data: history = [], isLoading } = useQuery<HistoryItem[]>({
    queryKey: ["/api/user/history"],
    queryFn: () => fetch("/api/user/history", { credentials: "include" }).then((r) => r.json()),
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/user/history/${id}`, { method: "DELETE", credentials: "include" }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/user/history"] }),
  });

  const clearMutation = useMutation({
    mutationFn: () =>
      fetch("/api/user/history", { method: "DELETE", credentials: "include" }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/user/history"] }),
  });

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">You need to sign in to view your profile.</p>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  const connectedSites = Array.from(
    new Map(
      history.map((h) => [getDomain(h.url), { domain: getDomain(h.url), favicon: h.favicon, url: h.url }])
    ).values()
  ).slice(0, 20);

  const memberSince = new Date(user.createdAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            data-testid="button-back"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <SchoolyLogo className="text-lg" />
          <span className="text-sm text-muted-foreground">/ Profile</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Account card */}
        <div className="bg-card border border-border rounded-md p-6 flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <User className="w-7 h-7 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 data-testid="text-username" className="text-xl font-semibold">{user.username}</h2>
            <p className="text-sm text-muted-foreground">Member since {memberSince}</p>
            <p className="text-sm text-muted-foreground">{history.length} sites visited</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            data-testid="button-logout"
            onClick={handleLogout}
            className="flex-shrink-0"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Sign out
          </Button>
        </div>

        {/* Sites visited */}
        {connectedSites.length > 0 && (
          <section>
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600" />
              Sites you&apos;ve browsed
            </h3>
            <div className="flex flex-wrap gap-2">
              {connectedSites.map((site) => {
                const fav = getFavicon(site.url, site.favicon);
                const hasErr = imgErrors.has(site.domain);
                return (
                  <div
                    key={site.domain}
                    className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-md text-sm text-muted-foreground"
                    data-testid={`chip-site-${site.domain}`}
                  >
                    {fav && !hasErr ? (
                      <img
                        src={fav}
                        alt=""
                        className="w-4 h-4 rounded-sm flex-shrink-0"
                        onError={() => setImgErrors((prev) => new Set(prev).add(site.domain))}
                      />
                    ) : (
                      <Globe className="w-4 h-4 flex-shrink-0" />
                    )}
                    {site.domain}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Activity log */}
        <section>
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Activity log
            </h3>
            {history.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                data-testid="button-clear-history"
                onClick={() => clearMutation.mutate()}
                disabled={clearMutation.isPending}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Clear all
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded-md animate-pulse" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Globe className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p>No browsing activity yet.</p>
              <p className="text-sm">Sites you visit through Schooly will appear here.</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border border border-border rounded-md overflow-hidden">
              {history.map((item) => {
                const fav = getFavicon(item.url, item.favicon);
                const hasErr = imgErrors.has(item.id);
                return (
                  <div
                    key={item.id}
                    data-testid={`row-history-${item.id}`}
                    className="flex items-center gap-3 px-4 py-3 bg-card hover-elevate group"
                  >
                    {fav && !hasErr ? (
                      <img
                        src={fav}
                        alt=""
                        className="w-4 h-4 rounded-sm flex-shrink-0"
                        onError={() => setImgErrors((prev) => new Set(prev).add(item.id))}
                      />
                    ) : (
                      <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{getDomain(item.url)}</p>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{timeAgo(item.visitedAt)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      data-testid={`button-delete-history-${item.id}`}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      onClick={() => deleteMutation.mutate(item.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
