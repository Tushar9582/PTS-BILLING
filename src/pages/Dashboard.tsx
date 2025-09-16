import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useBilling } from "@/contexts/BillingContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package,
  ShoppingCart,
  FileText,
  TrendingUp,
  TrendingDown,
  Coffee,
  Store,
  ShoppingBag,
  Utensils,
  ChevronDown
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import Layout from "@/components/Layout";
import StockAlerts from "@/components/StockAlerts";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { get, onValue, ref, set } from "firebase/database";
import { database } from '@/firebase/firebaseConfig';
import { toast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { auth } from "@/firebase/firebaseConfig";
import { useTranslation } from "react-i18next";
import CryptoJS from "crypto-js";
import Subscription from "@/pages/Subscription";

const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY || "your-very-secure-secret-key";

// Encryption function
const encryptField = (value: string): string => {
    if (!value) return value;
    return CryptoJS.AES.encrypt(value, SECRET_KEY).toString();
};

// Improved decryption function with better error handling
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

// Safe number decryption with fallback
const decryptNumberField = (encrypted: string, defaultValue = 0): number => {
    const decrypted = decryptField(encrypted);
    const num = parseFloat(decrypted);
    return isNaN(num) ? defaultValue : num;
};

interface BestSellingProduct {
  id: string;
  name: string;
  count: number;
  category?: string;
}

const Dashboard = () => {
  const { t } = useTranslation("dashboard");
  const { products = [], sales = [], categories = [], businessConfig } = useBilling();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [timePeriod, setTimePeriod] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Yearly'>('Weekly');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [bestSellingProducts, setBestSellingProducts] = useState<BestSellingProduct[]>([]);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [trialRemaining, setTrialRemaining] = useState<number>(0);
  const [trialExpired, setTrialExpired] = useState<boolean>(false);
  const [trialStarted, setTrialStarted] = useState<boolean>(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number>(0);
  const [trialTimeLeft, setTrialTimeLeft] = useState<string>('');

  // Check subscription status on component mount
  useEffect(() => {
    const checkSubscription = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const userId = user.uid;
        
        // Check if trial data exists in Firebase
        const trialRef = ref(database, `trials/${userId}`);
        const snapshot = await get(trialRef);
        
        if (!snapshot.exists()) {
          // First-time user → give 15-day free trial starting from now
          const duration = 15 * 24 * 60 * 60 * 1000; // 15 days in milliseconds
          const startTime = Date.now();
          
          // Store trial data in Firebase for cross-device synchronization
          await set(trialRef, {
            startTime,
            duration,
            userId,
            createdAt: startTime
          });
          
          // Also store locally for offline access
          localStorage.setItem(
            `15day_trial_${userId}`,
            JSON.stringify({ startTime, duration })
          );
          
          setTrialDaysLeft(15);
          setTrialStarted(true);
          setTrialExpired(false);
          setShowSubscriptionModal(true);
        } else {
          // Use Firebase data as the source of truth
          const trialData = snapshot.val();
          const { startTime, duration } = trialData;
          const endTime = startTime + duration;
          const now = Date.now();

          // Update local storage to match Firebase
          localStorage.setItem(
            `15day_trial_${userId}`,
            JSON.stringify({ startTime, duration })
          );

          if (now < endTime) {
            // Trial is active
            const daysLeft = Math.ceil((endTime - now) / (1000 * 60 * 60 * 24));
            setTrialDaysLeft(daysLeft);
            setTrialStarted(true);
            setTrialExpired(false);
            setShowSubscriptionModal(false);
          } else {
            // Trial expired
            setTrialDaysLeft(0);
            setTrialStarted(true);
            setTrialExpired(true);
            setShowSubscriptionModal(true);
          }
        }
      } catch (error) {
        console.error("Error checking subscription:", error);
        
        // Fallback to local storage if Firebase fails
        const userId = auth.currentUser?.uid;
        if (!userId) return;
        
        const trialData = localStorage.getItem(`15day_trial_${userId}`);
        if (!trialData) {
          // First-time user with Firebase error - create trial locally
          const duration = 15 * 24 * 60 * 60 * 1000;
          const startTime = Date.now();
          
          localStorage.setItem(
            `15day_trial_${userId}`,
            JSON.stringify({ startTime, duration })
          );
          
          setTrialDaysLeft(15);
          setTrialStarted(true);
          setTrialExpired(false);
          setShowSubscriptionModal(true);
          return;
        }
        
        try {
          const { startTime, duration } = JSON.parse(trialData);
          const endTime = startTime + duration;
          const now = Date.now();

          if (now < endTime) {
            // Trial is active
            const daysLeft = Math.ceil((endTime - now) / (1000 * 60 * 60 * 24));
            setTrialDaysLeft(daysLeft);
            setTrialStarted(true);
            setTrialExpired(false);
            setShowSubscriptionModal(false);
          } else {
            // Trial expired
            setTrialDaysLeft(0);
            setTrialStarted(true);
            setTrialExpired(true);
            setShowSubscriptionModal(true);
          }
        } catch (parseError) {
          console.error("Error parsing local trial data:", parseError);
        }
      }
    };

    checkSubscription();
  }, []);

  // Update trial time remaining - FIXED TIMER
  useEffect(() => {
    if (!trialStarted) return;

    const updateTrialTime = () => {
      const user = auth.currentUser;
      if (!user) return;

      const userId = user.uid;
      
      // Get trial data from localStorage (more reliable for real-time updates)
      const trialData = localStorage.getItem(`15day_trial_${userId}`);
      if (!trialData) return;
      
      try {
        const { startTime, duration } = JSON.parse(trialData);
        const endTime = startTime + duration;
        const now = Date.now();
        
        if (now >= endTime) {
          setTrialExpired(true);
          setTrialTimeLeft('00:00:00:00');
          setTrialDaysLeft(0);
          setShowSubscriptionModal(true);
          return;
        }
        
        const timeRemaining = endTime - now;
        
        // Calculate days, hours, minutes, seconds
        const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
        
        setTrialTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        setTrialDaysLeft(days);
        setTrialExpired(false);
      } catch (error) {
        console.error("Error parsing trial data:", error);
      }
    };

    // Update immediately
    updateTrialTime();
    
    // Set up interval for real-time updates
    const interval = setInterval(updateTrialTime, 1000);
    
    return () => clearInterval(interval);
  }, [trialStarted, trialExpired]);

  // Listen for trial updates from Firebase (for cross-device sync)
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const userId = user.uid;
    const trialRef = ref(database, `trials/${userId}`);
    
    const unsubscribe = onValue(trialRef, (snapshot) => {
      if (snapshot.exists()) {
        const trialData = snapshot.val();
        const { startTime, duration } = trialData;
        const endTime = startTime + duration;
        const now = Date.now();
        
        // Update localStorage to match Firebase
        localStorage.setItem(
          `15day_trial_${userId}`,
          JSON.stringify({ startTime, duration })
        );
        
        if (now >= endTime) {
          setTrialExpired(true);
          setTrialTimeLeft('00:00:00:00');
          setTrialDaysLeft(0);
          setShowSubscriptionModal(true);
        } else {
          const timeRemaining = endTime - now;
          const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
          setTrialDaysLeft(days);
          setTrialExpired(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Decrypt business config
  const decryptedBusinessConfig = useMemo(() => businessConfig ? {
    name: decryptField(businessConfig.name || ''),
    type: decryptField(businessConfig.type || 'cafe'),
    address: decryptField(businessConfig.address || ''),
    phone: decryptField(businessConfig.phone || ''),
    email: decryptField(businessConfig.email || ''),
    taxRate: decryptNumberField(businessConfig.taxRate || '10', 10),
    logo: decryptField(businessConfig.logo || ''),
    gstNumber: decryptField(businessConfig.gstNumber || ''),
    upiId: decryptField(businessConfig.upiId || ''),
    active: businessConfig.active || false
  } : null, [businessConfig]);

  // Decrypt products
  const decryptedProducts = useMemo(() => {
    return products.map(product => ({
      ...product,
      id: decryptField(product.id),
      name: decryptField(product.name),
      category: decryptField(product.category),
      description: decryptField(product.description || ''),
      price: decryptNumberField(product.price.toString()),
      imageUrl: decryptField(product.imageUrl || '')
    }));
  }, [products]);

  // Decrypt categories
  const decryptedCategories = useMemo(() => {
    return categories.map(category => ({
      ...category,
      id: decryptField(category.id),
      name: decryptField(category.name),
      description: decryptField(category.description || '')
    }));
  }, [categories]);

  // Decrypt sales
  const decryptedSales = useMemo(() => {
    return sales.map(sale => ({
      ...sale,
      id: decryptField(sale.id),
      customer: {
        name: decryptField(sale.customer?.name || ''),
        phone: decryptField(sale.customer?.phone || ''),
        email: sale.customer?.email ? decryptField(sale.customer.email) : undefined
      },
      customerName: decryptField(sale.customerName || ''),
      customerPhone: decryptField(sale.customerPhone || ''),
      items: sale.items?.map(item => ({
        ...item,
        id: decryptField(item.id),
        name: decryptField(item.name)
      })) || [],
      businessName: decryptField(sale.businessName || ''),
      tabName: sale.tabName ? decryptField(sale.tabName) : undefined,
      paymentMethod: decryptField(sale.paymentMethod || 'Cash')
    }));
  }, [sales]);

  const validSales = useMemo(() => decryptedSales.filter((sale) => !!sale?.date && typeof sale.grandTotal === 'number'), [decryptedSales]);
  const validProducts = useMemo(() => decryptedProducts.filter((product) => !!product?.id && typeof product.price === 'number'), [decryptedProducts]);

  // Calculate dashboard statistics
  const totalSales = validSales.length;
  const totalRevenue = useMemo(() => validSales.reduce((sum, sale) => sum + (sale.grandTotal || 0), 0), [validSales]);
  const totalProducts = validProducts.length;

  // Today's sales
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const todaySales = useMemo(() => validSales.filter(sale => sale.date.split('T')[0] === todayStr), [validSales, todayStr]);
  const todayRevenue = useMemo(() => todaySales.reduce((sum, sale) => sum + (sale.grandTotal || 0), 0), [todaySales]);

  // Revenue trend
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const yesterdaySales = useMemo(() => validSales.filter(sale => sale.date.split('T')[0] === yesterdayStr), [validSales, yesterdayStr]);
  const yesterdayRevenue = useMemo(() => yesterdaySales.reduce((sum, sale) => sum + (sale.grandTotal || 0), 0), [yesterdaySales]);
  const revenueTrend = yesterdayRevenue !== 0 ?
    ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 :
    todayRevenue > 0 ? 100 : 0;

  // Recent sales
  const recentSales = useMemo(() => [...validSales]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 7), [validSales]);

  // Chart data for last 7 days
  const last7Days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  }).reverse(), []);

  const salesByDay = useMemo(() => last7Days.map(date => {
    const daySales = validSales.filter(sale => sale.date.split('T')[0] === date);
    const dayRevenue = daySales.reduce((sum, sale) => sum + (sale.grandTotal || 0), 0);
    return {
      date: new Date(date).toLocaleDateString(undefined, { weekday: 'short' }),
      revenue: dayRevenue
    };
  }), [last7Days, validSales]);

  // Filter sales by time period
  const getFilteredSales = useCallback(() => {
    const now = new Date();
    let startDate = new Date();

    switch (timePeriod) {
      case 'Daily': startDate.setDate(now.getDate() - 1); break;
      case 'Weekly': startDate.setDate(now.getDate() - 7); break;
      case 'Monthly': startDate.setMonth(now.getMonth() - 1); break;
      case 'Yearly': startDate.setFullYear(now.getFullYear() - 1); break;
      default: startDate.setDate(now.getDate() - 7);
    }

    return validSales.filter(sale => new Date(sale.date) >= startDate);
  }, [timePeriod, validSales]);

  // Get best selling products
  const getBestSellingProducts = useCallback(() => {
    const filteredSales = getFilteredSales();
    const productSalesMap = new Map<string, { count: number; name: string; category?: string }>();

    filteredSales.forEach(sale => {
      sale.items?.forEach(item => {
        if (!item.id || !item.quantity) return;
        
        const productName = item.name || t('unknown_product');
        
        if (selectedCategory !== 'all') {
          const product = validProducts.find(p => p.id === item.id);
          if (product?.category !== selectedCategory) return;
        }
        
        const existing = productSalesMap.get(item.id);
        if (existing) {
          existing.count += item.quantity;
        } else {
          productSalesMap.set(item.id, {
            count: item.quantity,
            name: productName,
            category: validProducts.find(p => p.id === item.id)?.category
          });
        }
      });
    });

    return Array.from(productSalesMap.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        count: data.count,
        category: data.category || t('uncategorized')
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [getFilteredSales, selectedCategory, validProducts, t]);

  useEffect(() => {
    setBestSellingProducts(getBestSellingProducts());
  }, [getBestSellingProducts]);

  // Category distribution
  const categorySales = useMemo(() => {
    const salesMap: Record<string, number> = {};
    getFilteredSales().forEach(sale => {
      sale.items?.forEach(item => {
        const product = validProducts.find(p => p.id === item.id);
        if (product?.category) {
          salesMap[product.category] = (salesMap[product.category] || 0) + (item.quantity || 0);
        }
      });
    });
    return salesMap;
  }, [getFilteredSales, validProducts]);

  const categoryData = useMemo(() => Object.entries(categorySales).map(([id, count]) => {
    const category = decryptedCategories.find(c => c.id === id);
    return {
      id,
      name: category?.name || t('Uncategorized'),
      value: count
    };
  }).sort((a, b) => b.value - a.value), [categorySales, decryptedCategories, t]);

  // Business type specific animations
  const getBusinessAnimation = useCallback(() => {
    if (!decryptedBusinessConfig?.type) return null;

    switch (decryptedBusinessConfig.type) {
      case "Cafe": return <Coffee size={80} className="absolute -top-2 -right-2 opacity-10 text-amber-500 animate-pulse pointer-events-none" />;
      case "Grocery": return <Store size={80} className="absolute -top-2 -right-2 opacity-10 text-green-500 animate-pulse pointer-events-none" />;
      case "Retail": return <ShoppingBag size={80} className="absolute -top-2 -right-2 opacity-10 text-indigo-500 animate-pulse pointer-events-none" />;
      case "Restaurant": return <Utensils size={80} className="absolute -top-2 -right-2 opacity-10 text-red-500 animate-pulse pointer-events-none" />;
      default: return null;
    }
  }, [decryptedBusinessConfig]);

  const handleLogout = useCallback(() => {
    auth.signOut().then(() => {
      navigate("/login");
    });
  }, [navigate]);

  // Calculate daily average
  const uniqueSaleDates = useMemo(() => new Set(validSales.map(sale => sale.date.split('T')[0])), [validSales]);
  const dailyAverage = useMemo(() => uniqueSaleDates.size > 0 ? totalRevenue / uniqueSaleDates.size : 0, [uniqueSaleDates, totalRevenue]);

  // Calculate payment method breakdown
  const paymentMethodData = useMemo(() => {
    const methods = ['Cash', 'Card', 'UPI'];
    return methods.map(method => {
      const methodSales = validSales.filter(sale => sale.paymentMethod === method);
      const methodRevenue = methodSales.reduce((sum, sale) => sum + (sale.grandTotal || 0), 0);
      const percentage = totalRevenue > 0 ? (methodRevenue / totalRevenue) * 100 : 0;
      
      return {
        method,
        revenue: methodRevenue,
        percentage
      };
    });
  }, [validSales, totalRevenue]);

  return (
    <>
      <Layout>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-billing-dark dark:text-white">
            {t('Dashboard')}
          </h1>

          {decryptedBusinessConfig?.name && (
            <div className="text-base md:text-lg text-billing-secondary dark:text-gray-300 animate-fade-in">
              {t('Welcome_back')} {decryptedBusinessConfig.name}!
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-3 py-1 text-sm rounded shadow hover:bg-red-700 transition duration-200 ml-4"
              >
                {t('Logout')}
              </button>
            </div>
          )}
        </div>

        {/* Trial Info Banner */}
        {trialStarted && !trialExpired && (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-center text-sm text-amber-800">
            ⏳ Free Trial Active – {trialTimeLeft} remaining
          </div>
        )}

        {trialExpired && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-center text-sm text-red-800">
            ⚠️ Your free trial has expired. Please subscribe to continue using the application.
          </div>
        )}

        <StockAlerts />

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
          <Card className="bg-white dark:bg-gray-800 dark:text-white relative overflow-hidden animate-fade-in">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-billing-secondary dark:text-gray-300">
                {t('Todays_revenue')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-xl md:text-2xl font-bold dark:text-white">
                  {formatCurrency(todayRevenue)}
                </div>
                <div className="flex items-center">
                  {revenueTrend >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-billing-success mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-billing-error mr-1" />
                  )}
                  <span className={`text-xs ${revenueTrend >= 0 ? 'text-billing-success' : 'text-billing-error'}`}>
                    {revenueTrend >= 0 ? '+' : ''}{revenueTrend.toFixed(1)}%
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {todaySales.length} {t('sales_today')}
              </p>
              {getBusinessAnimation()}
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 dark:text-white relative overflow-hidden animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-billing-secondary dark:text-gray-300">
                {t('Total_revenue')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-xl md:text-2xl font-bold dark:text-white">
                  {formatCurrency(totalRevenue)}
                </div>
                <ShoppingCart className="h-5 w-5 text-billing-primary" />
              </div>
              {getBusinessAnimation()}
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 dark:text-white relative overflow-hidden animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-billing-secondary dark:text-gray-300">
                {t('Total_sales')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-xl md:text-2xl font-bold dark:text-white">
                  {totalSales}
                </div>
                <FileText className="h-5 w-5 text-billing-success" />
              </div>
              {getBusinessAnimation()}
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 dark:text-white relative overflow-hidden animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-billing-secondary dark:text-gray-300">
                {t('Total_products')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-xl md:text-2xl font-bold dark:text-white">
                  {totalProducts}
                </div>
                <Package className="h-5 w-5 text-billing-secondary" />
              </div>
              {getBusinessAnimation()}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales Chart */}
          <Card className={`col-span-1 ${!isMobile ? 'lg:col-span-2' : ''} bg-white dark:bg-gray-800 dark:text-white animate-fade-in`} style={{ animationDelay: "0.4s" }}>
            <CardHeader>
              <CardTitle>{t('Revenue_Last_7_Days')}</CardTitle>
            </CardHeader>
            <CardContent className="h-60 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByDay}>
                  <XAxis dataKey="date" stroke="CurrentColor" />
                  <YAxis stroke="CurrentColor" />
                  <Tooltip
                    formatter={(value) => [`${formatCurrency(value as number)}`, t('revenue')]}
                    contentStyle={{ backgroundColor: "var(--background)", borderRadius: "4px", border: "1px solid var(--border)", color: "var(--foreground)" }}
                    cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
                  />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Revenue Breakdown */}
          <Card className="bg-white dark:bg-gray-800 dark:text-white animate-fade-in" style={{ animationDelay: "0.5s" }}>
            <CardHeader>
              <CardTitle>{t('Revenue_Breakdown')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2 dark:text-gray-300">{t('Payment_methods')}</h3>
                  <div className="space-y-2">
                    {paymentMethodData.map(({method, percentage}) => (
                      <div key={method} className="flex items-center">
                        <div className="w-24 text-sm capitalize">{t(method)}</div>
                        <div className="flex-1 mx-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-billing-primary rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="w-20 text-right text-sm">{percentage.toFixed(1)}%</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg">
                    <h3 className="text-sm font-medium mb-1 dark:text-gray-300">{t('Daily_average')}</h3>
                    <div className="text-xl md:text-2xl font-bold dark:text-white">
                      {formatCurrency(dailyAverage)}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('Per_sale_day')}</p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg">
                    <h3 className="text-sm font-medium mb-1 dark:text-gray-300">{t('Tax_collected')}</h3>
                    <div className="text-xl md:text-2xl font-bold dark:text-white">
                      {formatCurrency(validSales.reduce((sum, sale) => sum + (sale.tax || 0), 0))}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('Total_tax')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Best Selling Products */}
          <Card className="bg-white dark:bg-gray-800 dark:text-white animate-fade-in" style={{ animationDelay: "0.6s" }}>
            <CardHeader className="flex items-center justify-between gap-2">
              <CardTitle>{t('Best_Selling_Products')}</CardTitle>
              <div className="flex gap-3 flex-wrap items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      {t(timePeriod)}
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="End">
                    <DropdownMenuItem onClick={() => setTimePeriod('Daily')}>
                      {t('Daily')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTimePeriod('Weekly')}>
                      {t('Weekly')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTimePeriod('Monthly')}>
                      {t('Monthly')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTimePeriod('Yearly')}>
                      {t('Yearly')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      {selectedCategory === 'all' ? t('All_categories') : 
                       decryptedCategories.find(c => c.id === selectedCategory)?.name || t('Select_Category')}
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="End">
                    <DropdownMenuItem onClick={() => setSelectedCategory('all')}>
                      {t('All_Categories')}
                    </DropdownMenuItem>
                    {decryptedCategories.map(category => (
                      <DropdownMenuItem 
                        key={category.id} 
                        onClick={() => setSelectedCategory(category.id)}
                      >
                        {category.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bestSellingProducts.length > 0 ? (
                  bestSellingProducts.map((product, index) => (
                    <div
                      key={`${product.id}-${index}`}
                      className="flex items-center justify-between border-b dark:border-gray-700 pb-2 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-billing-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium truncate max-w-[150px] dark:text-white">
                            {product.name}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {decryptedCategories.find(c => c.id === product.category)?.name || t('Uncategorized')}
                          </span>
                        </div>
                      </div>
                      <span className="text-billing-secondary dark:text-gray-300">
                        {product.count} {t('Sold')}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-billing-secondary dark:text-gray-300">
                    {t('No_Sales_Data')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Sales */}
          <Card className="bg-white dark:bg-gray-800 dark:text-white animate-fade-in" style={{ animationDelay: "0.7s" }}>
            <CardHeader>
              <CardTitle>{t('Recent_Sales')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                      <th className="p-3 text-xs md:text-sm">{t('Date')}</th>
                      <th className="p-3 text-xs md:text-sm">{t('Items')}</th>
                      <th className="p-3 text-xs md:text-sm">{t('Customer')}</th>
                      <th className="p-3 text-xs md:text-sm">{t('Total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSales.length > 0 ? (
                      recentSales.map((sale, index) => (
                        <tr key={sale.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 animate-fade-in" style={{ animationDelay: `${0.8 + index * 0.1}s` }}>
                          <td className="p-3 text-xs md:text-sm">
                            {new Date(sale.date).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-xs md:text-sm">
                            {(sale.items || []).reduce((sum, item) => sum + (item?.quantity || 0), 0)} {t('items')}
                          </td>
                          <td className="p-3 text-xs md:text-sm">
                            {sale.customer?.name || t('Walk_In')}
                          </td>
                          <td className="p-3 text-xs md:text-sm font-medium dark:text-white">
                            {formatCurrency(sale.grandTotal || 0)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-3 text-center text-billing-secondary dark:text-gray-300">
                          {t('No_Sales_Records')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>

      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <Subscription 
          open={showSubscriptionModal} 
          onClose={() => {
            // Only allow closing if trial is still active
            if (!trialExpired) {
              setShowSubscriptionModal(false);
            }
          }} 
          expired={trialExpired}
          daysRemaining={trialDaysLeft}
        />
      )}
    </>
  );
};

export default Dashboard;