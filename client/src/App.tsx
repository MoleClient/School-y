import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Browser from "@/pages/browser";
import About from "@/pages/about";
import ProfilePage from "@/pages/profile";

function Router() {
  return (
    <Switch>
      <Route path="/about" component={About} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/" component={Browser} />
      <Route path="/search" component={Browser} />
      <Route component={Browser} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
