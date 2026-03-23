import { useState, KeyboardEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { SchoolyLogo } from "@/components/schooly-logo";
import { SpringScene } from "@/components/spring-scene";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface SignInPageProps {
  kicked?: boolean;
  onKickedDismiss?: () => void;
}

export default function SignInPage({ kicked, onKickedDismiss }: SignInPageProps) {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username.trim() || !password) return;
    setError("");
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (err: any) {
      setError(err.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="flex items-center justify-end gap-3 px-4 py-2">
        <span className="text-[13px] text-foreground/60">Sign in to continue</span>
      </header>

      <div className="flex-1 flex flex-col">
        <div
          className="flex flex-col items-center justify-center"
          style={{ flex: "0 0 auto", paddingTop: "clamp(32px, 6vh, 60px)", paddingBottom: 16 }}
        >
          <div className="mb-8">
            <SchoolyLogo size="large" />
          </div>

          <div className="w-full max-w-[400px] px-4">
            <div className="border border-[#dfe1e5] rounded-2xl p-8 bg-background shadow-sm">
              <h2 className="text-lg font-medium text-foreground text-center mb-1">
                Welcome back
              </h2>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Sign in to access School-y
              </p>

              {kicked && (
                <div
                  className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 text-center cursor-pointer"
                  onClick={onKickedDismiss}
                  data-testid="text-kicked-notice"
                >
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                    You were signed out because another device signed into your account.
                  </p>
                  <p className="text-xs text-red-500/70 dark:text-red-400/70 mt-1">
                    Only one device can be signed in at a time. Tap to dismiss.
                  </p>
                </div>
              )}

              <form onSubmit={submit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="signin-username">Username</Label>
                  <Input
                    id="signin-username"
                    data-testid="input-signin-username"
                    autoComplete="username"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                    autoFocus
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    data-testid="input-signin-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                  />
                </div>

                {error && (
                  <p
                    data-testid="text-signin-error"
                    className="text-sm text-red-500 text-center"
                  >
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  data-testid="button-signin-submit"
                  disabled={loading || !username.trim() || !password}
                  className="w-full"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Sign In
                </Button>
              </form>
            </div>
          </div>
        </div>

        <SpringScene />
      </div>

      <footer className="border-t border-border bg-[#f2f2f2] dark:bg-[#171717]">
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 text-[13px] text-[#70757a]">
          <div className="flex items-center gap-6">
            <span>School-y</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="hover:underline cursor-pointer">Privacy</span>
            <span className="hover:underline cursor-pointer">Terms</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
