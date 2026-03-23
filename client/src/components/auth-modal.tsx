import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MessageSquare, Globe } from "lucide-react";
import { SchoolyLogo } from "@/components/schooly-logo";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  initialMode?: "login" | "register";
}

export function AuthModal({ open, onClose, initialMode = "login" }: AuthModalProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setMode(initialMode);
  }, [open, initialMode]);

  const reset = () => { setUsername(""); setPassword(""); setError(""); };
  const switchMode = (m: "login" | "register") => { setMode(m); reset(); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password);
      }
      reset();
      onClose();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <SchoolyLogo size="small" />
          </div>
          <DialogTitle className="text-center text-base">
            {mode === "login" ? "Welcome back" : "Join Schooly"}
          </DialogTitle>
          {mode === "register" && (
            <p className="text-center text-xs text-muted-foreground mt-1">
              Create an account to save history, chat in School Messages, and more
            </p>
          )}
        </DialogHeader>

        {mode === "register" && (
          <div className="flex gap-3 mb-2 mt-1">
            <div className="flex-1 bg-muted/50 rounded-lg p-2.5 flex flex-col items-center gap-1">
              <Globe className="w-4 h-4 text-[#4285F4]" />
              <span className="text-[10px] text-muted-foreground text-center">Save history</span>
            </div>
            <div className="flex-1 bg-muted/50 rounded-lg p-2.5 flex flex-col items-center gap-1">
              <MessageSquare className="w-4 h-4 text-[#34A853]" />
              <span className="text-[10px] text-muted-foreground text-center">Live chat</span>
            </div>
          </div>
        )}

        <form onSubmit={submit} className="flex flex-col gap-3 mt-1">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              data-testid="input-username"
              autoComplete="username"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              maxLength={20}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              data-testid="input-password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && (
            <p data-testid="text-auth-error" className="text-sm text-red-500 text-center">
              {error}
            </p>
          )}

          <Button type="submit" data-testid="button-auth-submit" disabled={loading} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {mode === "login" ? "Sign In" : "Create Account"}
          </Button>

          <p className="text-sm text-center text-muted-foreground">
            {mode === "login" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  data-testid="button-switch-register"
                  onClick={() => switchMode("register")}
                  className="text-[#4285F4] hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  data-testid="button-switch-login"
                  onClick={() => switchMode("login")}
                  className="text-[#4285F4] hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
