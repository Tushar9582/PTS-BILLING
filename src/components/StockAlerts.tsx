import React from "react";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBilling } from "@/contexts/BillingContext";
import { useIsMobile } from "@/hooks/use-mobile";

interface Product {
  id: string;
  name: string;
  stock: number;
  // other properties as needed
}

const StockAlerts: React.FC = () => {
  const { products } = useBilling();
  const isMobile = useIsMobile();
  
  // Type assertion to ensure TypeScript recognizes the stock property
  const typedProducts = products as Product[];
  
  const outOfStockProducts = typedProducts.filter(product => product.stock === 0);
  const lowStockProducts = typedProducts.filter(product => product.stock > 0 && product.stock <= 5);
  
  if (outOfStockProducts.length === 0 && lowStockProducts.length === 0) {
    return null;
  }
  
  return (
    <Card className={`bg-white ${isMobile ? 'mb-4' : ''}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <AlertTriangle size={18} className="text-billing-danger" />
          Stock Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {outOfStockProducts.length > 0 && (
          <div className="p-2 bg-red-50 border border-red-100 rounded-md">
            <h3 className="text-sm font-medium text-red-800 flex items-center gap-1.5">
              <AlertCircle size={14} />
              Out of Stock ({outOfStockProducts.length})
            </h3>
            <ul className="mt-1 pl-5 text-xs text-red-700 list-disc">
              {outOfStockProducts.slice(0, 3).map(product => (
                <li key={product.id}>{product.name}</li>
              ))}
              {outOfStockProducts.length > 3 && (
                <li>+ {outOfStockProducts.length - 3} more</li>
              )}
            </ul>
          </div>
        )}
        
        {lowStockProducts.length > 0 && (
          <div className="p-2 bg-amber-50 border border-amber-100 rounded-md">
            <h3 className="text-sm font-medium text-amber-800 flex items-center gap-1.5">
              <AlertTriangle size={14} />
              Low Stock ({lowStockProducts.length})
            </h3>
            <ul className="mt-1 pl-5 text-xs text-amber-700 list-disc">
              {lowStockProducts.slice(0, 3).map(product => (
                <li key={product.id}>{product.name} ({product.stock} left)</li>
              ))}
              {lowStockProducts.length > 3 && (
                <li>+ {lowStockProducts.length - 3} more</li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StockAlerts;
