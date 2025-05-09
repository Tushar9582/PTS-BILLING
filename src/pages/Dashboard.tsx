
import React from "react";
import { useBilling } from "@/contexts/BillingContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Package, 
  ShoppingCart, 
  FileText, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Coffee, 
  Store, 
  ShoppingBag, 
  Utensils 
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import Layout from "@/components/Layout";
import StockAlerts from "@/components/StockAlerts";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const { products, sales, categories, businessConfig } = useBilling();
  const isMobile = useIsMobile();
  const { buttonStyle } = useTheme();

  // Calculate dashboard statistics
  const totalSales = sales.length;
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.grandTotal, 0);
  const totalProducts = products.length;
  
  // Get today's date in ISO format, but just the date part
  const today = new Date().toISOString().split("T")[0];
  
  // Filter for today's sales
  const todaySales = sales.filter((sale) => sale.date.startsWith(today));
  const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.grandTotal, 0);

  // Calculate revenue trend
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  const yesterdaySales = sales.filter((sale) => sale.date.startsWith(yesterdayStr));
  const yesterdayRevenue = yesterdaySales.reduce((sum, sale) => sum + sale.grandTotal, 0);
  const revenueTrend = yesterdayRevenue !== 0 ? 
    ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 
    todayRevenue > 0 ? 100 : 0;

  // Get recent sales (last 7)
  const recentSales = sales.slice(0, 7);

  // Prepare chart data for last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split("T")[0];
  }).reverse();

  const salesByDay = last7Days.map(date => {
    const daySales = sales.filter(sale => sale.date.startsWith(date));
    const dayRevenue = daySales.reduce((sum, sale) => sum + sale.grandTotal, 0);
    
    return {
      date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      revenue: dayRevenue
    };
  });

  // Best selling products
  const productSales = sales.flatMap(sale => sale.items);
  const productSaleCount: Record<string, number> = {};
  productSales.forEach(item => {
    if (productSaleCount[item.id]) {
      productSaleCount[item.id] += item.quantity;
    } else {
      productSaleCount[item.id] = item.quantity;
    }
  });

  const bestSellingProducts = Object.entries(productSaleCount)
    .map(([id, count]) => {
      const product = products.find(p => p.id === id);
      return {
        id,
        name: product?.name || 'Unknown Product',
        count
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  // Category distribution for pie chart
  const categorySales: Record<string, number> = {};
  productSales.forEach(item => {
    const product = products.find(p => p.id === item.id);
    if (product) {
      if (categorySales[product.category]) {
        categorySales[product.category] += item.quantity;
      } else {
        categorySales[product.category] = item.quantity;
      }
    }
  });
  
  const categoryData = Object.entries(categorySales).map(([id, count]) => {
    const category = categories.find(c => c.id === id);
    return {
      name: category?.name || 'Uncategorized',
      value: count
    };
  }).sort((a, b) => b.value - a.value);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  // Business type specific animations
  const getBusinessAnimation = () => {
    if (!businessConfig?.type) return null;
    
    switch(businessConfig.type) {
      case "cafe":
        return (
          <div className="absolute -top-2 -right-2 opacity-10 pointer-events-none">
            <Coffee size={80} className="text-amber-500 animate-pulse" />
          </div>
        );
      case "grocery":
        return (
          <div className="absolute -top-2 -right-2 opacity-10 pointer-events-none">
            <Store size={80} className="text-green-500 animate-pulse" />
          </div>
        );
      case "retail":
        return (
          <div className="absolute -top-2 -right-2 opacity-10 pointer-events-none">
            <ShoppingBag size={80} className="text-indigo-500 animate-pulse" />
          </div>
        );
      case "restaurant":
        return (
          <div className="absolute -top-2 -right-2 opacity-10 pointer-events-none">
            <Utensils size={80} className="text-red-500 animate-pulse" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-billing-dark dark:text-white">Dashboard</h1>
        {businessConfig?.name && (
          <div className="text-base md:text-lg text-billing-secondary dark:text-gray-300 animate-fade-in">
            Welcome back to {businessConfig.name}!
          </div>
        )}
      </div>
      
      {/* Stock Alerts */}
      <StockAlerts />
      
      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
        <Card className="bg-white dark:bg-gray-800 dark:text-white relative overflow-hidden animate-fade-in">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-billing-secondary dark:text-gray-300">
              Today's Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-xl md:text-2xl font-bold dark:text-white">{formatCurrency(todayRevenue)}</div>
              <div className="flex items-center gap-1 text-xs">
                {revenueTrend > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : revenueTrend < 0 ? (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                ) : (
                  <span className="h-4 w-4" />
                )}
                <span className={revenueTrend > 0 ? "text-green-500" : "text-red-500"}>
                  {revenueTrend !== 0 ? `${Math.abs(revenueTrend).toFixed(1)}%` : ""}
                </span>
              </div>
            </div>
            {getBusinessAnimation()}
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-gray-800 dark:text-white relative overflow-hidden animate-fade-in" style={{animationDelay: "0.1s"}}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-billing-secondary dark:text-gray-300">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-xl md:text-2xl font-bold dark:text-white">{formatCurrency(totalRevenue)}</div>
              <ShoppingCart className="h-5 w-5 text-billing-primary" />
            </div>
            {getBusinessAnimation()}
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-gray-800 dark:text-white relative overflow-hidden animate-fade-in" style={{animationDelay: "0.2s"}}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-billing-secondary dark:text-gray-300">
              Total Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-xl md:text-2xl font-bold dark:text-white">{totalSales}</div>
              <FileText className="h-5 w-5 text-billing-success" />
            </div>
            {getBusinessAnimation()}
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-gray-800 dark:text-white relative overflow-hidden animate-fade-in" style={{animationDelay: "0.3s"}}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-billing-secondary dark:text-gray-300">
              Total Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-xl md:text-2xl font-bold dark:text-white">{totalProducts}</div>
              <Package className="h-5 w-5 text-billing-secondary" />
            </div>
            {getBusinessAnimation()}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <Card className={`col-span-1 ${!isMobile ? 'lg:col-span-2' : ''} bg-white dark:bg-gray-800 dark:text-white animate-fade-in`} style={{animationDelay: "0.4s"}}>
          <CardHeader>
            <CardTitle>Revenue (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent className="h-60 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByDay}>
                <XAxis dataKey="date" stroke="currentColor" />
                <YAxis stroke="currentColor" />
                <Tooltip 
                  formatter={(value) => [`${formatCurrency(value as number)}`, "Revenue"]}
                  contentStyle={{ backgroundColor: "var(--background)", borderRadius: "4px", border: "1px solid var(--border)", color: "var(--foreground)" }}
                  cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Revenue Breakdown */}
        <Card className="bg-white dark:bg-gray-800 dark:text-white animate-fade-in" style={{animationDelay: "0.5s"}}>
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent className={`${isMobile ? 'h-60' : 'h-80'} space-y-4`}>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2 dark:text-gray-300">Payment Methods</h3>
                <div className="space-y-2">
                  {['cash', 'card', 'upi'].map(method => {
                    const methodSales = sales.filter(sale => sale.paymentMethod === method);
                    const methodRevenue = methodSales.reduce((sum, sale) => sum + sale.grandTotal, 0);
                    const percentage = totalRevenue > 0 ? (methodRevenue / totalRevenue) * 100 : 0;
                    return (
                      <div key={method} className="flex items-center">
                        <div className="w-24 text-sm capitalize">{method}</div>
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
              
              <div>
                <h3 className="text-sm font-medium mb-2 dark:text-gray-300">Daily Average</h3>
                <div className="text-3xl font-bold dark:text-white">
                  {formatCurrency(totalSales > 0 ? totalRevenue / totalSales : 0)}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Average sale amount</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2 dark:text-gray-300">Tax Collected</h3>
                <div className="text-2xl font-bold dark:text-white">
                  {formatCurrency(sales.reduce((sum, sale) => sum + sale.tax, 0))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Best Selling Products */}
        <Card className="bg-white dark:bg-gray-800 dark:text-white animate-fade-in" style={{animationDelay: "0.6s"}}>
          <CardHeader>
            <CardTitle>Best Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bestSellingProducts.length > 0 ? (
                bestSellingProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between border-b dark:border-gray-700 pb-2 last:border-0 animate-fade-in" style={{animationDelay: `${0.7 + index * 0.1}s`}}>
                    <div className="flex items-center gap-3">
                      <div className="bg-billing-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                      <span className="font-medium truncate max-w-[150px] dark:text-white">{product.name}</span>
                    </div>
                    <span className="text-billing-secondary dark:text-gray-300">{product.count} sold</span>
                  </div>
                ))
              ) : (
                <p className="text-billing-secondary dark:text-gray-300">No sales data yet</p>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Recent Sales */}
        <Card className="bg-white dark:bg-gray-800 dark:text-white animate-fade-in" style={{animationDelay: "0.7s"}}>
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                    <th className="p-3 text-xs md:text-sm">Date</th>
                    <th className="p-3 text-xs md:text-sm">Items</th>
                    <th className="p-3 text-xs md:text-sm">Customer</th>
                    <th className="p-3 text-xs md:text-sm">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.length > 0 ? (
                    recentSales.map((sale, index) => (
                      <tr key={sale.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 animate-fade-in" style={{animationDelay: `${0.8 + index * 0.1}s`}}>
                        <td className="p-3 text-xs md:text-sm">
                          {new Date(sale.date).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-xs md:text-sm">
                          {sale.items.reduce((sum, item) => sum + item.quantity, 0)} items
                        </td>
                        <td className="p-3 text-xs md:text-sm">
                          {sale.customerInfo?.name || "Walk-in"}
                        </td>
                        <td className="p-3 text-xs md:text-sm font-medium dark:text-white">{formatCurrency(sale.grandTotal)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-3 text-center text-billing-secondary dark:text-gray-300">
                        No sales records yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Action buttons */}
      <div className="mt-6 flex gap-4 flex-wrap">
        <Button variant={buttonStyle}>Default Button</Button>
        <Button variant="neon" className="neon-button">Neon Style</Button>
        <Button variant="neumorphic" className="neumorphic-button">Neumorphic Style</Button>
      </div>
    </Layout>
  );
};

export default Dashboard;
