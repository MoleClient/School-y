import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, Shield, Zap } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function SignIn() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();

  const loginMutation = useMutation({
    mutationFn: async (password: string) => {
      const response = await apiRequest("POST", "/api/auth/login", { password });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setLocation("/");
      }
    },
    onError: () => {
      setError("Invalid password. Try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!password.trim()) {
      setError("Please enter the password");
      return;
    }
    loginMutation.mutate(password);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <Card className="w-full max-w-md glassmorphism border-primary/30 relative z-10">
        <CardContent className="pt-8 pb-8 px-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/20 border border-primary/40 mb-4">
              <Shield className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
                SCHOOL-Y
              </span>
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Enter the password to access the browser
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Enter password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary/50 text-lg"
                data-testid="input-password"
                autoFocus
              />
            </div>

            {error && (
              <div className="text-destructive text-sm text-center bg-destructive/10 py-2 rounded-md border border-destructive/20">
                {error}
              </div>
            )}

            {loginMutation.error && !error && (
              <div className="text-destructive text-sm text-center bg-destructive/10 py-2 rounded-md border border-destructive/20">
                Invalid password. Try again.
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-lg font-bold"
              disabled={loginMutation.isPending}
              data-testid="button-signin"
            >
              {loginMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Zap className="w-5 h-5 animate-pulse" />
                  Verifying...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Access School-y
                </span>
              )}
            </Button>
          </form>

          <div className="mt-8 flex justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>IP-Based</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Persistent</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
