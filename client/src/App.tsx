import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Browser from "@/pages/browser";
import About from "@/pages/about";

function Router() {
  return (
    <Switch>
      <Route path="/about" component={About} />
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
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
