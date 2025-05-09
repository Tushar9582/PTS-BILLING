
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom";
import { BillingProvider } from "@/contexts/BillingContext";

// Pages
import Dashboard from "@/pages/Dashboard";
import BusinessSetup from "@/pages/BusinessSetup";
import PointOfSale from "@/pages/PointOfSale";
import Products from "@/pages/Products";
import ProductForm from "@/pages/ProductForm";
import Categories from "@/pages/Categories";
import SalesHistory from "@/pages/SalesHistory";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BillingProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" />
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/setup" element={<BusinessSetup />} />
          <Route path="/pos" element={<PointOfSale />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/add" element={<ProductForm />} />
          <Route path="/products/edit/:productId" element={<ProductForm />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/sales" element={<SalesHistory />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </BillingProvider>
  </QueryClientProvider>
);

export default App;
