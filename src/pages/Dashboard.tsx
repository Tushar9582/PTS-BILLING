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
import { get, onValue, ref } from "firebase/database";
import { database } from '../firebase/firebaseConfig';
import { toast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { auth } from "../firebase/firebaseConfig";
import { useTranslation } from "react-i18next";
import CryptoJS from "crypto-js";

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
  const [timePeriod, setTimePeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('weekly');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [bestSellingProducts, setBestSellingProducts] = useState<BestSellingProduct[]>([]);

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
      paymentMethod: decryptField(sale.paymentMethod || 'cash')
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
      case 'daily': startDate.setDate(now.getDate() - 1); break;
      case 'weekly': startDate.setDate(now.getDate() - 7); break;
      case 'monthly': startDate.setMonth(now.getMonth() - 1); break;
      case 'yearly': startDate.setFullYear(now.getFullYear() - 1); break;
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
      name: category?.name || t('uncategorized'),
      value: count
    };
  }).sort((a, b) => b.value - a.value), [categorySales, decryptedCategories, t]);

  // Business type specific animations
  const getBusinessAnimation = useCallback(() => {
    if (!decryptedBusinessConfig?.type) return null;

    switch (decryptedBusinessConfig.type) {
      case "cafe": return <Coffee size={80} className="absolute -top-2 -right-2 opacity-10 text-amber-500 animate-pulse pointer-events-none" />;
      case "grocery": return <Store size={80} className="absolute -top-2 -right-2 opacity-10 text-green-500 animate-pulse pointer-events-none" />;
      case "retail": return <ShoppingBag size={80} className="absolute -top-2 -right-2 opacity-10 text-indigo-500 animate-pulse pointer-events-none" />;
      case "restaurant": return <Utensils size={80} className="absolute -top-2 -right-2 opacity-10 text-red-500 animate-pulse pointer-events-none" />;
      default: return null;
    }
  }, [decryptedBusinessConfig]);

  const handleLogout = useCallback(() => {
    auth.signOut().then(() => {
      navigate("/login");
    });
  }, [navigate]);

  // Continuous status checking
  // useEffect(() => {
  //   const user = auth.currentUser;
  //   if (!user) return;

  //   const userRef = ref(database, `users/${user.uid}/businessConfig/active`);
  //   const unsubscribe = onValue(userRef, (snapshot) => {
  //     const isActive = snapshot.exists() ? snapshot.val() : false;

  //     if (!isActive) {
  //       auth.signOut().then(() => {
  //         navigate("/login", {
  //           state: { accountDisabled: true },
  //           replace: true
  //         });
  //         toast({
  //           title: t('account_disabled'),
  //           description: t('account_disabled_message'),
  //           variant: "destructive",
  //         });
  //       });
  //     }
  //   });

  //   return () => unsubscribe();
  // }, [navigate, t]);

  // Calculate daily average
  const uniqueSaleDates = useMemo(() => new Set(validSales.map(sale => sale.date.split('T')[0])), [validSales]);
  const dailyAverage = useMemo(() => uniqueSaleDates.size > 0 ? totalRevenue / uniqueSaleDates.size : 0, [uniqueSaleDates, totalRevenue]);

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-billing-dark dark:text-white">
          {t('dashboard')}
        </h1>

        {decryptedBusinessConfig?.name && (
          <div className="text-base md:text-lg text-billing-secondary dark:text-gray-300 animate-fade-in">
            {t('welcome_back')} {decryptedBusinessConfig.name}!
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-3 py-1 text-sm rounded shadow hover:bg-red-700 transition duration-200 ml-4"
            >
              {t('logout')}
            </button>
          </div>
        )}
      </div>

      <StockAlerts />

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
        <Card className="bg-white dark:bg-gray-800 dark:text-white relative overflow-hidden animate-fade-in">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-billing-secondary dark:text-gray-300">
              {t('todays_revenue')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-xl md:text-2xl font-bold dark:text-white">
                {formatCurrency(todayRevenue)}
              </div>
              <div className="flex items-center gap-1 text-xs">
                {revenueTrend > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : revenueTrend < 0 ? (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                ) : (
                  <span className="h-4 w-4" />
                )}
                <span className={revenueTrend > 0 ? "text-green-500" : revenueTrend < 0 ? "text-red-500" : ""}>
                  {revenueTrend !== 0 ? `${Math.abs(revenueTrend).toFixed(1)}%` : ""}
                </span>
              </div>
            </div>
            {getBusinessAnimation()}
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 dark:text-white relative overflow-hidden animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-billing-secondary dark:text-gray-300">
              {t('total_revenue')}
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
              {t('total_sales')}
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
              {t('total_products')}
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
            <CardTitle>{t('revenue_last_7_days')}</CardTitle>
          </CardHeader>
          <CardContent className="h-60 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByDay}>
                <XAxis dataKey="date" stroke="currentColor" />
                <YAxis stroke="currentColor" />
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
            <CardTitle>{t('revenue_breakdown')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2 dark:text-gray-300">{t('payment_methods')}</h3>
                <div className="space-y-2">
                  {['cash', 'card', 'upi'].map(method => {
                    const methodSales = validSales.filter(sale => sale.paymentMethod === method);
                    const methodRevenue = methodSales.reduce((sum, sale) => sum + (sale.grandTotal || 0), 0);
                    const percentage = totalRevenue > 0 ? (methodRevenue / totalRevenue) * 100 : 0;
                    return (
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
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg">
                  <h3 className="text-sm font-medium mb-1 dark:text-gray-300">{t('daily_average')}</h3>
                  <div className="text-xl md:text-2xl font-bold dark:text-white">
                    {formatCurrency(dailyAverage)}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('per_sale_day')}</p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg">
                  <h3 className="text-sm font-medium mb-1 dark:text-gray-300">{t('tax_collected')}</h3>
                  <div className="text-xl md:text-2xl font-bold dark:text-white">
                    {formatCurrency(validSales.reduce((sum, sale) => sum + (sale.tax || 0), 0))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('total_tax')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Best Selling Products */}
        <Card className="bg-white dark:bg-gray-800 dark:text-white animate-fade-in" style={{ animationDelay: "0.6s" }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('best_selling_products')}</CardTitle>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {t(timePeriod)}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTimePeriod('daily')}>
                    {t('daily')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTimePeriod('weekly')}>
                    {t('weekly')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTimePeriod('monthly')}>
                    {t('monthly')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTimePeriod('yearly')}>
                    {t('yearly')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {selectedCategory === 'all' ? t('all_categories') : 
                     decryptedCategories.find(c => c.id === selectedCategory)?.name || t('select_category')}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSelectedCategory('all')}>
                    {t('all_categories')}
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
                          {decryptedCategories.find(c => c.id === product.category)?.name || t('uncategorized')}
                        </span>
                      </div>
                    </div>
                    <span className="text-billing-secondary dark:text-gray-300">
                      {product.count} {t('sold')}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-billing-secondary dark:text-gray-300">
                  {t('no_sales_data')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card className="bg-white dark:bg-gray-800 dark:text-white animate-fade-in" style={{ animationDelay: "0.7s" }}>
          <CardHeader>
            <CardTitle>{t('recent_sales')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                    <th className="p-3 text-xs md:text-sm">{t('date')}</th>
                    <th className="p-3 text-xs md:text-sm">{t('items')}</th>
                    <th className="p-3 text-xs md:text-sm">{t('customer')}</th>
                    <th className="p-3 text-xs md:text-sm">{t('total')}</th>
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
                          {sale.customer?.name || t('walk_in')}
                        </td>
                        <td className="p-3 text-xs md:text-sm font-medium dark:text-white">
                          {formatCurrency(sale.grandTotal || 0)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-3 text-center text-billing-secondary dark:text-gray-300">
                        {t('no_sales_records')}
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
  );
};

export default Dashboard;