import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TaxProvider } from "@/contexts/TaxContext";

import { StickyFooter } from "@/components/StickyFooter";
import Index from "./pages/Index.tsx";
import InvITs from "./pages/InvITs.tsx";
import MasterRanker from "./pages/MasterRanker.tsx";
import About from "./pages/About.tsx";
import Terminology from "./pages/Terminology.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <TaxProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
            <div className="min-h-screen flex flex-col bg-background text-foreground">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/ranker" element={<MasterRanker />} />
              <Route path="/invits" element={<InvITs />} />
              <Route path="/terminology" element={<Terminology />} />
              <Route path="/about" element={<About />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <StickyFooter />
          </div>
        </BrowserRouter>
      </TaxProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
