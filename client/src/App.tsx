import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import Wardrobe from "@/pages/Wardrobe";
import ItemDetail from "@/pages/ItemDetail";
import OutfitBuilder from "@/pages/OutfitBuilder";
import OutfitEdit from "@/pages/OutfitEdit";
import Outfits from "@/pages/Outfits";
import Tags from "@/pages/Tags";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Wardrobe} />
        <Route path="/wardrobe" component={Wardrobe} />
        <Route path="/item/:id" component={ItemDetail} />
        <Route path="/outfits" component={Outfits} />
        <Route path="/outfit/:id/edit" component={OutfitEdit} />
        <Route path="/outfit-builder" component={OutfitBuilder} />
        <Route path="/tags" component={Tags} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
