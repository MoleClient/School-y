import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Camera, Trash2, Globe, Check, Loader2, ExternalLink, Clock
} from "lucide-react";
import { SiX, SiInstagram, SiDiscord } from "react-icons/si";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

type HistoryItem = {
  id: string;
  url: string;
  title: string;
  favicon: string | null;
  visitedAt: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [socialTwitter, setSocialTwitter] = useState(user?.socialTwitter || "");
  const [socialInstagram, setSocialInstagram] = useState(user?.socialInstagram || "");
  const [socialDiscord, setSocialDiscord] = useState(user?.socialDiscord || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: history = [] } = useQuery<HistoryItem[]>({
    queryKey: ["/api/user/history"],
    enabled: !!user,
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/user/history/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/user/history"] }),
  });

  const clearHistory = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/user/history"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/user/history"] }),
  });

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">You need to be logged in to view your profile.</p>
          <Button onClick={() => setLocation("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileError("");
    try {
      let avatarUrl = user.avatarUrl;
      if (avatarPreview) {
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl: avatarPreview }),
        });
        if (uploadRes.ok) {
          const d = await uploadRes.json();
          avatarUrl = d.url;
        }
        setAvatarPreview(null);
      }

      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim() || null,
          avatarUrl,
          bio: bio.trim() || null,
          socialTwitter: socialTwitter.trim() || null,
          socialInstagram: socialInstagram.trim() || null,
          socialDiscord: socialDiscord.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save profile");
      const updated = await res.json();
      updateUser(updated);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (err: any) {
      setProfileError(err.message || "Failed to save");
    } finally {
      setSavingProfile(false);
    }
  };

  const initials = (user.displayName || user.username).slice(0, 2).toUpperCase();
  const uniqueDomains = [...new Set(
    history.map(h => { try { return new URL(h.url).hostname.replace("www.", ""); } catch { return h.url; } })
  )].slice(0, 12);

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Back */}
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          data-testid="button-back-profile"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Profile header */}
        <div className="flex items-start gap-5 mb-8">
          <div className="relative flex-shrink-0">
            <Avatar className="w-20 h-20 ring-2 ring-[#4285F4]/20">
              <AvatarImage src={avatarPreview || user.avatarUrl || undefined} />
              <AvatarFallback className="text-2xl font-semibold bg-gradient-to-br from-[#4285F4] to-[#6B72CF] text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#4285F4] text-white rounded-full flex items-center justify-center shadow-md hover:bg-blue-600 transition-colors"
              title="Change avatar"
              data-testid="button-change-avatar"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground">{user.displayName || user.username}</h1>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Member since {formatDate(user.createdAt)}</p>
            {user.bio && <p className="text-sm text-foreground/80 mt-2">{user.bio}</p>}
            <div className="flex items-center gap-3 mt-2">
              {user.socialTwitter && (
                <a href={`https://x.com/${user.socialTwitter.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                  <SiX className="w-3.5 h-3.5" />
                </a>
              )}
              {user.socialInstagram && (
                <a href={`https://instagram.com/${user.socialInstagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                  <SiInstagram className="w-3.5 h-3.5" />
                </a>
              )}
              {user.socialDiscord && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <SiDiscord className="w-3.5 h-3.5" />
                  {user.socialDiscord}
                </span>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => logout().then(() => setLocation("/"))} data-testid="button-logout">
            Sign out
          </Button>
        </div>

        {/* Edit profile card */}
        <section className="bg-muted/30 rounded-xl border border-border p-5 mb-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Edit Profile</h2>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label className="text-xs">Display Name</Label>
              <Input
                placeholder={user.username}
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                maxLength={30}
                data-testid="input-display-name"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Bio</Label>
              <Input
                placeholder="Tell people about yourself..."
                value={bio}
                onChange={e => setBio(e.target.value)}
                maxLength={120}
                data-testid="input-bio"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs flex items-center gap-1.5"><SiX className="w-3 h-3" /> X / Twitter</Label>
                <Input
                  placeholder="@username"
                  value={socialTwitter}
                  onChange={e => setSocialTwitter(e.target.value)}
                  data-testid="input-social-twitter"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs flex items-center gap-1.5"><SiInstagram className="w-3 h-3" /> Instagram</Label>
                <Input
                  placeholder="@username"
                  value={socialInstagram}
                  onChange={e => setSocialInstagram(e.target.value)}
                  data-testid="input-social-instagram"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs flex items-center gap-1.5"><SiDiscord className="w-3 h-3" /> Discord</Label>
                <Input
                  placeholder="username"
                  value={socialDiscord}
                  onChange={e => setSocialDiscord(e.target.value)}
                  data-testid="input-social-discord"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <Button onClick={handleSaveProfile} disabled={savingProfile} size="sm" data-testid="button-save-profile">
              {savingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : profileSaved ? <Check className="w-3.5 h-3.5 mr-1.5" /> : null}
              {profileSaved ? "Saved!" : "Save Changes"}
            </Button>
            {avatarPreview && !savingProfile && (
              <span className="text-xs text-muted-foreground">New avatar ready — save to apply</span>
            )}
            {profileError && <p className="text-xs text-red-500">{profileError}</p>}
          </div>
        </section>

        {/* Sites browsed */}
        {uniqueDomains.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#4285F4]" />
              Sites Visited
            </h2>
            <div className="flex flex-wrap gap-2">
              {uniqueDomains.map(domain => (
                <span key={domain} className="px-2.5 py-1 bg-muted rounded-full text-xs text-muted-foreground border border-border">
                  {domain}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Browsing history */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#4285F4]" />
              Browsing History
              <span className="text-xs font-normal text-muted-foreground">({history.length})</span>
            </h2>
            {history.length > 0 && (
              <button
                onClick={() => clearHistory.mutate()}
                className="text-xs text-red-500 hover:underline"
                data-testid="button-clear-history"
              >
                Clear all
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Globe className="w-8 h-8 opacity-20 mx-auto mb-2" />
              No browsing history yet
            </div>
          ) : (
            <div className="space-y-1">
              {history.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 group transition-colors"
                  data-testid={`history-item-${item.id}`}
                >
                  {item.favicon ? (
                    <img src={item.favicon} alt="" className="w-4 h-4 rounded-sm flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.url}</p>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0 hidden sm:block">
                    {formatDate(item.visitedAt)}
                  </span>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => deleteItem.mutate(item.id)}
                    className="p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all"
                    data-testid={`button-delete-history-${item.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
