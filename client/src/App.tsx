import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Browser from "@/pages/browser";
import About from "@/pages/about";
import ProfilePage from "@/pages/profile";
import MessagesPage from "@/pages/messages";
import SignInPage from "@/pages/sign-in";
import TrollScreen from "@/pages/troll-screen";
import { Loader2 } from "lucide-react";

function Router() {
  return (
    <Switch>
      <Route path="/about" component={About} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/messages" component={MessagesPage} />
      <Route path="/" component={Browser} />
      <Route path="/search" component={Browser} />
      <Route component={Browser} />
    </Switch>
  );
}

function AuthGate() {
  const { user, loading, kicked, trolled, clearKicked } = useAuth();

  if (trolled) return <TrollScreen />;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-[#4285F4]" />
      </div>
    );
  }

  if (!user) {
    return <SignInPage kicked={kicked} onKickedDismiss={clearKicked} />;
  }

  return <Router />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <AuthGate />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
