import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Browser from "@/pages/browser";
import SignIn from "@/pages/signin";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { data, isLoading } = useQuery<{ authenticated: boolean }>({
    queryKey: ["/api/auth/status"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary animate-pulse text-xl font-bold">Loading...</div>
      </div>
    );
  }

  if (!data?.authenticated) {
    return <Redirect to="/signin" />;
  }

  return <Component />;
}

function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  const { data, isLoading } = useQuery<{ authenticated: boolean }>({
    queryKey: ["/api/auth/status"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary animate-pulse text-xl font-bold">Loading...</div>
      </div>
    );
  }

  if (data?.authenticated) {
    return <Redirect to="/" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/signin">
        <PublicRoute component={SignIn} />
      </Route>
      <Route path="/">
        <ProtectedRoute component={Browser} />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
