
import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useBilling } from "@/contexts/BillingContext";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Home,
  Package,
  ShoppingCart,
  FileText,
  Settings,
  LayoutDashboard,
  List,
  Plus,
  Menu,
  X,
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isConfigured } = useBilling();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isConfigured && location.pathname !== "/setup") {
    return (
      <div className="flex h-screen items-center justify-center bg-billing-background">
        <div className="text-center px-4">
          <h1 className="text-2xl font-bold text-billing-dark mb-4">
            Welcome to QuickBill
          </h1>
          <p className="text-billing-secondary mb-6">
            Please complete the business setup to continue
          </p>
          <NavLink
            to="/setup"
            className="bg-billing-primary text-white px-6 py-3 rounded-md hover:bg-blue-600 transition-colors"
          >
            Setup Business
          </NavLink>
        </div>
      </div>
    );
  }

  const navItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <LayoutDashboard size={20} />,
      showWhen: isConfigured,
    },
    {
      name: "Point of Sale",
      path: "/pos",
      icon: <ShoppingCart size={20} />,
      showWhen: isConfigured,
    },
    {
      name: "Products",
      path: "/products",
      icon: <Package size={20} />,
      showWhen: isConfigured,
    },
    {
      name: "Add Product",
      path: "/products/add",
      icon: <Plus size={20} />,
      showWhen: isConfigured,
    },
    {
      name: "Categories",
      path: "/categories",
      icon: <List size={20} />,
      showWhen: isConfigured,
    },
    {
      name: "Sales History",
      path: "/sales",
      icon: <FileText size={20} />,
      showWhen: isConfigured,
    },
    {
      name: "Settings",
      path: "/settings",
      icon: <Settings size={20} />,
      showWhen: true,
    },
  ];

  const filteredNavItems = navItems.filter((item) => item.showWhen);

  return (
    <div className="flex h-screen bg-billing-background overflow-hidden">
      {/* Mobile Header */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 h-16 bg-white z-50 flex items-center justify-between px-4 border-b border-gray-200">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="mr-3 p-2 rounded-md hover:bg-gray-100"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h1 className="text-xl font-bold text-billing-dark">QuickBill</h1>
          </div>
          
          {location.pathname === "/pos" && (
            <div className="text-sm font-medium text-billing-secondary">
              Point of Sale
            </div>
          )}
        </div>
      )}
      
      {/* Sidebar */}
      <aside 
        className={`${
          isMobile 
            ? `fixed inset-0 z-40 transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} transition-transform duration-300 ease-in-out` 
            : "w-64 relative"
        } bg-white border-r border-gray-200 shadow-sm h-screen`}
      >
        {!isMobile && (
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-billing-dark">QuickBill</h1>
          </div>
        )}
        
        <div className={`mt-${isMobile ? "16" : "6"} h-full overflow-y-auto`}>
          <ul className="space-y-1 px-3">
            {filteredNavItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                      isActive
                        ? "bg-billing-primary text-white"
                        : "text-billing-dark hover:bg-gray-100"
                    }`
                  }
                  onClick={() => isMobile && setSidebarOpen(false)}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className={`flex-1 overflow-auto ${isMobile ? "pt-16" : ""}`}>
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
