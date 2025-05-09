
import React from "react";
import { useBilling } from "@/contexts/BillingContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, FileText, Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import Layout from "@/components/Layout";

const Dashboard = () => {
  const { products, sales, categories } = useBilling();

  // Calculate dashboard statistics
  const totalSales = sales.length;
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.grandTotal, 0);
  const totalProducts = products.length;
  
  // Get today's date in ISO format, but just the date part
  const today = new Date().toISOString().split("T")[0];
  
  // Filter for today's sales
  const todaySales = sales.filter((sale) => sale.date.startsWith(today));
  const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.grandTotal, 0);

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

  return (
    <Layout>
      <h1 className="text-3xl font-bold text-billing-dark mb-6">Dashboard</h1>
      
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-billing-secondary">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
              <ShoppingCart className="h-5 w-5 text-billing-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-billing-secondary">
              Today's Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{formatCurrency(todayRevenue)}</div>
              <Calendar className="h-5 w-5 text-billing-accent" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-billing-secondary">
              Total Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{totalSales}</div>
              <FileText className="h-5 w-5 text-billing-success" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-billing-secondary">
              Total Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{totalProducts}</div>
              <Package className="h-5 w-5 text-billing-secondary" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <Card className="col-span-2 bg-white">
          <CardHeader>
            <CardTitle>Revenue (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByDay}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`${formatCurrency(value as number)}`, "Revenue"]}
                />
                <Bar dataKey="revenue" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Best Selling Products */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Best Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bestSellingProducts.length > 0 ? (
                bestSellingProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <span className="font-medium truncate max-w-[150px]">{product.name}</span>
                    <span className="text-billing-secondary">{product.count} sold</span>
                  </div>
                ))
              ) : (
                <p className="text-billing-secondary">No sales data yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Sales */}
      <Card className="mt-6 bg-white">
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-200">
                  <th className="p-3">Date</th>
                  <th className="p-3">Sale ID</th>
                  <th className="p-3">Items</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Payment</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.length > 0 ? (
                  recentSales.map((sale) => (
                    <tr key={sale.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-3">
                        {new Date(sale.date).toLocaleDateString()}
                      </td>
                      <td className="p-3">{sale.id}</td>
                      <td className="p-3">
                        {sale.items.reduce((sum, item) => sum + item.quantity, 0)} items
                      </td>
                      <td className="p-3 font-medium">{formatCurrency(sale.grandTotal)}</td>
                      <td className="p-3">{sale.paymentMethod}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-3 text-center text-billing-secondary">
                      No sales records yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default Dashboard;
