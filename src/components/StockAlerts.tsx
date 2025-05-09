
import React, { useState } from "react";
import { AlertCircle, AlertTriangle, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBilling } from "@/contexts/BillingContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

export interface Product {
  id: string;
  name: string;
  stock: number;
  // other properties as needed
}

const StockAlerts: React.FC = () => {
  const { products } = useBilling();
  const isMobile = useIsMobile();
  const [showDialog, setShowDialog] = useState(false);
  const [dialogContent, setDialogContent] = useState<{
    title: string;
    products: Product[];
    variant: "danger" | "warning";
  }>({
    title: "",
    products: [],
    variant: "warning"
  });
  
  // Type assertion to ensure TypeScript recognizes the stock property
  const typedProducts = products as Product[];
  
  const outOfStockProducts = typedProducts.filter(product => product.stock === 0);
  const lowStockProducts = typedProducts.filter(product => product.stock > 0 && product.stock <= 5);
  
  if (outOfStockProducts.length === 0 && lowStockProducts.length === 0) {
    return null;
  }
  
  const handleViewAll = (type: "out" | "low") => {
    if (type === "out") {
      setDialogContent({
        title: "Out of Stock Products",
        products: outOfStockProducts,
        variant: "danger"
      });
    } else {
      setDialogContent({
        title: "Low Stock Products",
        products: lowStockProducts,
        variant: "warning"
      });
    }
    setShowDialog(true);
  };
  
  return (
    <>
      <Card className={`bg-white ${isMobile ? 'mb-4' : ''} animate-fade-in`}>
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
                  <li className="cursor-pointer hover:underline" onClick={() => handleViewAll("out")}>
                    + {outOfStockProducts.length - 3} more
                  </li>
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
                  <li className="cursor-pointer hover:underline" onClick={() => handleViewAll("low")}>
                    + {lowStockProducts.length - 3} more
                  </li>
                )}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className={
              dialogContent.variant === "danger" ? "text-red-600" : "text-amber-600"
            }>
              {dialogContent.title}
            </DialogTitle>
            <DialogDescription>
              These items require your attention
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[300px] overflow-y-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-2">Product Name</th>
                  <th className="p-2 text-right">Stock</th>
                </tr>
              </thead>
              <tbody>
                {dialogContent.products.map(product => (
                  <tr key={product.id} className="border-b">
                    <td className="p-2">{product.name}</td>
                    <td className="p-2 text-right">
                      <span className={
                        product.stock === 0 
                          ? "text-red-600 font-medium"
                          : "text-amber-600 font-medium"
                      }>
                        {product.stock === 0 ? "Out of stock" : `${product.stock} left`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => {
                toast.success("Stock report generated");
                setShowDialog(false);
              }}
              className="mt-2"
            >
              Export Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StockAlerts;
