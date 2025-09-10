// App.tsx
import { Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Providers & Context
import { BillingProvider } from "@/contexts/BillingContext";
import { TooltipProvider } from "@/components/ui/tooltip";

// UI Notifications
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";

// Pages
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import VerifyEmail from "@/pages/VerifyEmail";
import NotFound from "@/pages/NotFound";
import BusinessSetup from "@/pages/BusinessSetup";
import Dashboard from "@/pages/Dashboard";
import PointOfSale from "@/pages/PointOfSale";
import Products from "@/pages/Products";
import ProductForm from "@/pages/ProductForm";
import Categories from "@/pages/Categories";
import SalesHistory from "@/pages/SalesHistory";
import Settings from "@/pages/Settings";
import AdminManagement from "@/pages/AdminManagement";

// Components
import ProtectedRoute from "@/components/ProtectedRoute";
import ChatBot from "@/pages/Chatbot"; // ✅ Floating movable chatbot

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BillingProvider>
        <TooltipProvider>
          {/* Global UI components */}
          <Toaster />
          <Sonner position="top-right" />

          {/* Application Routes */}
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />

            {/* Protected Routes */}
            <Route
              path="/setup"
              element={
                <ProtectedRoute>
                  <BusinessSetup />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pos"
              element={
                <ProtectedRoute>
                  <PointOfSale />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedRoute>
                  <Products />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products/add"
              element={
                <ProtectedRoute>
                  <ProductForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products/edit/:productId"
              element={
                <ProtectedRoute>
                  <ProductForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/categories"
              element={
                <ProtectedRoute>
                  <Categories />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sales"
              element={
                <ProtectedRoute>
                  <SalesHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/adminmanagement"
              element={
                <ProtectedRoute>
                  <AdminManagement />
                </ProtectedRoute>
              }
            />

            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>

          {/* ✅ Floating movable ChatBot visible globally */}
          <ChatBot />
        </TooltipProvider>
      </BillingProvider>
    </QueryClientProvider>
  );
};

export default App;
