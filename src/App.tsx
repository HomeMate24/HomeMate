import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import Index from "./pages/Index";
import Home from "./pages/Home";
import Chat from "./pages/Chat";
import ProviderDashboard from "./pages/ProviderDashboard";
import WorkerDashboard from "./pages/WorkerDashboard";
import ClientDashboard from "./pages/ClientDashboard";
import BrowseWorkers from "./pages/BrowseWorkers";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/home" element={<Home />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/worker-dashboard" element={<WorkerDashboard />} />
            <Route path="/dashboard" element={<ProviderDashboard />} />
            <Route path="/client-dashboard" element={<ClientDashboard />} />
            <Route path="/browse-workers" element={<BrowseWorkers />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
