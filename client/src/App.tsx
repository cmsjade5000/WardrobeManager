import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import Wardrobe from "@/pages/Wardrobe";
import ItemDetail from "@/pages/ItemDetail";
import OutfitBuilder from "@/pages/OutfitBuilder";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Wardrobe} />
        <Route path="/item/:id" component={ItemDetail} />
        <Route path="/outfits" component={OutfitBuilder} />
        {/* Placeholder for Tags page, redirects to Wardrobe for now or shows todo */}
        <Route path="/tags" component={() => <div className="p-8 text-center text-muted-foreground">Tags Management Coming Soon</div>} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
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
