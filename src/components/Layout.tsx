import { useBilling } from "@/contexts/BillingContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useIsMobile } from "@/hooks/use-mobile";
import i18n from "@/i18n/config";
import CryptoJS from "crypto-js";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { auth } from "../firebase/firebaseConfig";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  BarChart2,
  Briefcase,
  Coffee,
  CreditCard,
  FileText,
  Languages,
  LayoutDashboard,
  List,
  Menu,
  Moon,
  Package,
  Palette,
  Plus,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Store,
  Sun,
  Users,
  Utensils,
  X,
  Zap,
  ArrowLeft,
  LogOut,
  Home,
  Tag,
  PieChart,
  MoreHorizontal
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY || "your-very-secure-secret-key";

const decryptField = (encrypted: string): string => {
  if (!encrypted || typeof encrypted !== 'string') {
    return encrypted || '';
  }

  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || encrypted;
  } catch (err) {
    console.warn("Decryption error for field:", encrypted);
    return encrypted;
  }
};

const decryptNumberField = (encrypted: string, defaultValue = 0): number => {
  const decrypted = decryptField(encrypted);
  const num = parseFloat(decrypted);
  return isNaN(num) ? defaultValue : num;
};

// Move featureCards outside the component to prevent recreation on every render
const featureCards = [
  {
    icon: <Zap className="w-8 h-8 text-yellow-500" />,
    title: "3-Tap Billing",
    description: "Create invoices in just three taps with our optimized workflow"
  },
  {
    icon: <BarChart2 className="w-8 h-8 text-blue-500" />,
    title: "Real-time Analytics",
    description: "Get insights into your sales and business performance instantly"
  },
  {
    icon: <CreditCard className="w-8 h-8 text-green-500" />,
    title: "Multiple Payment Options",
    description: "Accept cash, cards, UPI and more with integrated payment tracking"
  },
  {
    icon: <Users className="w-8 h-8 text-purple-500" />,
    title: "Customer Management",
    description: "Track customer purchases and offer loyalty rewards"
  },
  {
    icon: <ShieldCheck className="w-8 h-8 text-red-500" />,
    title: "Secure Cloud Backup",
    description: "Your data is automatically backed up and protected"
  },
  {
    icon: <Smartphone className="w-8 h-8 text-indigo-500" />,
    title: "Mobile Friendly",
    description: "Works perfectly on all devices from desktop to mobile"
  }
];

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isConfigured, businessConfig } = useBilling();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);
  const [showCalculator, setShowCalculator] = useState(false);
  const { t, i18n } = useTranslation(); // Added i18n from useTranslation
  const [languageChanged, setLanguageChanged] = useState(false);

  const navigate = useNavigate();

  // Track navigation history for back button
  const [navHistory, setNavHistory] = useState<string[]>([]);

  const decryptedBusinessConfig = businessConfig ? {
    name: decryptField(businessConfig.name || ''),
    type: decryptField(businessConfig.type || 'cafe'),
    address: decryptField(businessConfig.address || ''),
    phone: decryptField(businessConfig.phone || ''),
    email: decryptField(businessConfig.email || ''),
    taxRate: decryptNumberField(businessConfig.taxRate || '10', 10),
    logo: decryptField(businessConfig.logo || ''),
    gstNumber: decryptField(businessConfig.gstNumber || ''),
    active: businessConfig.active || false
  } : null;
  
  const handleLogout = () => {
    auth.signOut().then(() => {
      navigate("/login");
    });
  };

  const handleBackToLogin = () => {
    navigate("/login");
  };

  const handleCalculatorToggle = () => {
    setShowCalculator((prev) => !prev);
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
    // Force a re-render by updating state
    setLanguageChanged(prev => !prev);
  };

  // Function to handle back navigation
  const handleBack = () => {
    if (navHistory.length > 1) {
      // Remove current page from history
      const newHistory = [...navHistory];
      newHistory.pop();
      setNavHistory(newHistory);
      
      // Navigate to previous page
      const previousPath = newHistory[newHistory.length - 1];
      navigate(previousPath);
    } else {
      // If no history, go to dashboard
      navigate("/dashboard");
    }
  };

  // Update navigation history when location changes
  useEffect(() => {
    if (isConfigured && location.pathname !== "/setup") {
      setNavHistory(prev => {
        // Don't add the same path consecutively
        if (prev.length === 0 || prev[prev.length - 1] !== location.pathname) {
          return [...prev, location.pathname];
        }
        return prev;
      });
    }
  }, [location.pathname, isConfigured]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % featureCards.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  
  // Get page title based on current route
  const getPageTitle = () => {
    const route = location.pathname;
    if (route === "/dashboard") return t('Dashboard');
    if (route === "/pos") return t('Point Of Sale');
    if (route === "/products") return t('Products');
    if (route === "/products/add") return t('Add Product');
    if (route === "/categories") return t('Categories');
    if (route === "/sales") return t('Sales History');
    if (route === "/settings") return t('Settings');
    return "QuickBill";
  };
  
  if (!isConfigured && location.pathname !== "/setup") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 overflow-auto py-8">
        <div className="w-full max-w-6xl px-4 py-4">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-6 flex justify-between items-center"
          >
            {/* Logout Button positioned the same way */}
            <button
              onClick={handleLogout}
              className="inline-flex items-center text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <LogOut className="w-5 h-5 mr-1" />
              {t('Logout')}
            </button>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8 md:mb-12"
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-3 md:mb-4">
              {t('Welcome_to')} <span className="text-blue-600 dark:text-blue-400">QuickBill</span>
            </h1>
            <h2 className="mb-5 mt-5 font-bold text-xl">by PTS</h2>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto px-2">
              {t('Welcome_description')}
            </p>
          </motion.div>
  
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12 px-2">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-lg shadow-md border border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-center mb-3">
                <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-full mr-3">
                  <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{t('Feature_1_title')}</h3>
              </div>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                {t('Feature_1_description')}
              </p>
            </motion.div>
  
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-lg shadow-md border border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-center mb-3">
                <div className="bg-purple-100 dark:bg-purple-900/50 p-2 rounded-full mr-3">
                  <BarChart2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{t('Feature_2_title')}</h3>
              </div>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                {t('Feature_2_description')}
              </p>
            </motion.div>
  
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-lg shadow-md border border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-center mb-3">
                <div className="bg-green-100 dark:bg-green-900/50 p-2 rounded-full mr-3">
                  <Settings className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{t('feature_3_title')}</h3>
              </div>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                {t('Feature_3_description')}
              </p>
            </motion.div>
          </div>
  
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 rounded-xl md:rounded-2xl p-6 mb-8 md:mb-10 shadow-lg overflow-hidden relative mx-2"
          >
            <div className="relative z-10">
              <div className="flex flex-col lg:flex-Row items-center">
                <div className="w-full lg:w-1/2 mb-6 lg:mb-0 lg:pr-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                    {t('Feature_showcase_title')}
                  </h2>
                  <p className="text-blue-100 mb-4 text-sm md:text-base">
                    {t('Feature_showcase_description')}
                  </p>
                  <div className="flex space-x-2">
                    {featureCards.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentFeature(index)}
                        className={`w-2 h-2 rounded-full transition-colors ${currentFeature === index ? 'bg-white' : 'bg-white/50'}`}
                        aria-label={`View feature ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="w-full lg:w-1/2 bg-white/10 backdrop-blur-sm rounded-lg p-4 min-h-[180px] sm:min-h-[200px] flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentFeature}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="flex flex-col items-center text-center w-full"
                    >
                      <div className="bg-white/20 p-3 rounded-full mb-3">
                        {featureCards[currentFeature].icon}
                      </div>
                      <h3 className="text-lg md:text-xl font-semibold text-white mb-1">
                        {t(featureCards[currentFeature].title.toLowerCase().replace(' ', '_'))}
                      </h3>
                      <p className="text-blue-100 text-sm md:text-base px-2">
                        {t(featureCards[currentFeature].description.toLowerCase().replace(/[ ,]/g, '_'))}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
  
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center px-2"
          >
            <NavLink
              to="/setup"
              className="inline-flex items-center justify-center px-6 py-3 sm:px-8 sm:py-3 text-base sm:text-lg font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 rounded-full shadow-lg transition-all transform hover:scale-[1.02]"
            >
              {t('start_setup_button')}
              <svg className="w-4 h-4 sm:w-5 sm:h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </NavLink>
            <p className="mt-3 text-sm sm:text-base text-gray-500 dark:text-gray-400">
              {t('no_credit_card_required')}
            </p>
          </motion.div>
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

  // Define navItems inside the component to get fresh translations
  const navItems = [
    {
      name: t('Dashboard'),
      path: "/dashboard",
      icon: <LayoutDashboard size={20} />,
      mobileIcon: <Home size={24} />,
      showWhen: isConfigured,
    },
    {
      name: t('Point Of Sale'),
      path: "/pos",
      icon: <ShoppingCart size={20} />,
      mobileIcon: <ShoppingCart size={24} />,
      showWhen: isConfigured,
    },
    {
      name: t('Products'),
      path: "/products",
      icon: <Package size={20} />,
      mobileIcon: <Tag size={24} />,
      showWhen: isConfigured,
    },
    {
      name: t('Add Product'),
      path: "/products/add",
      icon: <Plus size={20} />,
      mobileIcon: <Plus size={24} />,
      showWhen: isConfigured,
    },
    {
      name: t('Categories'),
      path: "/categories",
      icon: <List size={20} />,
      mobileIcon: <List size={24} />,
      showWhen: isConfigured,
    },
    {
      name: t('Sales History'),
      path: "/sales",
      icon: <FileText size={20} />,
      mobileIcon: <PieChart size={24} />,
      showWhen: isConfigured,
    },
    {
      name: t('Settings'),
      path: "/settings",
      icon: <Settings size={20} />,
      mobileIcon: <Settings size={24} />,
      showWhen: true,
    },
  ];

  const filteredNavItems = navItems.filter((item) => item.showWhen);

  // Mobile navigation items (limited to 4 main items like WhatsApp)
  const mobileNavItems = filteredNavItems.filter(item => 
    ['/dashboard', '/pos', '/products', '/sales'].includes(item.path)
  );

  // Check if we should show the back button
  const shouldShowBackButton = isConfigured && 
    location.pathname !== "/dashboard" && 
    location.pathname !== "/setup" &&
    location.pathname !== "/";

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-billing-dark dark:text-white">QuickBill</h1>
      </div>
      
      {decryptedBusinessConfig?.name && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
          {getBusinessIcon(decryptedBusinessConfig.type)}
          <div>
            <h2 className="text-base font-medium dark:text-white truncate">{decryptedBusinessConfig.name}</h2>
            <p className="text-xs text-billing-secondary dark:text-gray-400 capitalize truncate">
              {decryptedBusinessConfig.type || t('business')}
            </p>
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
                  `flex items-center gap-3 px-4 py-3 rounded-md transition-colors text-sm md:text-base ${
                    isActive
                      ? "bg-billing-primary text-white dark:bg-blue-600"
                      : "text-billing-dark dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`
                }
              >
                {item.icon}
                <span className="truncate">{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        
        <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-700 space-y-2">

          <div className="mt-4 flex justify-center">
            <Button
              onClick={handleLogout}
              className="bg-red-600 text-white px-6 py-1 text-sm rounded shadow hover:bg-red-700 transition duration-200"
            >
              {t('Logout')}
            </Button>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-billing-background dark:bg-gray-900 overflow-hidden">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="w-64 relative bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-sm h-screen flex-shrink-0">
          <SidebarContent />
        </aside>
      )}

      {/* Main content */}
      <main className={`flex-1 overflow-auto ${isMobile ? "pb-16" : ""} dark:text-white`}>
        {/* Mobile Header with WhatsApp-style bottom navigation */}
        {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50">
            <div className="flex justify-around items-center h-16">
              {mobileNavItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center justify-center w-full h-full transition-colors ${
                      isActive
                        ? "text-billing-primary dark:text-blue-400"
                        : "text-gray-500 dark:text-gray-400"
                    }`
                  }
                >
                  {item.mobileIcon}
                </NavLink>
              ))}
              
              {/* More menu button */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className={`flex items-center justify-center w-full h-full ${
                      location.pathname === "/settings" || 
                      location.pathname === "/categories" || 
                      location.pathname === "/products/add"
                        ? "text-billing-primary dark:text-blue-400" 
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    <MoreHorizontal size={24} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 mb-2 p-2" align="center" side="top">
                  <div className="grid gap-1">
                    {filteredNavItems
                      .filter(item => !mobileNavItems.some(mobileItem => mobileItem.path === item.path))
                      .map((item) => (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          className={({ isActive }) => 
                            `flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                              isActive 
                                ? "bg-billing-primary text-white" 
                                : "hover:bg-gray-100 dark:hover:bg-gray-800"
                            }`
                          }
                          onClick={() => document.body.click()} // Close popover on click
                        >
                          {item.icon}
                          <span>{item.name}</span>
                        </NavLink>
                      ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}
        
        <div className={`p-4 md:p-6 h-full overflow-auto scrollbar-hide ${isMobile ? "pb-4" : ""}`}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;