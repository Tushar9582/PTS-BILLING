
import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useBilling } from "@/contexts/BillingContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/ThemeContext";
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
  Coffee,
  Store,
  ShoppingBag,
  Utensils,
  Briefcase,
  Sun,
  Moon,
  Palette
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import AppearanceSettings from "./AppearanceSettings";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isConfigured, businessConfig } = useBilling();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isConfigured && location.pathname !== "/setup") {
    return (
      <div className="flex h-screen items-center justify-center bg-billing-background dark:bg-gray-900">
        <div className="text-center px-4">
          <h1 className="text-2xl font-bold text-billing-dark dark:text-white mb-4">
            Welcome to QuickBill
          </h1>
          <p className="text-billing-secondary dark:text-gray-300 mb-6">
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

  const getBusinessIcon = (type: string) => {
    switch(type) {
      case "cafe":
        return <Coffee size={24} className="text-amber-500" />;
      case "grocery":
        return <Store size={24} className="text-green-500" />;
      case "retail":
        return <ShoppingBag size={24} className="text-indigo-500" />;
      case "restaurant":
        return <Utensils size={24} className="text-red-500" />;
      default:
        return <Briefcase size={24} className="text-blue-500" />;
    }
  };

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

  const SidebarContent = () => (
    <>
      {businessConfig?.name && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
          {getBusinessIcon(businessConfig.type)}
          <div>
            <h2 className="text-base font-medium dark:text-white">{businessConfig.name}</h2>
            <p className="text-xs text-billing-secondary dark:text-gray-400 capitalize">{businessConfig.type || "Business"}</p>
          </div>
        </div>
      )}
      
      <div className={`${isMobile ? "mt-4" : ""} h-full overflow-y-auto`}>
        <ul className="space-y-1 px-3 py-4">
          {filteredNavItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                onClick={() => isMobile && setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                    isActive
                      ? "bg-billing-primary text-white dark:bg-blue-600"
                      : "text-billing-dark dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`
                }
              >
                {item.icon}
                <span>{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        
        <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-700">
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="flex items-center gap-2 w-full justify-start dark:border-gray-700 dark:text-gray-200"
              >
                <Palette size={20} />
                <span>Appearance</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="grid gap-4">
                <div className="flex items-center gap-4">
                  <Button 
                    variant={theme === "light" ? "default" : "outline"}
                    size="sm"
                    className="flex items-center gap-2"
                    onClick={() => setTheme("light")}
                  >
                    <Sun className="h-4 w-4" />
                    Light
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    size="sm"
                    className="flex items-center gap-2"
                    onClick={() => setTheme("dark")}
                  >
                    <Moon className="h-4 w-4" />
                    Dark
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-billing-background dark:bg-gray-900 overflow-hidden">
      {/* Mobile Header */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 z-50 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" className="mr-3 p-2 rounded-md dark:text-white">
                  <Menu size={20} />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 bg-white dark:bg-gray-800">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <h1 className="text-xl font-bold text-billing-dark dark:text-white">QuickBill</h1>
                  <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
                    <X size={16} />
                  </Button>
                </div>
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <h1 className="text-xl font-bold text-billing-dark dark:text-white">QuickBill</h1>
          </div>
          
          {location.pathname === "/pos" && (
            <div className="text-sm font-medium text-billing-secondary dark:text-gray-300">
              Point of Sale
            </div>
          )}
        </div>
      )}
      
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="w-64 relative bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-sm h-screen">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-xl font-bold text-billing-dark dark:text-white">QuickBill</h1>
          </div>
          <SidebarContent />
        </aside>
      )}

      {/* Main content */}
      <main className={`flex-1 overflow-auto ${isMobile ? "pt-16" : ""} dark:text-white`}>
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
